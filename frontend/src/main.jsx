import React from "react";
import { createRoot } from "react-dom/client";
import {
  BookOpen,
  Bot,
  ChevronRight,
  FileText,
  Home,
  Lock,
  LogOut,
  MessageCircle,
  Mic2,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Send,
  Trash2,
  Upload,
  Volume2,
  X,
} from "lucide-react";
import "./styles.css";

const API_BASE = import.meta.env.VITE_API_BASE || "";

function App() {
  const [railOpen, setRailOpen] = React.useState(true);
  const [messages, setMessages] = React.useState([]);
  const [question, setQuestion] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [documents, setDocuments] = React.useState([]);
  const [admin, setAdmin] = React.useState({ username: "", password: "", authenticated: false });
  const [selectedFiles, setSelectedFiles] = React.useState([]);
  const [selectedDelete, setSelectedDelete] = React.useState([]);
  const [notice, setNotice] = React.useState("");
  const [adminOpen, setAdminOpen] = React.useState(false);

  React.useEffect(() => {
    loadDocuments();
  }, []);

  async function api(path, options = {}) {
    const response = await fetch(`${API_BASE}${path}`, options);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.detail || "Erro inesperado.");
    return data;
  }

  async function loadDocuments() {
    const data = await api("/api/documents");
    setDocuments(data.documents || []);
  }

  function adminHeaders() {
    return {
      "X-Admin-Username": admin.username,
      "X-Admin-Password": admin.password,
    };
  }

  async function sendQuestion(event) {
    event.preventDefault();
    const clean = question.trim();
    if (!clean || loading) return;

    const userMessage = { role: "user", content: clean };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setQuestion("");
    setLoading(true);

    try {
      const data = await api("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: clean,
          history: messages.slice(-6).map(({ role, content }) => ({ role, content })),
        }),
      });
      setMessages([...nextMessages, { role: "assistant", content: data.answer, sources: data.source_details || [] }]);
    } catch (error) {
      setMessages([...nextMessages, { role: "assistant", content: error.message, sources: [] }]);
    } finally {
      setLoading(false);
    }
  }

  async function uploadDocuments() {
    if (!selectedFiles.length) return;
    const body = new FormData();
    selectedFiles.forEach((file) => body.append("files", file));

    setNotice("Enviando documentos...");
    try {
      await api("/api/admin/upload", { method: "POST", headers: adminHeaders(), body });
      await loadDocuments();
      setSelectedFiles([]);
      setNotice("Documentos enviados. Agora clique em Indexar.");
    } catch (error) {
      setNotice(error.message);
    }
  }

  async function indexDocuments() {
    setNotice("Indexando. Isso pode levar alguns minutos em chaves trial da Cohere...");
    try {
      const result = await api("/api/admin/index", { method: "POST", headers: adminHeaders() });
      await loadDocuments();
      setNotice(`${result.message} ${result.chunks} chunks indexados.`);
    } catch (error) {
      setNotice(error.message);
    }
  }

  async function deleteDocuments() {
    if (!selectedDelete.length) return;
    setNotice("Removendo e reindexando...");
    try {
      await api("/api/admin/documents", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", ...adminHeaders() },
        body: JSON.stringify({ file_names: selectedDelete }),
      });
      setSelectedDelete([]);
      await loadDocuments();
      setNotice("Documentos removidos e consulta atualizada.");
    } catch (error) {
      setNotice(error.message);
    }
  }

  function speak(text) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "pt-BR";
    const voice = window.speechSynthesis
      .getVoices()
      .find((item) => item.lang.toLowerCase().startsWith("pt"));
    if (voice) utterance.voice = voice;
    window.speechSynthesis.speak(utterance);
  }

  return (
    <main className="app-shell simple-shell">
      <button className="admin-trigger" onClick={() => setAdminOpen(true)} aria-label="Enviar documentos">
        <Upload size={19} />
      </button>

      <button className="new-chat-trigger" onClick={() => setMessages([])} aria-label="Limpar conversa">
        <X size={16} />
      </button>

      <section className={`simple-main ${messages.length ? "has-messages" : ""}`}>
        {!messages.length && (
          <div className="simple-welcome">
            <h1>Ei, tudo pronto para começar?</h1>
            <h1 className="welcome-title-new">Oláaaaa! Sou o assistente da Univille. Como posso ajudar você?</h1>
          </div>
        )}

        {!!messages.length && (
          <div className="simple-conversation">
            {messages.map((message, index) => (
              <MessageBubble key={index} message={message} speak={speak} />
            ))}
            {loading && <div className="bubble assistant">Consultando os documentos...</div>}
          </div>
        )}

        <div className="simple-composer-row no-mascot">
          <form className="simple-input-row" onSubmit={sendQuestion}>
            <input value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Pergunte alguma coisa" />
            <button className="send-mini" type="submit" disabled={loading} aria-label="Enviar pergunta"><Send size={18} /></button>
          </form>
        </div>

      </section>

      {adminOpen && (
        <div className="modal-backdrop admin-backdrop" onClick={() => setAdminOpen(false)}>
          <div className="admin-modal" onClick={(event) => event.stopPropagation()}>
            <button className="close" onClick={() => setAdminOpen(false)}><X size={18} /></button>
            <div className="admin-modal-title">
              <Lock size={17} />
              <div>
                <strong>Documentos do assistente</strong>
                <span>Login admin para enviar, indexar ou remover arquivos.</span>
              </div>
            </div>

            {!admin.authenticated ? (
              <div className="admin-login">
                <input placeholder="Nome" value={admin.username} onChange={(e) => setAdmin({ ...admin, username: e.target.value })} />
                <input placeholder="Senha" type="password" value={admin.password} onChange={(e) => setAdmin({ ...admin, password: e.target.value })} />
                <button className="primary" onClick={() => setAdmin({ ...admin, authenticated: admin.username === "admin" && admin.password === "admin123456" })}>Entrar</button>
              </div>
            ) : (
              <AdminPanel
                documents={documents}
                selectedDelete={selectedDelete}
                setSelectedDelete={setSelectedDelete}
                selectedFiles={selectedFiles}
                setSelectedFiles={setSelectedFiles}
                uploadDocuments={uploadDocuments}
                indexDocuments={indexDocuments}
                deleteDocuments={deleteDocuments}
                logout={() => setAdmin({ username: "", password: "", authenticated: false })}
              />
            )}
            {notice && <div className="notice">{notice}</div>}
          </div>
        </div>
      )}
    </main>
  );

  return (
    <main className="app-shell">
      {railOpen ? (
        <aside className="sidebar">
          <div className="brand">
            <div className="brand-mark">U</div>
            <div>
              <span>Universidade</span>
              <strong>Univille</strong>
            </div>
          </div>

          <button className="nav-item active"><Home size={20} />Início</button>
          <button className="nav-item"><MessageCircle size={20} />Conversas</button>
          <button className="nav-item"><BookOpen size={20} />Guia institucional</button>

          <section className="panel compact">
            <div className="panel-title"><Search size={16} /> Histórico</div>
            {messages.filter((m) => m.role === "user").slice(-5).reverse().map((item, index) => (
              <div className="history-item" key={index}>{item.content}</div>
            ))}
            {!messages.some((m) => m.role === "user") && <div className="muted">Nenhuma conversa ainda.</div>}
          </section>

          <section className="panel">
            <div className="panel-title"><Lock size={16} /> Admin</div>
            {!admin.authenticated ? (
              <>
                <input placeholder="Nome" value={admin.username} onChange={(e) => setAdmin({ ...admin, username: e.target.value })} />
                <input placeholder="Senha" type="password" value={admin.password} onChange={(e) => setAdmin({ ...admin, password: e.target.value })} />
                <button className="primary" onClick={() => setAdmin({ ...admin, authenticated: admin.username === "admin" && admin.password === "admin123456" })}>Entrar</button>
              </>
            ) : (
              <AdminPanel
                documents={documents}
                selectedDelete={selectedDelete}
                setSelectedDelete={setSelectedDelete}
                selectedFiles={selectedFiles}
                setSelectedFiles={setSelectedFiles}
                uploadDocuments={uploadDocuments}
                indexDocuments={indexDocuments}
                deleteDocuments={deleteDocuments}
                logout={() => setAdmin({ username: "", password: "", authenticated: false })}
              />
            )}
            {notice && <div className="notice">{notice}</div>}
          </section>

          <button className="profile" onClick={() => setRailOpen(false)}>
            <span>AU</span>
            <div><strong>Assistente Univille</strong><small>Ocultar painel</small></div>
            <PanelLeftClose size={18} />
          </button>
        </aside>
      ) : (
        <button className="rail-toggle" onClick={() => setRailOpen(true)}><PanelLeftOpen size={20} /></button>
      )}

      <section className="main-area">
        {!messages.length && <Hero />}

        <div className={`chat-card ${messages.length ? "active-chat" : ""}`}>
          <div className="chat-card-header">
            <div className="assistant-status"><Bot size={20} /> Assistente de IA <span>Online</span></div>
          </div>

          <div className="conversation">
            {!messages.length && (
              <div className="empty-chat">
                <strong>Pronto para consultar seus documentos.</strong>
                <p>Digite uma pergunta abaixo. Eu respondo somente com base nos arquivos indexados.</p>
              </div>
            )}
            {messages.map((message, index) => (
              <MessageBubble key={index} message={message} speak={speak} />
            ))}
            {loading && <div className="bubble assistant">Consultando os documentos...</div>}
          </div>

          <div className="suggestions">
            <span>Documentos de matrícula</span>
            <span>Calendário acadêmico</span>
            <span>Editais e bolsas</span>
          </div>

          <div className="composer-mascot">
            <AssistantMascot compact talking={loading} />
          </div>

          <form className="input-row" onSubmit={sendQuestion}>
            <input value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Digite sua pergunta..." />
            <button type="submit" disabled={loading}><Send size={20} /></button>
          </form>
          <p className="fine-print">O assistente pode cometer erros. Sempre confirme informações importantes nas fontes oficiais.</p>
        </div>
      </section>
    </main>
  );
}

