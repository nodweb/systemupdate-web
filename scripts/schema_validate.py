"""
Local validator for schemas in libs/proto-schemas/.
- Avro: validates all .avsc files via fastavro
- JSON Schema: validates all .json files by checking schema against Draft 2020-12

Usage:
  python scripts/schema_validate.py
"""

from __future__ import annotations

import json
import sys
from pathlib import Path


def validate_avro() -> int:
    try:
        from fastavro.schema import load_schema  # type: ignore
    except Exception as e:  # pragma: no cover
        print(f"fastavro not installed: {e}")
        return 1

    avro_dir = Path("libs/proto-schemas/avro")
    paths = [str(p) for p in avro_dir.rglob("*.avsc") if p.is_file()]
    if not paths:
        print("No Avro schemas found.")
        return 0
    rc = 0
    for p in paths:
        try:
            load_schema(p)
            print(f"OK (Avro): {p}")
        except Exception as e:
            print(f"ERROR (Avro) in {p}: {e}")
            rc = 2
    return rc


def validate_json_schema() -> int:
    try:
        # jsonschema >= 4 supports Draft 2020-12
        from jsonschema import Draft202012Validator  # type: ignore
    except Exception as e:  # pragma: no cover
        print(f"jsonschema not installed: {e}")
        return 1

    json_dir = Path("libs/proto-schemas/json")
    paths = [str(p) for p in json_dir.rglob("*.json") if p.is_file()]
    if not paths:
        print("No JSON schemas found.")
        return 0

    rc = 0
    for p in paths:
        try:
            with open(p, "r", encoding="utf-8") as f:
                schema = json.load(f)
            Draft202012Validator.check_schema(schema)
            print(f"OK (JSON Schema): {p}")
        except Exception as e:
            print(f"ERROR (JSON Schema) in {p}: {e}")
            rc = 2
    return rc


def main() -> int:
    rc_avro = validate_avro()
    rc_json = validate_json_schema()
    return 1 if (rc_avro or rc_json) else 0


if __name__ == "__main__":
    sys.exit(main())
