"""
Shim module for `libs.shared_python.health` that forwards to the
actual implementation under `libs/shared-python/health`.
"""
from __future__ import annotations

import sys
from pathlib import Path

_pkg_dir = Path(__file__).resolve().parent
_shared_hyphen_dir = _pkg_dir.parent.parent / "shared-python"

if _shared_hyphen_dir.is_dir():
    p = str(_shared_hyphen_dir)
    if p not in sys.path:
        sys.path.insert(0, p)

# Re-export everything from the real health package
from health import *  # type: ignore  # noqa: F401,F403