function AdminPanel({ documents, selectedDelete, setSelectedDelete, selectedFiles, setSelectedFiles, uploadDocuments, indexDocuments, deleteDocuments, logout }) {
  function toggleDelete(name) {
    setSelectedDelete(selectedDelete.includes(name)
      ? selectedDelete.filter((item) => item !== name)
      : [...selectedDelete, name]);
  }

  return (
    <>
      <label className="upload-box">
        <Upload size={18} />
        <span>{selectedFiles.length ? `${selectedFiles.length} arquivo(s)` : "Selecionar PDFs/TXT"}</span>
        <input type="file" accept=".pdf,.txt" multiple onChange={(event) => setSelectedFiles(Array.from(event.target.files || []))} />
      </label>
      <button className="primary" onClick={uploadDocuments}>Salvar documentos</button>
      <button onClick={indexDocuments}>Indexar documentos</button>
      <div className="document-list">
        {documents.map((document) => (
          <button key={document.name} className={selectedDelete.includes(document.name) ? "doc selected" : "doc"} onClick={() => toggleDelete(document.name)}>
            <FileText size={14} /> {document.name}
          </button>
        ))}
      </div>
      <button className="danger" onClick={deleteDocuments} disabled={!selectedDelete.length}><Trash2 size={16} /> Remover selecionados</button>
      <button onClick={logout}><LogOut size={16} /> Sair</button>
    </>
  );
}

