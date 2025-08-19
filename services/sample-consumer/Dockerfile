# Sample Consumer Dockerfile
# Build context must be the repo root so we can copy schemas.
FROM python:3.11-slim
ENV PYTHONUNBUFFERED=1
WORKDIR /app

# Install requirements first for better caching
COPY services/sample-consumer/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy service code and schemas
COPY services/sample-consumer /app
COPY libs/proto-schemas /app/libs/proto-schemas

EXPOSE 9000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD python - <<'PY' || exit 1
import urllib.request
try:
    with urllib.request.urlopen('http://127.0.0.1:9000/metrics', timeout=3) as r:
        ok = (r.status == 200)
        raise SystemExit(0 if ok else 1)
except Exception:
    raise SystemExit(1)
PY
CMD ["python", "app/main.py"]
