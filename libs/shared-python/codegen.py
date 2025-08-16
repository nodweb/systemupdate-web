#!/usr/bin/env python3
"""
Generate Python API clients from OpenAPI specs under libs/proto-schemas/openapi/.
Requires: pip install -r libs/shared-python/requirements.txt
Output: libs/shared-python/clients/<service-name>/
"""
from __future__ import annotations
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OPENAPI_DIR = ROOT / "libs" / "proto-schemas" / "openapi"
OUT_DIR = ROOT / "libs" / "shared-python" / "clients"

SPEC_MAP = {
    "auth": OPENAPI_DIR / "auth.yaml",
    "device": OPENAPI_DIR / "device.yaml",
}


def run(cmd: list[str], cwd: Path | None = None) -> int:
    print("$", " ".join(cmd))
    return subprocess.call(cmd, cwd=str(cwd) if cwd else None)


def ensure_dirs():
    OUT_DIR.mkdir(parents=True, exist_ok=True)


def generate(service: str, spec: Path) -> int:
    target_dir = OUT_DIR / service
    if target_dir.exists():
        # clean previous client (openapi-python-client expects a new output dir or overwrite)
        # Use --overwrite to avoid manual cleanup.
        pass
    cmd = [
        sys.executable,
        "-m",
        "openapi_python_client",
        "generate",
        "--path",
        str(spec),
        "--overwrite",
        "--output-path",
        str(target_dir),
    ]
    # Minimal config via stdin not required with current flags; leaving placeholder.
    return run(cmd)


def main() -> int:
    ensure_dirs()
    rc = 0
    for name, spec in SPEC_MAP.items():
        if not spec.exists():
            print(f"[warn] Spec not found: {spec}")
            continue
        print(f"[codegen] Generating Python client for {name} from {spec}")
        rc |= generate(name, spec)
    return rc


if __name__ == "__main__":
    raise SystemExit(main())
