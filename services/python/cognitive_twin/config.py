# config.py
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(exist_ok=True)

# Base de datos
DATABASE_URL = os.getenv("COGNITIVE_DB_URL", f"sqlite:///{DATA_DIR}/cognitive_twin.db")
# Para usar PostgreSQL en producción:
# DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:pass@localhost/cognitive_twin")

# Modelos de embeddings (multilingüe para español/inglés)
EMBEDDING_MODEL = "paraphrase-multilingual-MiniLM-L12-v2"

# Umbrales
DEFAULT_CONFIDENCE_THRESHOLD = 0.6
HALF_LIFE_DAYS = 30  # decaimiento de relaciones causales
MAX_EPISODES = 100
WINDOW_SIZE = 50  # para drift atencional, etc.

# Rutas de logs
LOG_DIR = DATA_DIR / "logs"
LOG_DIR.mkdir(exist_ok=True)