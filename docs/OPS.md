# Operations Guide

<!-- markdownlint-disable MD013 -->

This document describes how to operate the sample consumer and monitoring stack across dev/staging/prod, including PR workflow, alerting, and Helm/k8s notes.

## PR and CI workflow

- Create a feature branch and open a PR.
- CI workflows:
  - Lint: `.github/workflows/sample-consumer-ci.yml`
  - Integration (self-hosted): `.github/workflows/sample-consumer-integration.yml`
    - Matrix runs with `IDEMP_STORE=[memory, redis, postgres]`
    - Asserts duplicates counter and latency histogram presence
  - Publish (GHCR): `.github/workflows/sample-consumer-publish.yml`
    - Builds and pushes `ghcr.io/<org-or-user>/sample-consumer` with tags `sha-<sha>`, `<branch>`, and `latest` on default branch

## Monitoring and alerting

### Local (Docker Compose)

Start with monitoring overlay:

```powershell
cd systemupdate-web
docker compose -f docker-compose.sample-consumer.yml -f docker-compose.monitoring.yml up -d --build
```

Prometheus loads rules from `monitoring/prometheus/rules/alerts.yml` (mounted by compose).
Grafana auto-provisions datasource and dashboards from `monitoring/grafana/provisioning/...`.

### Alerts

- Rules: `monitoring/prometheus/rules/alerts.yml` includes:
  - `SampleConsumerDown` (metrics absent)
  - `SampleConsumerHighErrorRate`
  - `SampleConsumerDuplicateSpike`
  - `SampleConsumerHighLatencyP95`

To deliver alerts, deploy Alertmanager and configure receivers (email/Slack/PagerDuty):

Example compose extension (pseudo):

```yaml
alertmanager:
  image: prom/alertmanager:v0.27.0
  volumes:
    - ./monitoring/alertmanager/alertmanager.yml:/etc/alertmanager/alertmanager.yml:ro
  ports:
    - "9093:9093"
```

Add to Prometheus config:

```yaml
alerting:
  alertmanagers:
    - static_configs:
        - targets: ["alertmanager:9093"]
```

### Kubernetes (Helm)

- Recommended: install kube-prometheus-stack (Prometheus, Alertmanager, Grafana) via Helm.

```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update
helm upgrade --install monitoring prometheus-community/kube-prometheus-stack -n monitoring --create-namespace \
  --set grafana.adminPassword=admin \
  --set grafana.defaultDashboardsEnabled=true
```

- Import our alerts and dashboard:
  - Create a ConfigMap with the `alerts.yml` content and mount as additional rule files.
  - Import Grafana dashboard JSON via Grafana UI or a DashboardProvisioning ConfigMap.

## Deploying the sample consumer to Kubernetes

- Set image in `k8s/sample-consumer/deployment.yaml` to `ghcr.io/<org-or-user>/sample-consumer:<tag>`

- Apply manifests:

```bash
kubectl apply -f k8s/sample-consumer/deployment.yaml
kubectl apply -f k8s/sample-consumer/service.yaml
```

- Probes hit `/metrics` on port 9000.

## Runbook (common issues)

- High error rate:
  - Check `consumer_errors_total` and container logs.
  - Validate schema path and event payloads.
- Duplicate spike:
  - Confirm idempotency backend health (Redis/Postgres).
  - Ensure event keys are stable and unique.
- High p95 latency:
  - Check Kafka lag, Redis/Postgres latency, CPU/memory throttling.
  - Scale replicas or tune consumer batch size.

## Security and access

- GHCR access controlled via GitHub permissions; workflows use the default `GITHUB_TOKEN`.
- Avoid storing secrets in repo; use GitHub Actions secrets and Kubernetes Secrets.