function Hero() {
  return (
    <header className="hero">
      <div className="hero-copy">
        <h1>Olá! Eu sou o Assistente Univille.</h1>
        <p>Sou o assistente de IA da universidade. Pergunte sobre editais, matrículas, regulamentos e documentos oficiais indexados.</p>
      </div>
      <div className="hero-mascot">
        <AssistantMascot />
      </div>
    </header>
  );
}

function AssistantMascot({ talking = false, compact = false }) {
  const className = `assistant-mascot ${compact ? "compact" : ""} ${talking ? "is-talking" : ""}`;

  return (
    <svg className={className} viewBox="0 0 420 520" role="img" aria-label="Mascote do Assistente Univille">
      <defs>
        <linearGradient id="bookGreen" x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" stopColor="#7de021" />
          <stop offset="48%" stopColor="#1eb333" />
          <stop offset="100%" stopColor="#006b38" />
        </linearGradient>
        <linearGradient id="bookDarkGreen" x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" stopColor="#0a8d40" />
          <stop offset="100%" stopColor="#004c2d" />
        </linearGradient>
        <linearGradient id="pageCream" x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" stopColor="#fff2c4" />
          <stop offset="60%" stopColor="#f3d78c" />
          <stop offset="100%" stopColor="#d9a94f" />
        </linearGradient>
        <linearGradient id="capWhite" x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="58%" stopColor="#f6f1e9" />
          <stop offset="100%" stopColor="#ded5cb" />
        </linearGradient>
        <radialGradient id="eyeGlow" cx="42%" cy="35%" r="68%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="28%" stopColor="#c9fff0" />
          <stop offset="62%" stopColor="#13c63a" />
          <stop offset="100%" stopColor="#021611" />
        </radialGradient>
        <filter id="mascotShadow" x="-25%" y="-20%" width="150%" height="150%">
          <feDropShadow dx="0" dy="14" stdDeviation="12" floodColor="#0c351f" floodOpacity="0.22" />
        </filter>
        <filter id="softGlow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <g id="details" className="mascot-details">
        <ellipse className="ground-shadow" cx="210" cy="486" rx="108" ry="18" fill="#0a2e24" opacity="0.13" />
        <circle className="shine shine-one" cx="78" cy="184" r="6" fill="#9ce7ff" />
        <circle className="shine shine-two" cx="344" cy="150" r="4" fill="#b4f6ca" />
        <path className="shine shine-three" d="M357 252l7 12 13 3-13 5-7 12-6-12-13-5 13-3z" fill="#a6e9c7" opacity="0.8" />
      </g>

      <g id="legs" className="mascot-legs">
        <path d="M150 350h48l-4 92c-1 20-12 32-30 32s-29-12-31-32z" fill="#075534" stroke="#043a27" strokeWidth="5" />
        <path d="M222 350h48l17 92c3 19-8 32-27 32s-31-12-32-32z" fill="#075534" stroke="#043a27" strokeWidth="5" />
        <path d="M101 449c15-27 70-29 92-7 19 18 8 45-44 45-47 0-61-15-48-38z" fill="#07872c" stroke="#04451e" strokeWidth="5" />
        <path d="M226 442c22-22 76-20 92 7 13 23-1 38-48 38-52 0-63-27-44-45z" fill="#07872c" stroke="#04451e" strokeWidth="5" />
        <path d="M110 453c34 17 62 14 82 0" fill="none" stroke="#13b53f" strokeWidth="6" opacity="0.35" />
        <path d="M231 453c34 17 62 14 82 0" fill="none" stroke="#13b53f" strokeWidth="6" opacity="0.35" />
      </g>

      <g id="arms" className="mascot-arms">
        <g className="left-arm">
          <path d="M91 292c-42 1-69-26-80-56" fill="none" stroke="#075534" strokeWidth="24" strokeLinecap="round" />
          <path d="M27 207c-22 0-29 22-14 38 9 10 25 20 43 21 21 1 31-13 24-31-6-16-30-28-53-28z" fill="#fffdf8" stroke="#8b7a74" strokeWidth="4" />
          <path d="M34 205c-5-21 13-28 24-9l13 24" fill="none" stroke="#8b7a74" strokeWidth="4" strokeLinecap="round" />
          <path d="M14 217c-11-18 5-31 21-12l17 22" fill="none" stroke="#8b7a74" strokeWidth="4" strokeLinecap="round" />
          <path d="M8 236c-14-13-2-29 17-16l22 17" fill="none" stroke="#8b7a74" strokeWidth="4" strokeLinecap="round" />
        </g>
        <g className="right-arm">
          <path d="M329 292c42 1 69-26 80-56" fill="none" stroke="#075534" strokeWidth="24" strokeLinecap="round" />
          <path d="M393 207c22 0 29 22 14 38-9 10-25 20-43 21-21 1-31-13-24-31 6-16 30-28 53-28z" fill="#fffdf8" stroke="#8b7a74" strokeWidth="4" />
          <path d="M386 205c5-21-13-28-24-9l-13 24" fill="none" stroke="#8b7a74" strokeWidth="4" strokeLinecap="round" />
          <path d="M406 217c11-18-5-31-21-12l-17 22" fill="none" stroke="#8b7a74" strokeWidth="4" strokeLinecap="round" />
          <path d="M412 236c14-13 2-29-17-16l-22 17" fill="none" stroke="#8b7a74" strokeWidth="4" strokeLinecap="round" />
        </g>
      </g>

      <g id="body" className="mascot-body" filter="url(#mascotShadow)">
        <path d="M83 137c64-37 190-37 254 0 25 15 33 40 27 76l-23 143c-9 55-49 86-131 86S88 411 79 356L56 213c-6-36 2-61 27-76z" fill="url(#bookGreen)" stroke="#075b2c" strokeWidth="6" />
        <path d="M60 154c62-24 122-20 150 44 28-64 88-68 150-44l-16 48c-57-19-94-4-106 42v184h-56V244c-12-46-49-61-106-42z" fill="url(#pageCream)" stroke="#c99d52" strokeWidth="4" />
        <path d="M78 325c41 0 78 13 104 38v65c-59-5-96-29-104-86z" fill="url(#bookDarkGreen)" opacity="0.88" />
        <path d="M342 325c-41 0-78 13-104 38v65c59-5 96-29 104-86z" fill="url(#bookDarkGreen)" opacity="0.88" />
        <path d="M76 317c48 0 91 14 122 43h24c31-29 74-43 122-43" fill="none" stroke="url(#pageCream)" strokeWidth="24" strokeLinecap="round" />
        <path d="M210 200v235" fill="none" stroke="url(#pageCream)" strokeWidth="25" strokeLinecap="round" />
      </g>

      <g id="head" className="mascot-head">
        <path d="M97 122c7-72 51-105 114-105 64 0 108 33 114 105 15 4 23 14 20 28-3 15-17 23-36 20-54-9-142-9-198 0-19 3-33-5-36-20-3-14 6-24 22-28z" fill="url(#capWhite)" stroke="#8a786c" strokeWidth="4" />
        <path d="M78 139c34-26 231-26 264 0 4 23-14 39-48 34-52-8-116-8-168 0-34 5-52-11-48-34z" fill="#fffaf0" stroke="#cdbfb0" strokeWidth="4" />
        <path d="M160 71c4-22 14-35 33-34 18 1 28 14 26 38 11-16 27-22 51-16l-9 45c-26-6-44 0-52 21-9-22-28-30-58-26z" fill="#42cc12" stroke="#ffffff" strokeWidth="6" />
        <path d="M158 102c17-3 32 5 48 24-27 10-49 2-55-21z" fill="#006b38" />
        <path d="M212 125c11-22 27-31 55-23-9 24-30 33-56 24z" fill="#006b38" />
        <text x="210" y="149" textAnchor="middle" fontFamily="Inter, Arial, sans-serif" fontSize="28" fontWeight="800" fill="#075534">univille</text>
      </g>

      <g id="eyes" className="mascot-eyes">
        <path d="M112 221c7-17 30-24 53-17" fill="none" stroke="#071412" strokeWidth="12" strokeLinecap="round" />
        <path d="M255 204c23-7 46 0 53 17" fill="none" stroke="#071412" strokeWidth="12" strokeLinecap="round" />
        <g className="eye left-eye">
          <ellipse cx="147" cy="258" rx="39" ry="54" fill="#06110f" />
          <ellipse cx="152" cy="264" rx="27" ry="39" fill="url(#eyeGlow)" />
          <ellipse cx="162" cy="236" rx="16" ry="18" fill="#fff" />
          <circle cx="133" cy="247" r="6" fill="#fff" opacity="0.88" />
          <circle cx="172" cy="285" r="6" fill="#fff" opacity="0.78" />
          <ellipse className="eye-blink" cx="147" cy="258" rx="42" ry="56" fill="#1db333" />
        </g>
        <g className="eye right-eye">
          <ellipse cx="273" cy="258" rx="39" ry="54" fill="#06110f" />
          <ellipse cx="268" cy="264" rx="27" ry="39" fill="url(#eyeGlow)" />
          <ellipse cx="257" cy="236" rx="16" ry="18" fill="#fff" />
          <circle cx="287" cy="247" r="6" fill="#fff" opacity="0.88" />
          <circle cx="248" cy="285" r="6" fill="#fff" opacity="0.78" />
          <ellipse className="eye-blink" cx="273" cy="258" rx="42" ry="56" fill="#1db333" />
        </g>
      </g>

      <g id="details-face" className="mascot-face-details">
        <ellipse className="cheek left-cheek" cx="98" cy="298" rx="24" ry="13" fill="#ff7188" opacity="0.85" filter="url(#softGlow)" />
        <ellipse className="cheek right-cheek" cx="322" cy="298" rx="24" ry="13" fill="#ff7188" opacity="0.85" filter="url(#softGlow)" />
        <g id="mouth" className="mascot-mouth">
          <path className="mouth-cavity" d="M174 309c7-21 65-21 72 0 5 37-19 57-36 57s-41-20-36-57z" fill="#06110f" stroke="#03100d" strokeWidth="6" />
          <path className="mouth-teeth" d="M184 311c14 18 47 19 63 0-5 15-17 23-33 23-15 0-26-7-30-23z" fill="#fffdf7" />
          <path className="mouth-tongue" d="M185 352c14-16 42-17 57 0-9 12-18 17-30 17-12 0-20-5-27-17z" fill="#ff404d" />
        </g>
      </g>
    </svg>
  );
}

