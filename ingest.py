import hashlib
import re
import time
from pathlib import Path
from typing import Callable, Iterable, List

import chromadb
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter
from pypdf import PdfReader

from config import (
    CHROMA_DIR,
    CHUNK_OVERLAP,
    CHUNK_SIZE,
    COLLECTION_NAME,
    DATA_DIR,
    EMBEDDING_BATCH_SIZE,
    EMBEDDING_BATCH_SLEEP_SECONDS,
    EMBEDDING_MAX_RETRIES,
    EMBEDDING_PROVIDER,
    ensure_directories,
    get_embeddings,
)


SUPPORTED_EXTENSIONS = {".pdf", ".txt"}
RATE_LIMIT_MESSAGE = (
    "Limite temporario da Cohere atingido durante a indexacao. "
    "Aguarde 1 ou 2 minutos e tente novamente. "
    "Para chave trial, mantenha lotes pequenos no .env, por exemplo "
    "EMBEDDING_BATCH_SIZE=4 e EMBEDDING_BATCH_SLEEP_SECONDS=20."
)


def list_documents() -> List[Path]:
    ensure_directories()
    return sorted(
        path for path in DATA_DIR.iterdir()
        if path.is_file() and path.suffix.lower() in SUPPORTED_EXTENSIONS
    )


def _read_txt(path: Path) -> List[Document]:
    for encoding in ("utf-8", "latin-1"):
        try:
            text = path.read_text(encoding=encoding)
            break
        except UnicodeDecodeError:
            continue
    else:
        raise RuntimeError(f"Nao foi possivel ler o arquivo TXT: {path.name}")

    return [
        Document(
            page_content=text,
            metadata={
                "source": path.name,
                "file_name": path.name,
                "file_type": "txt",
                "page": "",
                "section": _detect_section(text) or "",
            },
        )
    ]


def _read_pdf(path: Path) -> List[Document]:
    reader = PdfReader(str(path))
    documents: List[Document] = []

    for page_index, page in enumerate(reader.pages, start=1):
        text = page.extract_text() or ""
        if not text.strip():
            continue

        documents.append(
            Document(
                page_content=text,
                metadata={
                    "source": path.name,
                    "file_name": path.name,
                    "file_type": "pdf",
                    "page": page_index,
                    "section": _detect_section(text) or "",
                },
            )
        )

    return documents


def load_documents(paths: Iterable[Path] | None = None) -> List[Document]:
    ensure_directories()
    selected_paths = list(paths) if paths is not None else list_documents()
    documents: List[Document] = []

    for path in selected_paths:
        suffix = path.suffix.lower()
        if suffix == ".pdf":
            documents.extend(_read_pdf(path))
        elif suffix == ".txt":
            documents.extend(_read_txt(path))

    return [doc for doc in documents if doc.page_content.strip()]


def _detect_section(text: str) -> str | None:
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    heading_patterns = [
        r"^(capitulo|se[cç][aã]o|titulo|anexo)\b.+",
        r"^\d+(\.\d+)*\s+.{4,100}$",
        r"^[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ0-9\s]{8,100}$",
    ]

    for line in lines[:12]:
        normalized = re.sub(r"\s+", " ", line)
        if any(re.match(pattern, normalized, flags=re.IGNORECASE) for pattern in heading_patterns):
            return normalized[:120]

    return None


def split_documents(documents: List[Document]) -> List[Document]:
    source_texts = {_document_key(doc): doc.page_content for doc in documents}
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=CHUNK_SIZE,
        chunk_overlap=CHUNK_OVERLAP,
        separators=["\n\n", "\n", ". ", "? ", "! ", "; ", ", ", " ", ""],
        length_function=len,
    )
    chunks = splitter.split_documents(documents)

    for index, chunk in enumerate(chunks):
        chunk.metadata["chunk_index"] = index
        line_start, line_end = _line_range(source_texts.get(_document_key(chunk), ""), chunk.page_content)
        chunk.metadata["line_start"] = line_start
        chunk.metadata["line_end"] = line_end
        chunk.metadata["chunk_id"] = _chunk_id(chunk)

    return chunks


def _document_key(document: Document) -> tuple:
    metadata = document.metadata
    return metadata.get("file_name", ""), str(metadata.get("page", ""))


def _line_range(source_text: str, chunk_text: str) -> tuple[int, int]:
    if not source_text or not chunk_text:
        return 0, 0

    needle = chunk_text.strip()
    position = source_text.find(needle)

    if position == -1:
        compact_needle = re.sub(r"\s+", " ", needle[:180]).strip()
        compact_source = re.sub(r"\s+", " ", source_text)
        compact_position = compact_source.find(compact_needle)
        if compact_position == -1:
            return 0, 0

        # Approximation used when PDF extraction changes whitespace and line breaks.
        ratio = compact_position / max(len(compact_source), 1)
        position = int(len(source_text) * ratio)

    line_start = source_text.count("\n", 0, position) + 1
    line_end = line_start + max(chunk_text.count("\n"), 0)
    return line_start, line_end


