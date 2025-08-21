"""
Compatibility shim package for imports like `libs.shared_python`.

Bridges to the actual shared library located at `libs/shared-python/`.
This allows service code to `from libs.shared_python.health import ...` without
requiring a separate install step in local dev/test environments.
"""
from __future__ import annotations

import sys
from pathlib import Path

_pkg_dir = Path(__file__).resolve().parent
_shared_hyphen_dir = _pkg_dir.parent / "shared-python"

# Ensure the hyphenated shared libs directory is importable as top-level modules
if _shared_hyphen_dir.is_dir():
    p = str(_shared_hyphen_dir)
    if p not in sys.path:
        sys.path.insert(0, p)

# Re-export common items for convenience, matching libs/shared-python/__init__.py
try:
    from health import HealthChecker, HealthResponse, setup_health_endpoints  # type: ignore # noqa: F401
except Exception:
    # Avoid hard failure during certain tooling/import scenarios; consumers
    # may import submodules directly (e.g., libs.shared_python.health)
    pass
