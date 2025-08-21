#!/usr/bin/env python3
"""
Cross-service validation for SystemUpdate-Web monorepo.
Checks per-service:
- app/config.py exists
- README.md exists
- app/main.py imports settings from app.config
- app/main.py imports ServiceError and does not raise HTTPException
Outputs a summary and non-zero exit on any failures.
"""
from __future__ import annotations

import sys
import re
from pathlib import Path
from typing import List, Tuple

ROOT = Path(__file__).resolve().parents[1]
SERVICES_DIR = ROOT / "services"

SERVICE_GLOBS = [
    "*-service",
]


def find_services() -> List[Path]:
    services: List[Path] = []
    if not SERVICES_DIR.exists():
        return services
    for pattern in SERVICE_GLOBS:
        services.extend(sorted(SERVICES_DIR.glob(pattern)))
    return [s for s in services if s.is_dir()]


def validate_service(service_dir: Path) -> List[str]:
    errors: List[str] = []
    name = service_dir.name
    app_dir = service_dir / "app"
    config_py = app_dir / "config.py"
    readme_md = service_dir / "README.md"
    main_py = app_dir / "main.py"

    if not config_py.exists():
        errors.append(f"[{name}] missing app/config.py")
    if not readme_md.exists():
        errors.append(f"[{name}] missing README.md")
    if not main_py.exists():
        errors.append(f"[{name}] missing app/main.py")
        return errors

    content = main_py.read_text(encoding="utf-8", errors="ignore")

    # settings import check (either direct or used via getattr fallback)
    if not re.search(r"from\s+app\.config\s+import\s+settings", content):
        errors.append(f"[{name}] app/main.py missing 'from app.config import settings'")

    # ServiceError imported
    if not re.search(r"from\s+libs\.shared_python\.exceptions\s+import\s+ServiceError", content):
        errors.append(f"[{name}] app/main.py missing 'ServiceError' import")

    # Ensure no direct raises of HTTPException
    if re.search(r"raise\s+HTTPException\s*\(", content):
        errors.append(f"[{name}] app/main.py still raising HTTPException")

    return errors


def main() -> int:
    services = find_services()
    if not services:
        print("No services found under services/", file=sys.stderr)
        return 2

    all_errors: List[Tuple[str, List[str]]] = []
    for sdir in services:
        errs = validate_service(sdir)
        if errs:
            all_errors.append((sdir.name, errs))

    if not all_errors:
        print("Validation passed: all services have config, README, and standardized errors.")
        return 0

    print("Validation failures detected:\n")
    for name, errs in all_errors:
        print(f"- {name}")
        for e in errs:
            print(f"  * {e}")
    return 1


if __name__ == "__main__":
    sys.exit(main())
