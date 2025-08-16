# Client TS (local development)

Lightweight scaffold for using generated Protobuf TS types locally.

- Generated TS output path: `systemupdate-web/generated/ts`
- CI codegen artifact name: `proto-generated-types`

Usage locally:

```bash
# from systemupdate-web/
node --version  # ensure Node 18/20
npm i -g ts-proto
python scripts/codegen/proto_codegen.py
# use files from generated/ts
```

Notes:
- This folder is intentionally minimal. Consider moving generated outputs here or keeping them in `generated/ts` and importing relatively within the repo.
- When ready, add `package.json` and publishing metadata.
