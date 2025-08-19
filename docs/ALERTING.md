# Alerting Guide (Local Dev)

This guide explains how to enable real alert delivery in local/dev for SystemUpdate-Web.

## Components
- Prometheus rules: `observability/alerts.rules.yml`
- Prometheus config: `observability/prometheus.yml` (points to Alertmanager)
- Alertmanager: `observability/alertmanager.yml`

## Current State
- Alerts fire into Alertmanager at http://localhost:9093
- Default routing sends webhooks to local `notification-service` at `http://notification-service:8007/alerts`

## Grafana Alerting Provisioning (Contact Points & Policies)
We auto-provision Grafana alerting to avoid manual setup:

- Contact points: `observability/grafana/provisioning/alerting/contact-points.yaml`
- Notification policies: `observability/grafana/provisioning/alerting/notification-policies.yaml`

By default we use a dev-null webhook. To enable Slack, add `GRAFANA_SLACK_WEBHOOK_URL` env and uncomment the Slack contact point in the file, then restart Grafana.

Restart Grafana after changes:
```bash
docker compose up -d grafana
```

## Blackbox Uptime Alerts
We added synthetic HTTP probes and alerts using Prometheus Blackbox Exporter.

- Blackbox job: `observability/prometheus.yml` → job `blackbox-http`
- Uptime dashboard: `observability/grafana/dashboards/Uptime-Overview.json`
- Alerts in `observability/alerts.rules.yml`:
  - `EndpointDownWarning` (probe failure 1m)
  - `EndpointDownCritical` (probe failure 5m)
  - `EndpointHighLatency` (avg probe >1s over 5m)

Apply changes:
```bash
docker compose up -d blackbox-exporter prometheus grafana
```

## Local Notification Service (Webhook Receiver)
We provisioned a lightweight service to receive Alertmanager webhooks:

- Service path: `services/notification-service/`
- Health: `http://localhost:8007/health`
- Webhook endpoint: `http://localhost:8007/alerts`
- Logs show received alerts; view with:
```bash
docker logs -f su-notification
```

## Slack Notifications (Grafana Alerting)
We provision a Slack contact point in Grafana. To enable it:

1) Obtain an Incoming Webhook URL from Slack.
2) Export it for compose (Windows PowerShell):
```powershell
$env:GRAFANA_SLACK_WEBHOOK_URL = "https://hooks.slack.com/services/XXX/YYY/ZZZ"
```
3) Restart Grafana to apply provisioning:
```powershell
docker compose up -d grafana
```
Alerts with labels `severity=critical|warning` will be routed to Slack (see `observability/grafana/provisioning/alerting/notification-policies.yaml`).

## Recording Rules for SLO Metrics
We added recording rules to precompute SLO metrics:

- File: `observability/recording.rules.yml`
- Loaded via `rule_files` in `observability/prometheus.yml`

Restart Prometheus after edits:
```bash
docker compose up -d prometheus
```

## SLO Alerts
- Service-level:
  - HighErrorRate (>5% over 5m)
  - ServiceFastBurnRate (5m > 14x budget @ 99.5% SLO)
  - ServiceSlowBurnRate (1h > 6x budget @ 99.5% SLO)
- Route-level (excluding /health and /metrics):
  - RouteLowAvailability/RouteVeryLowAvailability
  - RouteHighLatencyP95 (>500ms over 5m)
  - RouteFastBurnRate (5m > 14x budget)
  - RouteSlowBurnRate (1h > 6x budget)

Dashboard: `observability/grafana/dashboards/SLO-Overview.json` includes Error Budget & Burn Rate panels and thresholds for availability/latency.

## Frontend Observability (Optional)
Browser traces can be sent to the Collector over OTLP/HTTP.

- Collector CORS for OTLP/HTTP is enabled in `observability/otel-collector-config.yaml` for `http://localhost:5173`.
- In `frontend/index.html`, there is a commented ESM snippet to enable OpenTelemetry Web. To enable:
  1) Remove the surrounding HTML comments around the script.
  2) Ensure Collector is listening on `http://localhost:4318`.
  3) Reload the app; traces will appear in Tempo and spanmetrics in Prometheus.

Restart Collector after CORS config changes:
```bash
docker compose up -d otel-collector
```

## Enable Slack Notifications
1. Create a Slack incoming webhook URL.
2. Add a receiver to `observability/alertmanager.yml`:
```yaml
receivers:
  - name: slack
    slack_configs:
      - api_url: "https://hooks.slack.com/services/XXX/YYY/ZZZ"
        channel: "#alerts"
route:
  receiver: slack
```
3. Restart Alertmanager:
```bash
docker compose up -d alertmanager
```

## Enable Webhook Receiver
Use a local endpoint (e.g., http://host.docker.internal:5001/alerts):
```yaml
receivers:
  - name: webhooks
    webhook_configs:
      - url: 'http://host.docker.internal:5001/alerts'
route:
  receiver: webhooks
```

## Enable Email (Example)
```yaml
receivers:
  - name: email
    email_configs:
      - to: 'ops@example.com'
        from: 'alertmanager@example.com'
        smarthost: 'smtp.example.com:587'
        auth_username: 'alertuser'
        auth_password: 'changeme'
route:
  receiver: email
```

## Testing Alerts
- Trigger errors using the load generator with error injection:
```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/windows/generate-trace-load.ps1 -Profile burst -ErrorRate 0.2 -Qps 20 -DurationSeconds 120
```
- Check Prometheus rules: http://localhost:9090/rules and http://localhost:9090/alerts
- Check Alertmanager: http://localhost:9093

## SLO Burn-rate Alerts
- Configured for 95% availability (5% error budget):
  - Fast burn: 5m and 1h both > 14.4x budget → critical
  - Slow burn: 30m and 6h both > 6x budget → warning

## Security Notes (Prod)
- Do not commit secrets. Use env vars or external secret stores.
- Secure Alertmanager with auth/TLS and network policies.
- Configure proper routing, grouping, and inhibition for noise reduction.
