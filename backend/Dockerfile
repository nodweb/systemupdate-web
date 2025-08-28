# Backend Dockerfile
FROM python:3.11-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# System deps for psycopg2
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    curl \
  && rm -rf /var/lib/apt/lists/*

COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

# Copy source
COPY . /app

# Expose port
EXPOSE 5000

# Healthcheck (optional; Compose will use /health)
HEALTHCHECK CMD curl -f http://localhost:5000/health || exit 1

# Use eventlet for Socket.IO production
CMD ["python", "run.py"]
