# Client Python (local development)

Lightweight scaffold for using generated Protobuf Python modules locally.

- Generated Python output path: `systemupdate-web/generated/python`
- CI codegen artifact name: `proto-generated-types`

Usage locally:

```powershell
# from systemupdate-web/
python --version  # 3.11/3.12
python scripts/codegen/proto_codegen.py
# import from generated/python in your services or notebooks
```

Notes:
- Keep this folder minimal; consider moving generated outputs here later or referencing from `generated/python`.
- Add packaging metadata (pyproject.toml) only when ready to publish.
