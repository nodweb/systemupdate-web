SHELL := /bin/bash

.PHONY: help up down logs up-prod down-prod test fmt lint sbom scan

help:
	@echo "Common targets:"
	@echo "  make up         - start dev stack (compose)"
	@echo "  make down       - stop dev stack"
	@echo "  make logs       - tail dev logs"
	@echo "  make up-prod    - start prod-like stack (traefik + TLS via HTTP-01 if configured)"
	@echo "  make down-prod  - stop prod-like stack"
	@echo "  make sbom       - generate SBOM (requires syft)"
	@echo "  make scan       - vulnerability scan (requires trivy)"
	@echo "  make codegen    - generate shared clients/types (python + ts)"
	@echo "  make test-all   - run unit + contract tests for all services"
	@echo "  make test-contract - run contract tests only"

up:
	docker compose --env-file .env -f docker-compose.yml up -d
	docker compose ps
	docker compose logs -f --tail=100

down:
	docker compose -f docker-compose.yml down -v

logs:
	docker compose -f docker-compose.yml logs -f --tail=200

up-prod:
	docker compose --env-file .env -f docker-compose.yml -f docker-compose.prod.yml up -d
	docker compose ps
	docker compose logs -f --tail=100

down-prod:
	docker compose -f docker-compose.yml -f docker-compose.prod.yml down -v

sbom:
	syft packages . -o spdx-json > sbom.spdx.json || true

scan:
	trivy fs --ignore-unfixed . || true

test:
	# Requires Python + dependencies installed locally in each service
	pytest -q services/auth-service || true
	pytest -q services/ws-hub || true
	pytest -q services/device-service || true

# Aggregate tests (unit + contract)
test-all:
	pytest -q services/auth-service -k "not e2e" || true
	pytest -q services/device-service -k "not e2e" || true
	pytest -q services/ws-hub -k "not e2e" || true

# Contract tests only (Schemathesis-based suites are marked with "contract")
test-contract:
	pytest -q services/auth-service -k contract || true
	pytest -q services/device-service -k contract || true
	pytest -q services/ws-hub -k contract || true

# Code generation (Python clients from OpenAPI)
codegen: codegen-python codegen-ts

codegen-python:
	python libs/shared-python/codegen.py

codegen-ts:
	cd libs/shared-ts && npm install && npx openapi-typescript ../../libs/proto-schemas/openapi/auth.yaml -o ./types/auth.d.ts && npx openapi-typescript ../../libs/proto-schemas/openapi/device.yaml -o ./types/device.d.ts
