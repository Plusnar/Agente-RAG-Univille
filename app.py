import shutil
import json
import hmac
from html import escape

import streamlit as st
import streamlit.components.v1 as components
from cohere.errors import NotFoundError

from config import ADMIN_PASSWORD, ADMIN_USERNAME, DATA_DIR, ensure_directories
from ingest import ingest_documents, list_documents
from rag import answer_question


st.set_page_config(
    page_title="Assistente Univille",
    page_icon=":mortar_board:",
    layout="wide",
    initial_sidebar_state="expanded",
)
ensure_directories()

st.markdown(
    """
    <style>
    .block-container {
        max-width: 1360px;
        padding: 1rem 1.15rem 7rem;
    }
    .stApp {
        background: #ffffff;
        color: #0d0d0d;
    }
    #MainMenu,
    footer,
    [data-testid="stToolbar"],
    [data-testid="stDecoration"],
    [data-testid="stStatusWidget"],
    [data-testid="manage-app-button"] {
        display: none !important;
        visibility: hidden !important;
        height: 0 !important;
    }
    header,
    [data-testid="stHeader"] {
        background: rgba(255, 255, 255, 0.92) !important;
        border-bottom: 1px solid #ececec;
    }
    header [data-testid="stToolbar"],
    header [data-testid="stDecoration"],
    header [data-testid="stStatusWidget"],
    header [data-testid="manage-app-button"] {
        display: none !important;
        visibility: hidden !important;
    }
    .stAppDeployButton {
        display: none !important;
    }
    [data-testid="stSidebar"] {
        display: none !important;
    }
    .left-rail {
        position: sticky;
        top: 1rem;
        min-height: calc(100vh - 2rem);
        max-height: calc(100vh - 2rem);
        overflow-y: auto;
        border: 1px solid #ececec;
        border-radius: 16px;
        background: #f9f9f9;
        box-shadow: 0 16px 38px rgba(0, 0, 0, 0.06);
        padding: 0.9rem;
        backdrop-filter: blur(18px);
    }
    .chat-shell {
        max-width: 880px;
        margin: 0 auto;
    }
    [data-testid="stSidebar"] .block-container {
        padding: 0.8rem 0.75rem 1.2rem;
    }
    [data-testid="stSidebar"] {
        border-right: 1px solid #ececec;
        background: #f9f9f9;
    }
    [data-testid="stSidebar"] * {
        color: #0d0d0d;
    }
    [data-testid="stSidebar"] .stAlert {
        background: #ffffff;
        border: 1px solid #ececec;
    }
    .topbar {
        position: sticky;
        top: 0;
        z-index: 10;
        margin: -0.2rem 0 1rem;
        padding: 0.95rem 0 0.8rem;
        background: rgba(255, 255, 255, 0.92);
        backdrop-filter: blur(12px);
        border-bottom: 1px solid rgba(236, 236, 236, 0.72);
    }
    .topbar-title {
        color: #5f6368;
        font-size: 1rem;
        font-weight: 700;
        letter-spacing: 0;
    }
    .empty-state {
        min-height: 66vh;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        animation: heroIn 420ms ease-out both;
    }
    .empty-state h1 {
        font-size: clamp(2.35rem, 5vw, 4.2rem);
        line-height: 1.04;
        max-width: 820px;
        margin: 0 0 0.85rem;
        color: #2f2f2f;
        font-weight: 780;
        letter-spacing: 0;
    }
    .empty-state p {
        color: #6f6f6f;
        margin: 0;
        font-size: 1.03rem;
        max-width: 620px;
        line-height: 1.6;
    }
    .hero-actions {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 0.75rem;
        width: min(760px, 100%);
        margin-top: 1.6rem;
    }
    .hero-card {
        text-align: left;
        border: 1px solid #ececec;
        background: #ffffff;
        border-radius: 16px;
        padding: 1rem;
        min-height: 118px;
        box-shadow: 0 16px 36px rgba(0, 0, 0, 0.06);
        transition: transform 160ms ease, border 160ms ease, background 160ms ease;
    }
    .hero-card:hover {
        transform: translateY(-3px);
        border-color: #d9d9d9;
        background: #f9f9f9;
    }
    .hero-card strong {
        display: block;
        color: #2f2f2f;
        font-size: 0.96rem;
        margin-bottom: 0.35rem;
    }
    .hero-card span {
        color: #6f6f6f;
        font-size: 0.88rem;
        line-height: 1.45;
    }
    @keyframes heroIn {
        from {
            opacity: 0;
            transform: translateY(12px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    .side-brand {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.75rem;
        margin-bottom: 0.85rem;
        color: #2f2f2f;
        font-size: 1.02rem;
        font-weight: 740;
        letter-spacing: 0;
    }
    .side-section {
        color: #6f6f6f;
        font-size: 0.78rem;
        font-weight: 720;
        margin: 1.1rem 0 0.35rem;
        text-transform: uppercase;
        letter-spacing: 0.04em;
    }
    .doc-row {
        border-radius: 10px;
        padding: 0.55rem 0.65rem;
        background: transparent;
        color: #2f2f2f;
        font-size: 0.9rem;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        border: 1px solid transparent;
    }
    .doc-row:hover {
        background: #eeeeee;
        border-color: transparent;
    }
    div[data-testid="stChatMessage"] {
        border-radius: 18px;
        padding: 0.85rem 1rem;
        margin-bottom: 0.75rem;
        animation: messageIn 220ms ease-out both;
    }
    div[data-testid="stChatMessage"]:has([data-testid="chatAvatarIcon-assistant"]) {
        background: #ffffff;
        border: 1px solid #ececec;
        box-shadow: 0 12px 28px rgba(0, 0, 0, 0.05);
    }
    div[data-testid="stChatMessage"]:has([data-testid="chatAvatarIcon-user"]) {
        background: #f7f7f7;
        border: 1px solid #ececec;
    }
    div[data-testid="stChatMessage"] p,
    div[data-testid="stChatMessage"] li {
        color: #0d0d0d;
        line-height: 1.65;
        font-size: 0.98rem;
    }
    @keyframes messageIn {
        from {
            opacity: 0;
            transform: translateY(8px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    div[data-testid="stPopover"] button {
        border-color: #d9d9d9;
        color: #2f2f2f;
        background: #ffffff;
        border-radius: 18px;
        transition: transform 140ms ease, box-shadow 140ms ease, background 140ms ease;
    }
    div[data-testid="stPopover"] button:hover {
        transform: translateY(-1px);
        box-shadow: 0 8px 22px rgba(0, 0, 0, 0.08);
        background: #f7f7f7;
        color: #0d0d0d;
    }
    @keyframes sourceIn {
        from {
            opacity: 0;
            transform: translateY(10px) scale(0.985);
        }
        to {
            opacity: 1;
            transform: translateY(0) scale(1);
        }
    }
    @keyframes sourceGlow {
        0% { box-shadow: 0 0 0 rgba(16, 163, 127, 0); }
        45% { box-shadow: 0 0 0 5px rgba(16, 163, 127, 0.12); }
        100% { box-shadow: 0 0 0 rgba(16, 163, 127, 0); }
    }
    .source-panel {
        animation: sourceIn 260ms ease-out both;
    }
    .source-card {
        border: 1px solid #ececec;
        border-left: 4px solid #10a37f;
        border-radius: 12px;
        padding: 0.85rem 0.95rem;
        margin: 0.65rem 0;
        background: #ffffff;
        animation: sourceIn 280ms ease-out both, sourceGlow 900ms ease-out 120ms;
    }
    .source-card h4 {
        margin: 0 0 0.35rem 0;
        color: #0d0d0d;
        font-size: 0.98rem;
    }
    .source-meta {
        color: #6f6f6f;
        font-size: 0.82rem;
        margin-bottom: 0.45rem;
    }
    .source-excerpt {
        border: 1px solid #ececec;
        border-radius: 10px;
        padding: 0.72rem 0.82rem;
        margin-top: 0.5rem;
        font-size: 0.9rem;
        line-height: 1.55;
        color: #2f2f2f;
        background: #f9f9f9;
    }
    .stTextInput input,
    .stTextArea textarea,
    [data-testid="stChatInput"] textarea {
        background: #ffffff;
        color: #0d0d0d;
        border-color: #d9d9d9;
    }
    [data-testid="stChatInput"] {
        max-width: 880px;
        margin: 0 auto;
    }
    [data-testid="stChatInput"] > div {
        border-radius: 28px;
        border: 1px solid #d9d9d9;
        box-shadow: 0 6px 22px rgba(0, 0, 0, 0.08);
        background: #ffffff;
    }
    .stButton button {
        border-radius: 10px;
        border-color: #d9d9d9;
        background: transparent;
        color: #0d0d0d;
    }
    .stButton button[kind="primary"] {
        background: #0d0d0d;
        color: #ffffff;
        border: none;
    }
    .stButton button:hover {
        border-color: #d9d9d9;
        background: #f7f7f7;
        color: #0d0d0d;
    }
    .stCaption,
    .stMarkdown,
    label,
    .st-emotion-cache,
    .stSelectbox,
    .stMultiSelect {
        color: #0d0d0d;
    }
    .stExpander {
        border: none;
    }
    div[data-testid="stFileUploader"] {
        border-color: #ececec;
        color: #0d0d0d;
    }
    @media (max-width: 900px) {
        .hero-actions {
            grid-template-columns: 1fr;
        }
        .left-rail {
            position: relative;
            min-height: auto;
        }
    }
    </style>
    """,
    unsafe_allow_html=True,
)

