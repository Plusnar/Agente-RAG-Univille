import sys
from pathlib import Path

_API_DIR = Path(__file__).resolve().parent
_APP_ROOT = _API_DIR.parent
if str(_APP_ROOT) not in sys.path:
    sys.path.insert(0, str(_APP_ROOT))

from mangum import Mangum

from app import app

handler = Mangum(app, lifespan="off")
