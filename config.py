import os
from pathlib import Path

from dotenv import load_dotenv


BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
CHROMA_DIR = BASE_DIR / "chroma_db"

load_dotenv(BASE_DIR / ".env", override=True)

COLLECTION_NAME = os.getenv("CHROMA_COLLECTION", "assistente_univille")

EMBEDDING_PROVIDER = os.getenv("EMBEDDING_PROVIDER", "local").strip().lower()
LLM_PROVIDER = os.getenv("LLM_PROVIDER", "openai").strip().lower()

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
    CHROMA_DIR.mkdir(parents=True, exist_ok=True)


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