def _chunk_id(document: Document) -> str:
    metadata = document.metadata
    base = "|".join(
        [
            str(metadata.get("file_name", "")),
            str(metadata.get("page", "")),
            str(metadata.get("chunk_index", "")),
            document.page_content[:120],
        ]
    )
    return hashlib.sha256(base.encode("utf-8")).hexdigest()


def reset_collection() -> None:
    ensure_directories()
    client = chromadb.PersistentClient(path=str(CHROMA_DIR))

    try:
        collections = client.list_collections()
        collection_names = [collection.name if hasattr(collection, "name") else str(collection) for collection in collections]
        if COLLECTION_NAME in collection_names:
            client.delete_collection(COLLECTION_NAME)
    except Exception as exc:
        message = str(exc).lower()
        if "does not exist" not in message and "not found" not in message:
            raise


def _is_rate_limit_error(exc: Exception) -> bool:
    message = str(exc).lower()
    return "429" in message or "rate limit" in message or "too many requests" in message


def _add_documents_with_backoff(
    vectorstore,
    chunks: List[Document],
    progress: Callable[[str], None] | None = None,
) -> None:
    total = len(chunks)
    batch_size = max(1, EMBEDDING_BATCH_SIZE)
    sleep_seconds = 0 if EMBEDDING_PROVIDER == "local" else EMBEDDING_BATCH_SLEEP_SECONDS
    total_batches = (total + batch_size - 1) // batch_size

    for start in range(0, total, batch_size):
        batch = chunks[start:start + batch_size]
        ids = [chunk.metadata["chunk_id"] for chunk in batch]
        batch_number = (start // batch_size) + 1
        progress_percent = min(100, round(((start + len(batch)) / total) * 100, 1))

        if progress:
            progress(
                f"Gerando embeddings lote {batch_number}/{total_batches} "
                f"({start + len(batch)}/{total} chunks, {progress_percent}%)"
            )

        for attempt in range(EMBEDDING_MAX_RETRIES + 1):
            try:
                vectorstore.add_documents(batch, ids=ids)
                break
            except Exception as exc:
                if not _is_rate_limit_error(exc) or attempt >= EMBEDDING_MAX_RETRIES:
                    if _is_rate_limit_error(exc):
                        raise RuntimeError(RATE_LIMIT_MESSAGE) from exc
                    raise

                wait_seconds = sleep_seconds * (attempt + 1)
                if progress and wait_seconds > 0:
                    progress(f"Limite temporario detectado. Aguardando {wait_seconds:.0f}s antes de tentar novamente...")
                time.sleep(wait_seconds)

        if start + batch_size < total and sleep_seconds > 0:
            if progress:
                progress(f"Aguardando {sleep_seconds:.0f}s antes do proximo lote...")
            time.sleep(sleep_seconds)


def ingest_documents(reset: bool = True, progress: Callable[[str], None] | None = None) -> dict:
    ensure_directories()
    if progress:
        progress("Lendo documentos em data/...")
    documents = load_documents()

    if not documents:
        if reset:
            reset_collection()
        return {"files": 0, "pages": 0, "chunks": 0, "message": "Nenhum PDF ou TXT encontrado em data/."}

    if progress:
        progress(f"Documentos lidos: {len({doc.metadata.get('file_name') for doc in documents})} arquivos, {len(documents)} paginas/entradas.")
        progress("Dividindo textos em chunks...")

    chunks = split_documents(documents)

    if progress:
        progress(f"Chunks gerados: {len(chunks)}.")

    if reset:
        if progress:
            progress("Recriando colecao local do ChromaDB...")
        reset_collection()

    from langchain_chroma import Chroma

    vectorstore = Chroma(
        collection_name=COLLECTION_NAME,
        persist_directory=str(CHROMA_DIR),
        embedding_function=get_embeddings(),
    )

    _add_documents_with_backoff(vectorstore, chunks, progress=progress)

    return {
        "files": len({doc.metadata.get("file_name") for doc in documents}),
        "pages": len(documents),
        "chunks": len(chunks),
        "message": "Documentos indexados com sucesso.",
    }


if __name__ == "__main__":
    def print_progress(message: str) -> None:
        timestamp = time.strftime("%H:%M:%S")
        print(f"[{timestamp}] {message}", flush=True)

    result = ingest_documents(reset=True, progress=print_progress)
    print(result["message"])
    print(f"Arquivos: {result['files']} | Paginas/entradas: {result['pages']} | Chunks: {result['chunks']}")