WELCOME_MESSAGE = (
    "Oi! Eu sou o Assistente Univille. Manda sua pergunta sobre os documentos indexados "
    "que eu te ajudo com base no que estiver nas fontes."
)


def save_uploaded_files(uploaded_files) -> list[str]:
    saved_files = []
    for uploaded_file in uploaded_files:
        destination = DATA_DIR / uploaded_file.name
        with destination.open("wb") as output:
            shutil.copyfileobj(uploaded_file, output)
        saved_files.append(uploaded_file.name)
    return saved_files


def delete_documents(file_names: list[str]) -> int:
    deleted = 0
    for file_name in file_names:
        target = DATA_DIR / file_name
        if target.exists() and target.is_file() and target.parent == DATA_DIR:
            target.unlink()
            deleted += 1
    return deleted


def check_admin_credentials(username: str, password: str) -> bool:
    return (
        bool(ADMIN_USERNAME)
        and bool(ADMIN_PASSWORD)
        and hmac.compare_digest(username.strip(), ADMIN_USERNAME)
        and hmac.compare_digest(password, ADMIN_PASSWORD)
    )


def user_friendly_error(exc: Exception) -> str:
    message = str(exc)
    lowered = message.lower()
    if "429" in lowered or "rate limit" in lowered or "too many requests" in lowered:
        return (
            "A Cohere bloqueou temporariamente a indexacao por limite de tokens da chave trial. "
            "Aguarde 1 ou 2 minutos e tente novamente. O app agora indexa em lotes menores para reduzir esse erro."
        )
    if "limite temporario da cohere" in lowered:
        return message
    return message