function BottomMascot() {
  return (
    <div className="walking-mascot-stage" aria-hidden="true">
      <svg className="walking-mascot" viewBox="0 0 360 470">
        <defs>
          <linearGradient id="wmGreen" x1="20%" x2="80%" y1="0%" y2="100%">
            <stop offset="0%" stopColor="#69d817" />
            <stop offset="55%" stopColor="#18a92c" />
            <stop offset="100%" stopColor="#006736" />
          </linearGradient>
          <linearGradient id="wmDarkGreen" x1="20%" x2="80%" y1="0%" y2="100%">
            <stop offset="0%" stopColor="#07863b" />
            <stop offset="100%" stopColor="#004527" />
          </linearGradient>
          <linearGradient id="wmCream" x1="12%" x2="90%" y1="0%" y2="100%">
            <stop offset="0%" stopColor="#fff2bd" />
            <stop offset="60%" stopColor="#f2d27d" />
            <stop offset="100%" stopColor="#c9943b" />
          </linearGradient>
          <linearGradient id="wmCap" x1="20%" x2="90%" y1="0%" y2="100%">
            <stop offset="0%" stopColor="#fff" />
            <stop offset="64%" stopColor="#f2f0eb" />
            <stop offset="100%" stopColor="#d8d2c9" />
          </linearGradient>
          <radialGradient id="wmEye" cx="45%" cy="34%" r="70%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="30%" stopColor="#dfffee" />
            <stop offset="62%" stopColor="#27c43a" />
            <stop offset="100%" stopColor="#001611" />
          </radialGradient>
          <filter id="wmShadow" x="-30%" y="-30%" width="160%" height="170%">
            <feDropShadow dx="0" dy="10" stdDeviation="8" floodColor="#0a281a" floodOpacity="0.24" />
          </filter>
          <filter id="wmSoft" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="2.6" />
          </filter>
        </defs>

        <g id="mascote-sombra">
          <ellipse cx="181" cy="442" rx="89" ry="15" fill="#062b1b" opacity="0.15" />
        </g>

        <g id="mascote-pernas" className="wm-legs">
          <g className="wm-leg wm-left-leg">
            <path d="M127 338l46 7-7 70c-2 17-13 26-31 23-16-3-24-14-22-30z" fill="#07552f" stroke="#04331e" strokeWidth="5" />
            <path d="M100 416c12-27 62-31 79-9 14 18 2 40-41 40-36 0-48-11-38-31z" fill="#02952c" stroke="#04331e" strokeWidth="5" />
            <path d="M105 425c24 13 50 13 75-1" fill="none" stroke="#30c246" strokeWidth="5" opacity="0.5" />
          </g>
          <g className="wm-leg wm-right-leg">
            <path d="M190 345l46-7 14 70c3 16-6 27-23 30-18 3-29-6-31-23z" fill="#07552f" stroke="#04331e" strokeWidth="5" />
            <path d="M185 407c17-22 67-18 79 9 10 20-2 31-38 31-43 0-55-22-41-40z" fill="#02952c" stroke="#04331e" strokeWidth="5" />
            <path d="M186 424c25 14 51 14 75 1" fill="none" stroke="#30c246" strokeWidth="5" opacity="0.5" />
          </g>
        </g>

        <g id="mascote-bracos" className="wm-arms">
          <g className="wm-arm wm-left-arm">
            <path d="M72 250c-31-2-53-24-62-54" fill="none" stroke="#07552f" strokeWidth="21" strokeLinecap="round" />
            <g id="mao-esquerda">
              <path d="M23 183c-18 2-22 21-9 36 11 13 28 21 45 17 19-5 25-23 11-37-10-10-26-17-47-16z" fill="#fffef9" stroke="#07331f" strokeWidth="4" />
              <path d="M29 180c-9-19 7-29 21-12l15 22" fill="none" stroke="#07331f" strokeWidth="4" strokeLinecap="round" />
              <path d="M13 192c-14-16-1-30 16-14l19 20" fill="none" stroke="#07331f" strokeWidth="4" strokeLinecap="round" />
              <path d="M10 212c-17-9-8-27 12-18l23 14" fill="none" stroke="#07331f" strokeWidth="4" strokeLinecap="round" />
              <path d="M64 195c14-14 30 2 17 22-6 9-15 15-27 18" fill="none" stroke="#07331f" strokeWidth="4" strokeLinecap="round" />
            </g>
          </g>
          <g className="wm-arm wm-right-arm">
            <path d="M288 250c31-2 53-24 62-54" fill="none" stroke="#07552f" strokeWidth="21" strokeLinecap="round" />
            <g id="mao-direita">
              <path d="M337 183c18 2 22 21 9 36-11 13-28 21-45 17-19-5-25-23-11-37 10-10 26-17 47-16z" fill="#fffef9" stroke="#07331f" strokeWidth="4" />
              <path d="M331 180c9-19-7-29-21-12l-15 22" fill="none" stroke="#07331f" strokeWidth="4" strokeLinecap="round" />
              <path d="M347 192c14-16 1-30-16-14l-19 20" fill="none" stroke="#07331f" strokeWidth="4" strokeLinecap="round" />
              <path d="M350 212c17-9 8-27-12-18l-23 14" fill="none" stroke="#07331f" strokeWidth="4" strokeLinecap="round" />
              <path d="M296 195c-14-14-30 2-17 22 6 9 15 15 27 18" fill="none" stroke="#07331f" strokeWidth="4" strokeLinecap="round" />
            </g>
          </g>
        </g>

        <g id="mascote-corpo" className="wm-body" filter="url(#wmShadow)">
          <path d="M69 88c58-35 163-35 222 0 22 14 29 35 24 66l-20 130c-9 58-45 91-115 91S74 342 65 284L45 154c-5-31 2-52 24-66z" fill="url(#wmGreen)" stroke="#06321f" strokeWidth="6" />
          <path d="M47 108c56-23 106-13 133 50 27-63 77-73 133-50l-11 51c-49-17-82-3-94 39v166h-56V198c-12-42-45-56-94-39z" fill="url(#wmCream)" stroke="#06321f" strokeWidth="5" />
          <path d="M68 278c37 1 67 13 86 38v45c-47-9-78-34-86-83z" fill="url(#wmDarkGreen)" opacity="0.92" />
          <path d="M292 278c-37 1-67 13-86 38v45c47-9 78-34 86-83z" fill="url(#wmDarkGreen)" opacity="0.92" />
          <path d="M67 270c43 0 78 12 102 39h22c24-27 59-39 102-39" fill="none" stroke="url(#wmCream)" strokeWidth="23" strokeLinecap="round" />
          <path d="M180 154v212" fill="none" stroke="url(#wmCream)" strokeWidth="25" strokeLinecap="round" />
          <path d="M70 105c72-18 146-18 220 0" fill="none" stroke="#70de18" strokeWidth="16" strokeLinecap="round" opacity="0.8" />
        </g>

        <g id="mascote-rosto" className="wm-face">
          <path d="M101 204c8-18 29-21 45-13" fill="none" stroke="#061811" strokeWidth="11" strokeLinecap="round" />
          <path d="M215 191c17-8 38-5 45 13" fill="none" stroke="#061811" strokeWidth="11" strokeLinecap="round" />
          <g id="olho-esquerdo" className="wm-eye">
            <ellipse cx="128" cy="238" rx="34" ry="49" fill="#03130e" />
            <ellipse cx="133" cy="246" rx="24" ry="35" fill="url(#wmEye)" />
            <ellipse cx="143" cy="217" rx="15" ry="17" fill="#fff" />
            <circle cx="116" cy="228" r="5" fill="#fff" />
            <circle cx="150" cy="267" r="6" fill="#fff" opacity="0.85" />
            <ellipse className="wm-blink" cx="128" cy="238" rx="36" ry="51" fill="#20aa2b" />
          </g>
          <g id="olho-direito" className="wm-eye">
            <ellipse cx="232" cy="238" rx="34" ry="49" fill="#03130e" />
            <ellipse cx="227" cy="246" rx="24" ry="35" fill="url(#wmEye)" />
            <ellipse cx="216" cy="217" rx="15" ry="17" fill="#fff" />
            <circle cx="244" cy="228" r="5" fill="#fff" />
            <circle cx="210" cy="267" r="6" fill="#fff" opacity="0.85" />
            <ellipse className="wm-blink" cx="232" cy="238" rx="36" ry="51" fill="#20aa2b" />
          </g>
          <ellipse cx="86" cy="268" rx="21" ry="12" fill="#ff6580" opacity="0.9" filter="url(#wmSoft)" />
          <ellipse cx="274" cy="268" rx="21" ry="12" fill="#ff6580" opacity="0.9" filter="url(#wmSoft)" />
          <g id="boca" className="wm-mouth">
            <path d="M143 282c11-19 63-19 74 0 7 32-13 54-37 54s-44-22-37-54z" fill="#03130e" stroke="#062018" strokeWidth="5" />
            <path d="M154 286c13 16 40 16 53 0-3 13-14 20-27 20s-23-7-26-20z" fill="#fffdf6" />
            <path d="M151 322c15-17 42-17 58 0-8 10-18 15-29 15-12 0-21-5-29-15z" fill="#ff3b48" />
          </g>
        </g>

        <g id="mascote-bone" className="wm-cap">
          <path d="M102 87c7-58 40-83 86-83s78 25 85 83c15 4 22 13 20 25-3 14-17 20-35 16-45-10-111-10-156 0-18 4-32-2-35-16-2-12 5-21 35-25z" fill="url(#wmCap)" stroke="#06321f" strokeWidth="5" />
          <path d="M76 102c38-22 177-22 216 0 4 22-11 36-39 31-43-8-103-8-146 0-28 5-43-9-31-31z" fill="#fffdf8" stroke="#9b9b9b" strokeWidth="3" />
          <path d="M156 48c4-18 14-29 30-28 17 1 24 11 24 30 10-13 24-18 43-12l-7 35c-23-5-38 1-45 18-7-18-24-25-49-21z" fill="#43c815" stroke="#fff" strokeWidth="5" />
          <path d="M154 73c18-2 31 5 43 19-23 8-39 3-45-17z" fill="#006736" />
          <path d="M202 92c10-18 24-24 45-19-8 19-24 25-45 20z" fill="#006736" />
          <text x="180" y="118" textAnchor="middle" fontFamily="Inter, Arial, sans-serif" fontWeight="850" fontSize="27" fill="#07552f">univille</text>
          <path d="M219 5c16 0 25 7 30 17" fill="none" stroke="#06321f" strokeWidth="5" strokeLinecap="round" />
        </g>
      </svg>
    </div>
  );
}

