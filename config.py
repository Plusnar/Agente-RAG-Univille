import os
from pathlib import Path
from typing import Iterable, List

from dotenv import load_dotenv


BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
_SOURCE_CHROMA_DIR = BASE_DIR / "chroma_db"
CHROMA_DIR = _SOURCE_CHROMA_DIR
_chroma_prepared = False

load_dotenv(BASE_DIR / ".env", override=False)
load_dotenv(BASE_DIR / "kilo.env", override=True)

IS_VERCEL = os.getenv("VERCEL") == "1"

COLLECTION_NAME = os.getenv("CHROMA_COLLECTION", "assistente_univille")

_raw_embedding = os.getenv("EMBEDDING_PROVIDER", "cohere" if IS_VERCEL else "local").strip().lower()
if IS_VERCEL and _raw_embedding == "local":
    _raw_embedding = "cohere"
EMBEDDING_PROVIDER = _raw_embedding

LLM_PROVIDER = os.getenv("LLM_PROVIDER", "cohere" if IS_VERCEL else "openrouter").strip().lower()
if IS_VERCEL and LLM_PROVIDER == "local":
    LLM_PROVIDER = "cohere"

COHERE_API_KEY = (os.getenv("COHERE_API_KEY") or "").strip()
OPENAI_API_KEY = (os.getenv("OPENAI_API_KEY") or "").strip()
OPENROUTER_API_KEY = (os.getenv("OPENROUTER_API_KEY") or os.getenv("KILO_API_KEY") or "").strip()
ADMIN_USERNAME = (os.getenv("ADMIN_USERNAME") or "admin").strip()
ADMIN_PASSWORD = (os.getenv("ADMIN_PASSWORD") or "").strip()

OPENROUTER_BASE_URL = os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1").strip().rstrip("/")

COHERE_EMBED_MODEL = os.getenv("COHERE_EMBED_MODEL", "embed-multilingual-v3.0")
OPENAI_EMBED_MODEL = os.getenv("OPENAI_EMBED_MODEL", "text-embedding-3-small")
LOCAL_EMBED_MODEL = os.getenv("LOCAL_EMBED_MODEL", "intfloat/multilingual-e5-small")
OPENROUTER_EMBED_MODEL = os.getenv(
    "OPENROUTER_EMBED_MODEL",
    "intfloat/multilingual-e5-large",
).strip()

OPENAI_CHAT_MODEL = os.getenv("OPENAI_CHAT_MODEL", "gpt-4o-mini")
COHERE_CHAT_MODEL = os.getenv("COHERE_CHAT_MODEL", "command-a-03-2025")
OPENROUTER_CHAT_MODEL = os.getenv("OPENROUTER_CHAT_MODEL", "google/gemma-4-31b-it:free").strip()

OPENROUTER_EMBED_DIMENSION = int(os.getenv("OPENROUTER_EMBED_DIMENSION", "1024"))

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

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        passages = [f"passage: {text}" for text in texts]
        embeddings = self.model.encode(
            passages,
            normalize_embeddings=True,
            show_progress_bar=False,
        )
        return embeddings.tolist()

    def embed_query(self, text: str) -> List[float]:
        embedding = self.model.encode(
            f"query: {text}",
            normalize_embeddings=True,
            show_progress_bar=False,
        )
        return embedding.tolist()


class OpenRouterEmbeddings:
    def __init__(
        self,
        model: str,
        api_key: str,
        base_url: str = OPENROUTER_BASE_URL,
    ) -> None:
        if not api_key:
            raise RuntimeError(
                "Defina OPENROUTER_API_KEY no arquivo kilo.env (ou .env)."
            )
        self.model = model
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")

    def _embed(self, inputs: List[str]) -> List[List[float]]:
        import requests

        url = f"{self.base_url}/embeddings"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        response = requests.post(
            url,
            headers=headers,
            json={"model": self.model, "input": inputs},
            timeout=120,
        )
        if response.status_code >= 400:
            raise RuntimeError(
                f"OpenRouter embeddings error {response.status_code}: {response.text}"
            )
        payload = response.json()
        items = payload.get("data") or []
        ordered = sorted(items, key=lambda item: item.get("index", 0))
        return [list(item.get("embedding", [])) for item in ordered]

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        return self._embed(list(texts))

    def embed_query(self, text: str) -> List[float]:
        return self._embed([text])[0]


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

    if EMBEDDING_PROVIDER == "openrouter":
        return OpenRouterEmbeddings(
            model=OPENROUTER_EMBED_MODEL,
            api_key=OPENROUTER_API_KEY,
        )

    raise RuntimeError("EMBEDDING_PROVIDER deve ser 'local', 'cohere', 'openai' ou 'openrouter'.")


class OpenRouterChat:
    def __init__(
        self,
        model: str,
        api_key: str,
        base_url: str = OPENROUTER_BASE_URL,
        temperature: float = 0,
    ) -> None:
        if not api_key:
            raise RuntimeError(
                "Defina OPENROUTER_API_KEY no arquivo kilo.env (ou .env)."
            )
        self.model = model
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.temperature = temperature

    def _post(self, messages: Iterable[dict]) -> str:
        import requests

        url = f"{self.base_url}/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": self.model,
            "temperature": self.temperature,
            "messages": list(messages),
            "provider": {
                "allow_fallbacks": True,
            },
        }
        response = requests.post(url, headers=headers, json=payload, timeout=180)
        if response.status_code >= 400:
            raise RuntimeError(
                f"OpenRouter chat error {response.status_code}: {response.text}"
            )
        body = response.json()
        choices = body.get("choices") or []
        if not choices:
            raise RuntimeError("OpenRouter chat: resposta sem choices.")
        message = choices[0].get("message") or {}
        content = message.get("content") or ""
        return content

    def invoke(self, messages):
        from langchain_core.messages import AIMessage

        langchain_messages = []
        for message in messages:
            role = getattr(message, "type", None) or (
                "user" if isinstance(message, dict) and message.get("role") == "user" else None
            )
            content = getattr(message, "content", None)
            if content is None and isinstance(message, dict):
                content = message.get("content", "")
            if role == "system":
                langchain_messages.append({"role": "system", "content": content})
            elif role == "human" or role == "user":
                langchain_messages.append({"role": "user", "content": content})
            elif role == "ai" or role == "assistant":
                langchain_messages.append({"role": "assistant", "content": content})
            else:
                langchain_messages.append({"role": "user", "content": content})

        content = self._post(langchain_messages)
        return AIMessage(content=content)


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

    if LLM_PROVIDER == "openrouter":
        return OpenRouterChat(
            model=OPENROUTER_CHAT_MODEL,
            api_key=OPENROUTER_API_KEY,
            temperature=0,
        )

    raise RuntimeError("LLM_PROVIDER deve ser 'openai', 'cohere' ou 'openrouter'.")