def render_admin_dashboard() -> None:
    st.markdown('<div class="side-section">Dashboard admin</div>', unsafe_allow_html=True)

    uploaded_files = st.file_uploader(
        "Enviar PDFs ou TXT",
        type=["pdf", "txt"],
        accept_multiple_files=True,
    )

    if uploaded_files:
        if st.button("Salvar documentos", use_container_width=True):
            try:
                saved = save_uploaded_files(uploaded_files)
                st.success(f"{len(saved)} arquivo(s) salvo(s) em data/.")
            except Exception as exc:
                st.error(f"Erro ao salvar arquivos: {user_friendly_error(exc)}")

    current_docs = list_documents()
    if current_docs:
        st.markdown('<div class="side-section">Arquivos indexaveis</div>', unsafe_allow_html=True)
        for doc in current_docs:
            st.markdown(f'<div class="doc-row">{escape(doc.name)}</div>', unsafe_allow_html=True)

        docs_to_remove = st.multiselect(
            "Remover da consulta",
            options=[doc.name for doc in current_docs],
            help="Remove os arquivos da pasta data/ e reindexa a busca.",
        )
        if docs_to_remove and st.button("Remover selecionados", use_container_width=True):
            try:
                deleted = delete_documents(docs_to_remove)
                result = ingest_documents(reset=True)
                st.success(
                    f"{deleted} arquivo(s) removido(s). Consulta atualizada com "
                    f"{result['files']} arquivo(s) restante(s)."
                )
                st.rerun()
            except Exception as exc:
                st.error(f"Erro ao remover arquivos: {user_friendly_error(exc)}")
    else:
        st.info("Nenhum documento enviado ainda.")

    if st.button("Indexar documentos", type="primary", use_container_width=True):
        with st.spinner("Indexando documentos..."):
            try:
                result = ingest_documents(reset=True)
                st.success(result["message"])
                st.caption(
                    f"Arquivos: {result['files']} | Paginas/entradas: {result['pages']} | Chunks: {result['chunks']}"
                )
            except Exception as exc:
                st.error(f"Erro ao indexar documentos: {user_friendly_error(exc)}")

    if st.button("Sair do admin", use_container_width=True):
        st.session_state.admin_authenticated = False
        st.rerun()