function MessageBubble({ message, speak }) {
  const [sourcesOpen, setSourcesOpen] = React.useState(false);
  const isAssistant = message.role === "assistant";
  const validSources = (message.sources || []).filter((source) => String(source.excerpt || "").trim());
  return (
    <div className={`message-line ${message.role}`}>
      <div className={`bubble ${message.role}`}>
        <p>{message.content}</p>
        {isAssistant && (
          <div className="message-actions">
            <button onClick={() => speak(message.content)}><Volume2 size={15} /> Ouvir</button>
            {!!validSources.length && <button onClick={() => setSourcesOpen(true)}><FileText size={15} /> Consultar fonte</button>}
          </div>
        )}
      </div>
      {sourcesOpen && (
        <div className="modal-backdrop" onClick={() => setSourcesOpen(false)}>
          <div className="source-modal" onClick={(event) => event.stopPropagation()}>
            <button className="close" onClick={() => setSourcesOpen(false)}><X size={18} /></button>
            <h3>Fontes consultadas</h3>
            {validSources.map((source, index) => (
              <article key={index}>
                <strong>{source.file_name}</strong>
                <small>Página {source.page || "não informada"} | Linhas {source.line_start || "?"} a {source.line_end || "?"}</small>
                <a className="source-link" href={`${API_BASE}/documents/${encodeURIComponent(source.file_name)}`} target="_blank" rel="noreferrer">
                  Abrir {source.file_type === "txt" ? "documento" : "PDF"}
                </a>
                <p>{source.excerpt}</p>
              </article>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
