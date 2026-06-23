import os
from pathlib import Path

from dotenv import load_dotenv


BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
_SOURCE_CHROMA_DIR = BASE_DIR / "chroma_db"
CHROMA_DIR = _SOURCE_CHROMA_DIR
_chroma_prepared = False

load_dotenv(BASE_DIR / ".env", override=True)

IS_VERCEL = os.getenv("VERCEL") == "1"

COLLECTION_NAME = os.getenv("CHROMA_COLLECTION", "assistente_univille")

_raw_embedding = os.getenv("EMBEDDING_PROVIDER", "cohere" if IS_VERCEL else "local").strip().lower()
if IS_VERCEL and _raw_embedding == "local":
    _raw_embedding = "cohere"
EMBEDDING_PROVIDER = _raw_embedding

LLM_PROVIDER = os.getenv("LLM_PROVIDER", "cohere").strip().lower()
if IS_VERCEL and LLM_PROVIDER not in {"cohere", "openai"}:
    LLM_PROVIDER = "cohere"

COHERE_API_KEY = (os.getenv("COHERE_API_KEY") or "").strip()
OPENAI_API_KEY = (os.getenv("OPENAI_API_KEY") or "").strip()
ADMIN_USERNAME = (os.getenv("ADMIN_USERNAME") or "admin").strip()
ADMIN_PASSWORD = (os.getenv("ADMIN_PASSWORD") or "").strip()

COHERE_EMBED_MODEL = os.getenv("COHERE_EMBED_MODEL", "embed-multilingual-v3.0")
OPENAI_EMBED_MODEL = os.getenv("OPENAI_EMBED_MODEL", "text-embedding-3-small")
LOCAL_EMBED_MODEL = os.getenv("LOCAL_EMBED_MODEL", "intfloat/multilingual-e5-small")

OPENAI_CHAT_MODEL = os.getenv("OPENAI_CHAT_MODEL", "gpt-4o-mini")
COHERE_CHAT_MODEL = os.getenv("COHERE_CHAT_MODEL", "command-a-03-2025")

CHUNK_SIZE = int(os.getenv("CHUNK_SIZE", "900"))
CHUNK_OVERLAP = int(os.getenv("CHUNK_OVERLAP", "180"))
EMBEDDING_BATCH_SIZE = int(os.getenv("EMBEDDING_BATCH_SIZE", "4"))
EMBEDDING_BATCH_SLEEP_SECONDS = float(os.getenv("EMBEDDING_BATCH_SLEEP_SECONDS", "20"))
EMBEDDING_MAX_RETRIES = int(os.getenv("EMBEDDING_MAX_RETRIES", "6"))
EMBEDDING_TOKENS_PER_MINUTE = int(os.getenv("EMBEDDING_TOKENS_PER_MINUTE", "90000"))
EMBEDDING_RATE_LIMIT_RETRY_SECONDS = float(os.getenv("EMBEDDING_RATE_LIMIT_RETRY_SECONDS", "65"))
RETRIEVER_K = int(os.getenv("RETRIEVER_K", "5"))
USE_COHERE_RERANK = os.getenv("USE_COHERE_RERANK", "true").strip().lower() == "true"
COHERE_RERANK_MODEL = os.getenv("COHERE_RERANK_MODEL", "rerank-v4.0-fast")
MIN_RERANK_SCORE = float(os.getenv("MIN_RERANK_SCORE", "0.20"))

_LOCAL_EMBEDDINGS = None


class LocalSentenceTransformerEmbeddings:
    def __init__(self, model_name: str):
        from sentence_transformers import SentenceTransformer

        self.model = SentenceTransformer(model_name)

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        passages = [f"passage: {text}" for text in texts]
        embeddings = self.model.encode(
            passages,
            normalize_embeddings=True,
            show_progress_bar=False,
        )
        return embeddings.tolist()

    def embed_query(self, text: str) -> list[float]:
        embedding = self.model.encode(
            f"query: {text}",
            normalize_embeddings=True,
            show_progress_bar=False,
        )
        return embedding.tolist()


def ensure_directories() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    if not IS_VERCEL:
        CHROMA_DIR.mkdir(parents=True, exist_ok=True)


def prepare_chroma_runtime() -> Path:
    global CHROMA_DIR, _chroma_prepared

    if not IS_VERCEL:
        return CHROMA_DIR

    if _chroma_prepared:
        return CHROMA_DIR

    import shutil

    target = Path("/tmp/chroma_db")
    marker = target / ".copied"

    if not marker.exists():
        if target.exists():
            shutil.rmtree(target)
        if not _SOURCE_CHROMA_DIR.exists():
            raise RuntimeError("Indice chroma_db nao encontrado no deploy.")
        shutil.copytree(_SOURCE_CHROMA_DIR, target)
        _make_tree_writable(target)
        marker.touch()

    CHROMA_DIR = target
    _chroma_prepared = True
    return CHROMA_DIR


def _make_tree_writable(path: Path) -> None:
    import os

    for root, dirs, files in os.walk(path):
        os.chmod(root, 0o755)
        for name in files:
            os.chmod(os.path.join(root, name), 0o644)


def get_embeddings():
    global _LOCAL_EMBEDDINGS

    if EMBEDDING_PROVIDER == "local":
        if _LOCAL_EMBEDDINGS is None:
            _LOCAL_EMBEDDINGS = LocalSentenceTransformerEmbeddings(LOCAL_EMBED_MODEL)
        return _LOCAL_EMBEDDINGS

    if EMBEDDING_PROVIDER == "cohere":
        if not COHERE_API_KEY:
            raise RuntimeError("Defina COHERE_API_KEY no arquivo .env.")

        from langchain_cohere import CohereEmbeddings

        return CohereEmbeddings(
            model=COHERE_EMBED_MODEL,
            cohere_api_key=COHERE_API_KEY,
        )

    if EMBEDDING_PROVIDER == "openai":
        if not OPENAI_API_KEY:
            raise RuntimeError("Defina OPENAI_API_KEY no arquivo .env.")

        from langchain_openai import OpenAIEmbeddings

        return OpenAIEmbeddings(model=OPENAI_EMBED_MODEL, api_key=OPENAI_API_KEY)

    raise RuntimeError("EMBEDDING_PROVIDER deve ser 'local', 'cohere' ou 'openai'.")


def get_llm():
    if LLM_PROVIDER == "openai":
        if not OPENAI_API_KEY:
            raise RuntimeError("Defina OPENAI_API_KEY no arquivo .env.")

        from langchain_openai import ChatOpenAI

        return ChatOpenAI(model=OPENAI_CHAT_MODEL, temperature=0, api_key=OPENAI_API_KEY)

    if LLM_PROVIDER == "cohere":
        if not COHERE_API_KEY:
            raise RuntimeError("Defina COHERE_API_KEY no arquivo .env.")

        from langchain_cohere import ChatCohere

        return ChatCohere(model=COHERE_CHAT_MODEL, temperature=0, cohere_api_key=COHERE_API_KEY)

    raise RuntimeError("LLM_PROVIDER deve ser 'openai' ou 'cohere'.")
