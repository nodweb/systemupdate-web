# SystemUpdate Monitoring Guide

This document provides an overview of the monitoring infrastructure for the SystemUpdate application.

## Architecture

The monitoring stack consists of the following components:

- **Prometheus**: Metrics collection and alerting
- **Grafana**: Visualization and dashboards
- **Alertmanager**: Alert routing and notification
- **Blackbox Exporter**: HTTP/HTTPS endpoint monitoring
- **Node Exporter**: Hardware and OS metrics
- **cAdvisor**: Container metrics

## Accessing the Dashboards

### Grafana

URL: http://localhost:3000
- Username: admin
- Password: admin

### Prometheus

URL: http://localhost:9090

### Alertmanager

URL: http://localhost:9093

## Key Dashboards

### 1. SystemUpdate Services Dashboard
- **Purpose**: Monitor the health and performance of all services
- **Access**: Grafana → Dashboards → SystemUpdate Services
- **Key Metrics**:
  - Service health status
  - HTTP request rates and latencies
  - Error rates
  - Resource usage (CPU, memory, disk)
  - Database connections
  - Kafka consumer lag

### 2. Node Exporter Dashboard
- **Purpose**: Monitor host-level metrics
- **Access**: Grafana → Dashboards → Node Exporter Full
- **Key Metrics**:
  - CPU usage
  - Memory usage
  - Disk I/O
  - Network traffic
  - System load

## Alerting

Alerts are configured in `observability/alerts.rules.yml` and managed by Prometheus and Alertmanager.

### Alert Severity Levels

- **critical**: Immediate attention required (e.g., service down)
- **warning**: Attention needed soon (e.g., high resource usage)

### Alert Notifications

Alerts are sent to the following channels:
- Email (configured via environment variables)
- Slack (if configured)

## Adding a New Service to Monitoring

1. **Add Service Discovery**
   - Add the service to `prometheus.yml` under the appropriate job
   - Ensure the service exposes metrics on `/metrics`

2. **Add Health Checks**
   - Implement `/healthz` endpoint
   - Add to blackbox monitoring in `prometheus.yml`

3. **Create Dashboards**
   - Add service-specific panels to the main dashboard
   - Create a dedicated dashboard if needed

## Troubleshooting

### Common Issues

1. **No Data in Grafana**
   - Check if Prometheus is scraping the targets
   - Verify the service is exposing metrics correctly
   - Check network connectivity between services

2. **Alerts Not Firing**
   - Check Alertmanager logs
   - Verify alert rules in Prometheus
   - Check notification receiver configuration

3. **High Resource Usage**
   - Check for memory leaks
   - Review query performance in Grafana
   - Adjust scrape intervals if needed

## Best Practices

1. **Metrics Naming**
   - Use consistent naming conventions
   - Include units in metric names
   - Use labels for dimensions

2. **Alerting**
   - Set appropriate `for` durations
   - Use meaningful alert messages
   - Include relevant labels for routing

3. **Dashboard Design**
   - Group related metrics
   - Use appropriate visualizations
   - Set meaningful thresholds

## Related Documentation

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [Alertmanager Configuration](https://prometheus.io/docs/alerting/latest/configuration/)
