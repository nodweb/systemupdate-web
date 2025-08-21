# Ensure service and repo roots are on sys.path so imports like `from app.main import app`
# and `from libs.shared_python...` work in tests without installing packages.
import sys
import types
from pathlib import Path

TESTS_DIR = Path(__file__).resolve().parent
SERVICE_ROOT = TESTS_DIR.parent  # .../services/command-service
REPO_ROOT = SERVICE_ROOT.parent.parent  # .../systemupdate-web

# Put service root at highest precedence so `app` resolves to service package
sr = str(SERVICE_ROOT)
if sr in sys.path:
    sys.path.remove(sr)
sys.path.insert(0, sr)

# Ensure repo root is available too, but after service root
rr = str(REPO_ROOT)
if rr not in sys.path:
    sys.path.append(rr)

# Force module alias so `import app.*` maps to the service-local package first
_fake_app = types.ModuleType("app")
_fake_app.__path__ = [str(SERVICE_ROOT / "app")]  # type: ignore[attr-defined]
sys.modules["app"] = _fake_app
