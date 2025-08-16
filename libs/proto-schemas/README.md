# Proto Schemas (Contracts)

This folder hosts event and API contracts for SystemUpdate-Web.

- Versioning: semantic versioning in file names and package namespaces.
- Tooling: use Avro and Protobuf toolchains in CI to generate language bindings.

## Layout
- `avro/` — event payloads for Kafka streams (e.g., device telemetry, commands ack)
- `proto/` — service-to-service contracts (gRPC/AsyncAPI alignment where applicable)

## Conventions
- Backward-compatible changes are preferred; add new optional fields instead of mutating/removing.
- Each change bumps minor or patch per compatibility; breaking changes bump major.

## Generation (planned)
- TS types (RTK Query/clients): `libs/shared-ts/`
- Python clients/types: `libs/shared-python/`

Add schemas and wire generators in CI as next steps.
