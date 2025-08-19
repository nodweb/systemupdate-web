#!/usr/bin/env python3
"""
Promote generated code into client scaffolds.
- Moves/copies from systemupdate-web/generated/{ts,python}
- Into libs/client-ts/src (TS) and libs/client-py/systemupdate_client (Python)

Usage (from systemupdate-web/):
  python scripts/codegen/promote_generated_to_libs.py --mode copy

Options:
  --mode copy|move  (default: copy)

Notes:
- Creates target folders if missing.
- Skips if generated directories do not exist.
"""

from __future__ import annotations

import argparse
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2] / "systemupdate-web"
GEN_TS = ROOT / "generated" / "ts"
GEN_PY = ROOT / "generated" / "python"
TS_TARGET = ROOT / "libs" / "client-ts" / "src"
PY_TARGET = ROOT / "libs" / "client-py" / "systemupdate_client"


def sync_tree(src: Path, dst: Path, mode: str = "copy") -> None:
    if not src.exists():
        print(f"[skip] source missing: {src}")
        return
    dst.mkdir(parents=True, exist_ok=True)
    for item in src.rglob("*"):
        rel = item.relative_to(src)
        target = dst / rel
        if item.is_dir():
            target.mkdir(parents=True, exist_ok=True)
        else:
            target.parent.mkdir(parents=True, exist_ok=True)
            if mode == "move":
                shutil.move(str(item), str(target))
            else:
                shutil.copy2(str(item), str(target))
            print(f"[{mode}] {item} -> {target}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--mode", choices=["copy", "move"], default="copy")
    args = ap.parse_args()

    print(f"Promoting generated code (mode={args.mode})")
    sync_tree(GEN_TS, TS_TARGET, args.mode)
    sync_tree(GEN_PY, PY_TARGET, args.mode)
    print("Done.")


if __name__ == "__main__":
    main()