def add_message(role: str, content: str, source_details: list[dict] | None = None) -> None:
    st.session_state.messages.append(
        {
            "role": role,
            "content": content,
            "source_details": source_details or [],
        }
    )


def render_source_detail(detail: dict, index: int) -> None:
    file_name = escape(str(detail.get("file_name") or "Documento sem nome"))
    page = escape(str(detail.get("page") or "nao informada"))
    line_start = detail.get("line_start") or ""
    line_end = detail.get("line_end") or ""
    section = escape(str(detail.get("section") or ""))
    excerpt = escape(str(detail.get("excerpt") or ""))

    line_text = "linha nao identificada"
    if line_start and line_end:
        line_text = f"linhas {line_start} a {line_end}"
    elif line_start:
        line_text = f"linha {line_start}"
    line_text = escape(line_text)

    section_html = ""
    if section:
        section_html = f"<div class=\"source-meta\">Secao detectada: {section}</div>"

    st.markdown(
        f"""
        <div class="source-card">
            <h4>Trecho {index}</h4>
            <div class="source-meta">{file_name} | pagina {page} | {line_text}</div>
            {section_html}
            <div class="source-excerpt">{excerpt}</div>
        </div>
        """,
        unsafe_allow_html=True,
    )


def valid_source_details(details: list[dict] | None) -> list[dict]:
    return [detail for detail in (details or []) if str(detail.get("excerpt") or "").strip()]


