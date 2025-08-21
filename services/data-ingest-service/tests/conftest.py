# ruff: noqa: E402
import sys
from pathlib import Path

# Insert service root first so local `app` is resolved
SERVICE_ROOT = Path(__file__).resolve().parents[1]
if str(SERVICE_ROOT) not in sys.path:
    sys.path.insert(0, str(SERVICE_ROOT))

# Also add repo root for shared libs fallback
REPO_ROOT = SERVICE_ROOT.parent.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.append(str(REPO_ROOT))

# Force module alias `app` to point to service-local package
try:
    import importlib

    spec = importlib.util.spec_from_file_location(
        "app",
        SERVICE_ROOT.joinpath("app", "__init__.py"),
    )
    if spec and spec.loader:
        module = importlib.util.module_from_spec(spec)
        sys.modules.setdefault("app", module)
        spec.loader.exec_module(module)
except Exception:
    # tests will fail if imports cannot be resolved; keep silent here
    pass
