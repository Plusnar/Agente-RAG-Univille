from pathlib import Path
from typing import Any

from fastapi import FastAPI, File, Header, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from config import ADMIN_PASSWORD, ADMIN_USERNAME, DATA_DIR, ensure_directories
from ingest import ingest_documents, list_documents
from rag import answer_question


ensure_directories()

APP_DIR = Path(__file__).resolve().parent
FRONTEND_DIST = APP_DIR / "frontend" / "dist"

app = FastAPI(title="Assistente Univille API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    question: str
    history: list[ChatMessage] = []


class DeleteDocumentsRequest(BaseModel):
    file_names: list[str]


def _check_admin(username: str | None, password: str | None) -> None:
    if username != ADMIN_USERNAME or password != ADMIN_PASSWORD:
        raise HTTPException(status_code=401, detail="Credenciais de admin invalidas.")


def _safe_document_path(file_name: str) -> Path:
    target = (DATA_DIR / file_name).resolve()
    if target.parent != DATA_DIR.resolve() or not target.is_file():
        raise HTTPException(status_code=404, detail="Documento nao encontrado.")
    return target


def _clean_error(exc: Exception) -> str:
    message = str(exc)
    lowered = message.lower()
    if "429" in lowered or "rate limit" in lowered or "too many requests" in lowered:
        return (
            "A Cohere bloqueou temporariamente a indexacao por limite da chave trial. "
            "Aguarde 1 ou 2 minutos e tente novamente."
        )
    return message


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/chat")
def chat(payload: ChatRequest) -> dict[str, Any]:
    history = [message.model_dump() for message in payload.history]
    return answer_question(payload.question, chat_history=history)


@app.get("/api/documents")
def documents() -> dict[str, Any]:
    files = [{"name": path.name, "size": path.stat().st_size} for path in list_documents()]
    return {"documents": files}


@app.get("/documents/{file_name}")
def document_file(file_name: str) -> FileResponse:
    path = _safe_document_path(file_name)
    media_type = "application/pdf" if path.suffix.lower() == ".pdf" else "text/plain"
    return FileResponse(path, media_type=media_type, filename=path.name)


@app.post("/api/admin/upload")
async def upload_documents(
    files: list[UploadFile] = File(...),
    x_admin_username: str | None = Header(default=None),
    x_admin_password: str | None = Header(default=None),
) -> dict[str, Any]:
    _check_admin(x_admin_username, x_admin_password)

    saved = []
    for file in files:
        suffix = Path(file.filename or "").suffix.lower()
        if suffix not in {".pdf", ".txt"}:
            raise HTTPException(status_code=400, detail="Envie apenas PDFs ou TXT.")

        destination = DATA_DIR / Path(file.filename).name
        destination.write_bytes(await file.read())
        saved.append(destination.name)

    return {"saved": saved}


@app.post("/api/admin/index")
def index_documents(
    x_admin_username: str | None = Header(default=None),
    x_admin_password: str | None = Header(default=None),
) -> dict[str, Any]:
    _check_admin(x_admin_username, x_admin_password)
    try:
        return ingest_documents(reset=True)
    except Exception as exc:
        raise HTTPException(status_code=429 if "rate limit" in str(exc).lower() else 500, detail=_clean_error(exc)) from exc


@app.delete("/api/admin/documents")
def delete_documents(
    payload: DeleteDocumentsRequest,
    x_admin_username: str | None = Header(default=None),
    x_admin_password: str | None = Header(default=None),
) -> dict[str, Any]:
    _check_admin(x_admin_username, x_admin_password)

    deleted = []
    for file_name in payload.file_names:
        path = _safe_document_path(file_name)
        path.unlink()
        deleted.append(file_name)

    result = ingest_documents(reset=True)
    return {"deleted": deleted, "index": result}


if FRONTEND_DIST.exists():
    app.mount("/assets", StaticFiles(directory=FRONTEND_DIST / "assets"), name="assets")


@app.get("/{full_path:path}")
def frontend(full_path: str) -> FileResponse:
    index_file = FRONTEND_DIST / "index.html"
    if not index_file.exists():
        raise HTTPException(
            status_code=404,
            detail="Frontend ainda nao foi gerado. Rode: cd frontend && npm install && npm run build",
        )
    return FileResponse(index_file)
