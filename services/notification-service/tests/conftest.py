# ruff: noqa: E402
import sys
from pathlib import Path

# Ensure service-local app package is importable as `app`
SERVICE_ROOT = Path(__file__).resolve().parents[1]
if str(SERVICE_ROOT) not in sys.path:
    sys.path.insert(0, str(SERVICE_ROOT))

# Add repo root for shared libs
REPO_ROOT = SERVICE_ROOT.parent.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.append(str(REPO_ROOT))