def render_speech_controls(text: str, key: str) -> None:
    clean_text = str(text or "").strip()
    if not clean_text:
        return

    payload = json.dumps(clean_text)
    element_id = f"speech-{key}"
    components.html(
        f"""
        <div id="{element_id}" class="speech-controls">
            <button type="button" class="speech-button" onclick="speakResponse()">Ouvir resposta</button>
            <button type="button" class="speech-button secondary" onclick="stopResponse()">Parar</button>
            <span class="speech-status" id="{element_id}-status"></span>
        </div>

        <script>
        const responseText = {payload};
        const statusLabel = document.getElementById("{element_id}-status");

        function setSpeechStatus(message) {{
            statusLabel.textContent = message || "";
        }}

        function pickPortugueseVoice() {{
            const voices = window.speechSynthesis.getVoices();
            return voices.find((voice) => voice.lang.toLowerCase().startsWith("pt-br"))
                || voices.find((voice) => voice.lang.toLowerCase().startsWith("pt"))
                || null;
        }}

        function speakResponse() {{
            if (!("speechSynthesis" in window)) {{
                alert("Seu navegador nao suporta leitura por voz.");
                return;
            }}

            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(responseText);
            utterance.lang = "pt-BR";
            utterance.rate = 1;
            utterance.pitch = 1;
            utterance.onstart = () => setSpeechStatus("Lendo...");
            utterance.onend = () => setSpeechStatus("");
            utterance.onerror = () => setSpeechStatus("Nao foi possivel tocar o audio.");

            const selectedVoice = pickPortugueseVoice();
            if (selectedVoice) {{
                utterance.voice = selectedVoice;
            }}

            window.speechSynthesis.speak(utterance);
        }}

        function stopResponse() {{
            if ("speechSynthesis" in window) {{
                window.speechSynthesis.cancel();
                setSpeechStatus("");
            }}
        }}

        if ("speechSynthesis" in window) {{
            window.speechSynthesis.onvoiceschanged = pickPortugueseVoice;
        }}
        </script>

        <style>
        .speech-controls {{
            display: flex;
            gap: 8px;
            align-items: center;
            margin-top: 4px;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }}
        .speech-button {{
            border: 1px solid #d9d9d9;
            background: #ffffff;
            color: #2f2f2f;
            border-radius: 18px;
            padding: 7px 12px;
            font-size: 13px;
            line-height: 1;
            cursor: pointer;
            transition: background 140ms ease, box-shadow 140ms ease, transform 140ms ease;
        }}
        .speech-button:hover {{
            background: #f7f7f7;
            box-shadow: 0 8px 22px rgba(0, 0, 0, 0.08);
            transform: translateY(-1px);
        }}
        .speech-button.secondary {{
            color: #6f6f6f;
        }}
        .speech-status {{
            color: #6f6f6f;
            font-size: 12px;
        }}
        </style>
        """,
        height=44,
    )


def recent_chat_history(limit: int = 6) -> list[dict]:
    history = []
    for message in st.session_state.messages:
        if message.get("role") not in {"user", "assistant"}:
            continue
        history.append({"role": message["role"], "content": message.get("content", "")})
    return history[-limit:]


def render_message(message: dict) -> None:
    with st.chat_message(message["role"]):
        st.markdown(message["content"])

        if message["role"] == "assistant":
            render_speech_controls(message["content"], key=str(abs(hash(message["content"]))))

        source_details = valid_source_details(message.get("source_details"))
        if source_details:
            with st.popover("Consultar fonte"):
                st.markdown('<div class="source-panel">', unsafe_allow_html=True)
                for index, detail in enumerate(source_details, start=1):
                    render_source_detail(detail, index)
                st.markdown("</div>", unsafe_allow_html=True)


def render_left_rail() -> None:
    st.markdown('<div class="left-rail">', unsafe_allow_html=True)
    st.markdown(
        """
        <div class="side-brand">
            <span>Assistente Univille</span>
        </div>
        <div class="doc-row">RAG institucional ativo</div>
        """,
        unsafe_allow_html=True,
    )

    if st.button("Ocultar barra", use_container_width=True):
        st.session_state.left_rail_visible = False
        st.rerun()

    if st.button("Novo chat", use_container_width=True):
        st.session_state.messages = []
        st.rerun()

    st.text_input("Search chats", value="", placeholder="Buscar conversas", label_visibility="collapsed")

    st.markdown('<div class="side-section">Chat history</div>', unsafe_allow_html=True)
    if st.session_state.messages:
        user_questions = [m["content"] for m in st.session_state.messages if m.get("role") == "user"]
        for question_item in user_questions[-6:][::-1]:
            label = escape(question_item[:42] + ("..." if len(question_item) > 42 else ""))
            st.markdown(f'<div class="doc-row">{label}</div>', unsafe_allow_html=True)
    else:
        st.markdown('<div class="doc-row">Nenhuma conversa ainda</div>', unsafe_allow_html=True)

    st.markdown('<div class="side-section">Opcoes avancadas</div>', unsafe_allow_html=True)
    if st.session_state.admin_authenticated:
        render_admin_dashboard()
    else:
        st.caption("Acesso restrito ao administrador.")
        if not ADMIN_PASSWORD:
            st.warning("ADMIN_PASSWORD nao esta configurado no .env.")
        admin_username = st.text_input("Nome do admin")
        admin_password = st.text_input("Senha do admin", type="password")
        if st.button("Entrar no dashboard", use_container_width=True):
            if check_admin_credentials(admin_username, admin_password):
                st.session_state.admin_authenticated = True
                st.success("Acesso admin liberado.")
                st.rerun()
            st.error("Senha incorreta.")

    st.markdown("</div>", unsafe_allow_html=True)


