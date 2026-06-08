from collections import OrderedDict
import re
from typing import Dict, List
import unicodedata

from langchain_core.messages import HumanMessage, SystemMessage

from config import (
    CHROMA_DIR,
    COHERE_API_KEY,
    COHERE_RERANK_MODEL,
    COLLECTION_NAME,
    MIN_RERANK_SCORE,
    RETRIEVER_K,
    USE_COHERE_RERANK,
    get_embeddings,
    get_llm,
)
from prompts import SYSTEM_PROMPT, USER_PROMPT_TEMPLATE


NO_CONTEXT_MESSAGE = "Não encontrei essa informação nos documentos disponíveis."
CLARIFY_MESSAGE = "Puxa vida, não entendi a sua pergunta, poderia descrever melhor? Sei tudo sobre a Univille apenas."
MAX_HISTORY_MESSAGES = 6
MAX_HISTORY_CHARS = 1600


def _get_vectorstore():
    from langchain_chroma import Chroma

    return Chroma(
        collection_name=COLLECTION_NAME,
        persist_directory=str(CHROMA_DIR),
        embedding_function=get_embeddings(),
    )


def _format_source(metadata: Dict) -> str:
    file_name = metadata.get("file_name") or metadata.get("source") or "Documento sem nome"
    page = metadata.get("page")
    section = metadata.get("section")

    parts = [str(file_name)]
    if page not in (None, "", "None"):
        parts.append(f"pagina {page}")
    if section:
        parts.append(f"secao: {section}")

    return ", ".join(parts)


def _dedupe_sources(docs) -> List[str]:
    sources = OrderedDict()
    for doc in docs:
        source = _format_source(doc.metadata)
        sources[source] = None
    return list(sources.keys())


def _clean_excerpt(text: str, limit: int = 900) -> str:
    excerpt = re.sub(r"\s+", " ", text).strip()
    if len(excerpt) <= limit:
        return excerpt
    return excerpt[:limit].rsplit(" ", 1)[0] + "..."


def _source_details(docs) -> List[Dict]:
    details = []
    seen = set()

    for doc in docs:
        metadata = doc.metadata
        key = (
            metadata.get("file_name") or metadata.get("source") or "",
            str(metadata.get("page") or ""),
            str(metadata.get("line_start") or ""),
            doc.page_content[:120],
        )
        if key in seen:
            continue
        seen.add(key)

        details.append(
            {
                "file_name": metadata.get("file_name") or metadata.get("source") or "Documento sem nome",
                "page": metadata.get("page") or "",
                "section": metadata.get("section") or "",
                "line_start": metadata.get("line_start") or "",
                "line_end": metadata.get("line_end") or "",
                "excerpt": _clean_excerpt(doc.page_content),
            }
        )

    return details


def _format_context(docs) -> str:
    blocks = []
    for index, doc in enumerate(docs, start=1):
        source = _format_source(doc.metadata)
        blocks.append(f"[Contexto {index}: {source}]\n{doc.page_content}")
    return "\n\n".join(blocks)


def _format_chat_history(chat_history: List[Dict] | None) -> str:
    if not chat_history:
        return "Sem historico recente relevante."

    lines = []
    for message in chat_history[-MAX_HISTORY_MESSAGES:]:
        role = message.get("role")
        content = re.sub(r"\s+", " ", str(message.get("content") or "")).strip()
        if not content:
            continue
        label = "Aluno" if role == "user" else "Assistente"
        lines.append(f"{label}: {content}")

    formatted = "\n".join(lines).strip()
    if not formatted:
        return "Sem historico recente relevante."
    if len(formatted) > MAX_HISTORY_CHARS:
        formatted = formatted[-MAX_HISTORY_CHARS:]
    return formatted


def _clean_answer(answer: str) -> str:
    patterns = [
        r"\n\s*Fontes\s*:.*$",
        r"\n\s*Fonte\s*:.*$",
        r"\n\s*Sources\s*:.*$",
        r"\n\s*Referencias\s*:.*$",
        r"\n\s*Referências\s*:.*$",
    ]
    cleaned = answer
    for pattern in patterns:
        cleaned = re.sub(pattern, "", cleaned, flags=re.IGNORECASE | re.DOTALL)
    cleaned = re.sub(r"^\s*Resposta\s*:\s*", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\n\s*Explica[cç][aã]o\s*:\s*", "\n\n", cleaned, flags=re.IGNORECASE)
    return cleaned.strip()


def _normalize_text(text: str) -> str:
    normalized = unicodedata.normalize("NFD", text.lower())
    return "".join(char for char in normalized if unicodedata.category(char) != "Mn")


def _rerank_documents(question: str, docs, k: int):
    if not USE_COHERE_RERANK or not COHERE_API_KEY or not docs:
        return docs[:k]

    try:
        import cohere

        client = cohere.Client(api_key=COHERE_API_KEY)
        response = client.rerank(
            model=COHERE_RERANK_MODEL,
            query=question,
            documents=[doc.page_content for doc in docs],
            top_n=min(k, len(docs)),
        )
    except Exception:
        return docs[:k]

    reranked_docs = []
    for item in response.results:
        if item.relevance_score >= MIN_RERANK_SCORE:
            reranked_docs.append(docs[item.index])

    return reranked_docs


def _relevant_documents(vectorstore, question: str, k: int):
    candidate_k = max(k * 4, 12)
    docs = vectorstore.similarity_search(question, k=candidate_k)
    candidates = [doc for doc in docs if doc.page_content.strip()]

    if not USE_COHERE_RERANK:
        return candidates[:k]

    return _rerank_documents(question, candidates, k)


def answer_question(question: str, k: int = RETRIEVER_K, chat_history: List[Dict] | None = None) -> Dict:
    cleaned_question = question.strip()
    if not cleaned_question:
        return {"answer": "Digite uma pergunta.", "sources": [], "source_details": [], "documents": []}

    vectorstore = _get_vectorstore()
    docs = _relevant_documents(vectorstore, cleaned_question, k=k)

    if not docs:
        return {"answer": CLARIFY_MESSAGE, "sources": [], "source_details": [], "documents": []}

    context = _format_context(docs)
    prompt = USER_PROMPT_TEMPLATE.format(
        chat_history=_format_chat_history(chat_history),
        context=context,
        question=cleaned_question,
    )

    llm = get_llm()
    response = llm.invoke(
        [
            SystemMessage(content=SYSTEM_PROMPT),
            HumanMessage(content=prompt),
        ]
    )

    answer = response.content if hasattr(response, "content") else str(response)
    answer = _clean_answer(answer)
    normalized_answer = _normalize_text(answer)

    if _normalize_text(NO_CONTEXT_MESSAGE) in normalized_answer or "puxa vida" in normalized_answer:
        final_answer = CLARIFY_MESSAGE if "puxa vida" in normalized_answer else NO_CONTEXT_MESSAGE
        return {"answer": final_answer, "sources": [], "source_details": [], "documents": []}

    return {
        "answer": answer,
        "sources": _dedupe_sources(docs),
        "source_details": _source_details(docs),
        "documents": docs,
    }
