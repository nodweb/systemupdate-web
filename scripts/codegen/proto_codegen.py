#!/usr/bin/env python3
"""
Local Protobuf code generation for TS (ts-proto) and Python (protoc).

Prereqs:
- protoc installed and on PATH (or run via Docker if desired)
- Node.js + ts-proto installed: `npm i -g ts-proto`

Usage (from systemupdate-web/):
  python scripts/codegen/proto_codegen.py
Outputs:
  - generated/ts
  - generated/python
"""

import shutil
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
WEB_ROOT = REPO_ROOT / "systemupdate-web"
PROTO_DIR = WEB_ROOT / "libs" / "proto-schemas" / "proto"
OUT_TS = WEB_ROOT / "generated" / "ts"
OUT_PY = WEB_ROOT / "generated" / "python"


def which(cmd: str) -> bool:
    return shutil.which(cmd) is not None


def run(cmd, cwd=None):
    print("$", " ".join(cmd))
    subprocess.check_call(cmd, cwd=cwd)


def main():
    if not PROTO_DIR.exists():
        print(f"No proto directory found at {PROTO_DIR}")
        return 0

    OUT_TS.mkdir(parents=True, exist_ok=True)
    OUT_PY.mkdir(parents=True, exist_ok=True)

    # Generate Python stubs
    if not which("protoc"):
        print("WARNING: protoc not found on PATH. Skipping Python codegen.")
    else:
        for proto in PROTO_DIR.rglob("*.proto"):
            run(
                [
                    "protoc",
                    f"--proto_path={PROTO_DIR}",
                    f"--python_out={OUT_PY}",
                    str(proto),
                ],
                cwd=str(WEB_ROOT),
            )

    # Generate TypeScript via ts-proto
    if not which("protoc") or not which("protoc-gen-ts_proto"):
        print("WARNING: protoc and/or ts-proto plugin not found. Skipping TS codegen.")
    else:
        for proto in PROTO_DIR.rglob("*.proto"):
            run(
                [
                    "protoc",
                    f"--proto_path={PROTO_DIR}",
                    f"--ts_proto_out={OUT_TS}",
                    str(proto),
                ],
                cwd=str(WEB_ROOT),
            )

    print("Done. Outputs in:")
    print(" -", OUT_TS)
    print(" -", OUT_PY)
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except subprocess.CalledProcessError as e:
        print(f"Command failed: {e}")
        sys.exit(e.returncode)