if "messages" not in st.session_state:
    st.session_state.messages = []

if "admin_authenticated" not in st.session_state:
    st.session_state.admin_authenticated = False

if "left_rail_visible" not in st.session_state:
    st.session_state.left_rail_visible = True


if st.session_state.left_rail_visible:
    left_col, main_col = st.columns([0.27, 0.73], gap="large")
    with left_col:
        render_left_rail()
else:
    left_col, main_col = st.columns([0.08, 0.92], gap="large")
    with left_col:
        if st.button("Menu", use_container_width=True):
            st.session_state.left_rail_visible = True
            st.rerun()

with main_col:
    st.markdown(
        """
        <div class="topbar">
            <div class="topbar-title">Assistente Univille</div>
        </div>
        """,
        unsafe_allow_html=True,
    )

    if not st.session_state.messages:
        st.markdown(
            """
            <div class="empty-state">
                <h1>Oi, eu sou seu guia Univille.</h1>
                <p>Faça perguntas sobre editais, matrizes, regulamentos e documentos oficiais. Eu respondo com base no que foi indexado e deixo as fontes disponíveis quando houver evidência.</p>
                <div class="hero-actions">
                    <div class="hero-card">
                        <strong>Entenda editais</strong>
                        <span>Prazos, matrícula, vagas, cursos, valores e regras publicadas nos documentos.</span>
                    </div>
                    <div class="hero-card">
                        <strong>Consulte fontes</strong>
                        <span>Abra o trecho usado na resposta sem poluir a conversa com citações.</span>
                    </div>
                    <div class="hero-card">
                        <strong>Pergunte no seu ritmo</strong>
                        <span>O histórico curto ajuda a manter contexto entre perguntas relacionadas.</span>
                    </div>
                </div>
            </div>
            """,
            unsafe_allow_html=True,
        )

    for message in st.session_state.messages:
        render_message(message)

    question = st.chat_input("Pergunte algo sobre os documentos da Univille")

    if question:
        add_message("user", question)

        with st.chat_message("user"):
            st.markdown(question)

        with st.chat_message("assistant"):
            with st.spinner("Consultando os documentos..."):
                try:
                    result = answer_question(question, chat_history=recent_chat_history())
                    st.markdown(result["answer"])
                    render_speech_controls(result["answer"], key=f"latest-{len(st.session_state.messages)}")

                    source_details = valid_source_details(result.get("source_details"))
                    if source_details:
                        with st.popover("Consultar fonte"):
                            st.markdown('<div class="source-panel">', unsafe_allow_html=True)
                            for index, detail in enumerate(source_details, start=1):
                                render_source_detail(detail, index)
                            st.markdown("</div>", unsafe_allow_html=True)

                    add_message("assistant", result["answer"], source_details)
                except NotFoundError:
                    error_message = (
                        "Erro da Cohere: o modelo configurado nao foi encontrado. "
                        "Verifique COHERE_CHAT_MODEL no arquivo .env."
                    )
                    st.error(error_message)
                    add_message("assistant", error_message)
                except Exception as exc:
                    error_message = f"Erro ao responder: {exc}"
                    st.error(error_message)
                    add_message("assistant", error_message)
