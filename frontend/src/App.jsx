import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { api } from "./api";
import { useAssistantController } from "./hooks/useAssistantController";
import { AssistantCharacter } from "./components/AssistantCharacter";
import { MessageBubble } from "./components/MessageBubble";
import { TypingIndicator } from "./components/TypingIndicator";
import { Composer } from "./components/Composer";
import { AdminModal } from "./components/AdminModal";
import "./styles.css";

const ADMIN_ENABLED = import.meta.env.VITE_ADMIN_ENABLED !== "false";
const STORAGE_KEY = "univ-chat-v1";

const STATUS_TEXT = {
  idle: "Pronto para ajudar você!",
  listening: "Estou te ouvindo...",
  thinking: "Consultando os documentos...",
  speaking: "Deixa eu te explicar...",
};

const STATUS_LABEL = {
  idle: "Online",
  listening: "Ouvindo",
  thinking: "Pensando",
  speaking: "Respondendo",
};

const PIZZA_REPLY = "Que vontade de um rodízio de pizza com tudo pago, hmmmm...";
const PIZZA_REGEX = /\bpizzas?\b/i;

const NOT_UNDERSTOOD_HINTS = ["nao entendi", "não entendi", "nao encontrei", "não encontrei"];
const PRESENTATION_ON = "/apresentacao";
const PRESENTATION_OFF = "/sair";

let msgSeq = 0;
const nextId = () => `m${Date.now().toString(36)}-${msgSeq++}`;

function isNotUnderstood(answer = "") {
  const lower = answer.toLowerCase();
  return NOT_UNDERSTOOD_HINTS.some((hint) => lower.includes(hint));
}

function friendlyError(err) {
  const message = (err && err.message) || "";
  if (/failed to fetch|networkerror|load failed|network request/i.test(message)) {
    return "Não consegui me conectar ao servidor agora. Verifique sua internet e tente novamente.";
  }
  return message || "Algo deu errado por aqui. Tente novamente em instantes.";
}

function loadStoredMessages() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((m) => ({ ...m, id: m.id || nextId(), animate: false }));
  } catch {
    return [];
  }
}

export default function App() {
  const [messages, setMessages] = useState(loadStoredMessages);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [aiTyping, setAiTyping] = useState(false);
  const [audioSpeaking, setAudioSpeaking] = useState(false);
  const [userTyping, setUserTyping] = useState(false);
  const [error, setError] = useState(false);
  const [assistantMinimized, setAssistantMinimized] = useState(false);

  const [documents, setDocuments] = useState([]);
  const [admin, setAdmin] = useState({ username: "", password: "", authenticated: false });
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [selectedDelete, setSelectedDelete] = useState([]);
  const [notice, setNotice] = useState("");
  const [adminOpen, setAdminOpen] = useState(false);
  const [pizzaActive, setPizzaActive] = useState(false);
  const [confused, setConfused] = useState(false);
  const [presentationMode, setPresentationMode] = useState(false);

  const bottomRef = useRef(null);
  const conversationRef = useRef(null);
  const pizzaTimer = useRef(null);
  const confusedTimer = useRef(null);

  const { status, emotion } = useAssistantController({ loading, aiTyping, audioSpeaking, userTyping, error, confused });

  useEffect(
    () => () => {
      clearTimeout(pizzaTimer.current);
      clearTimeout(confusedTimer.current);
    },
    []
  );

  useEffect(() => {
    try {
      const payload = messages.map(({ id, role, content, sources, isError, easterEgg }) => ({
        id,
        role,
        content,
        sources,
        isError,
        easterEgg,
      }));
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
    }
  }, [messages]);

  const flagConfused = useCallback(() => {
    setConfused(true);
    clearTimeout(confusedTimer.current);
    confusedTimer.current = setTimeout(() => setConfused(false), 4500);
  }, []);

  const forceScroll = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, []);

  const maybeScroll = useCallback(() => {
    const el = conversationRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 200;
    if (nearBottom) forceScroll();
  }, [forceScroll]);

  useEffect(() => {
    loadDocuments();
  }, []);

  useEffect(() => {
    forceScroll();
  }, [messages.length, loading, forceScroll]);

  async function loadDocuments() {
    try {
      const data = await api.listDocuments();
      setDocuments(data.documents || []);
    } catch {
    }
  }

  const performAsk = useCallback(
    async (clean, history) => {
      setError(false);
      setLoading(true);
      try {
        const data = await api.ask(clean, history);
        if (isNotUnderstood(data.answer)) flagConfused();
        setMessages((prev) => [
          ...prev,
          {
            id: nextId(),
            role: "assistant",
            content: data.answer,
            sources: data.source_details || [],
            animate: true,
          },
        ]);
      } catch (err) {
        setError(true);
        flagConfused();
        setMessages((prev) => [
          ...prev,
          {
            id: nextId(),
            role: "assistant",
            content: friendlyError(err),
            sources: [],
            animate: true,
            isError: true,
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [flagConfused]
  );

  const send = useCallback(
    (raw) => {
      const clean = raw.trim();
      if (!clean || loading) return;
      const command = clean.toLowerCase();

      if (command === PRESENTATION_ON) {
        setPresentationMode(true);
        setError(false);
        setQuestion("");
        setMessages((prev) => [
          ...prev,
          { id: nextId(), role: "user", content: clean },
          {
            id: nextId(),
            role: "assistant",
            content:
              "Modo apresentação ativado. Faça uma pergunta sobre os slides e, depois da resposta, use Mostrar slide para abrir a página usada como fonte.",
            sources: [],
            animate: true,
          },
        ]);
        return;
      }

      if (command === PRESENTATION_OFF) {
        setPresentationMode(false);
        setError(false);
        setQuestion("");
        setMessages((prev) => [
          ...prev,
          { id: nextId(), role: "user", content: clean },
          {
            id: nextId(),
            role: "assistant",
            content: "Modo apresentação encerrado. Voltamos ao chat normal.",
            sources: [],
            animate: true,
          },
        ]);
        return;
      }

      if (PIZZA_REGEX.test(clean)) {
        setMessages((prev) => [
          ...prev,
          { id: nextId(), role: "user", content: clean },
          {
            id: nextId(),
            role: "assistant",
            content: PIZZA_REPLY,
            sources: [],
            animate: true,
            easterEgg: "pizza",
          },
        ]);
        setQuestion("");
        setError(false);
        setPizzaActive(true);
        clearTimeout(pizzaTimer.current);
        pizzaTimer.current = setTimeout(() => setPizzaActive(false), 6000);
        return;
      }

      const history = messages.map(({ role, content }) => ({ role, content }));
      setMessages((prev) => [...prev, { id: nextId(), role: "user", content: clean }]);
      setQuestion("");
      performAsk(clean, history);
    },
    [loading, messages, performAsk]
  );

  const regenerateLast = useCallback(() => {
    if (loading) return;
    const lastUserIdx = messages.map((m) => m.role).lastIndexOf("user");
    if (lastUserIdx === -1) return;
    const lastUser = messages[lastUserIdx];
    const history = messages.slice(0, lastUserIdx).map(({ role, content }) => ({ role, content }));
    setMessages(messages.slice(0, lastUserIdx + 1));
    performAsk(lastUser.content, history);
  }, [loading, messages, performAsk]);

  function handleSubmit(event) {
    event.preventDefault();
    send(question);
  }

  async function uploadDocuments() {
    if (!selectedFiles.length) return;
    setNotice("Enviando documentos...");
    try {
      await api.upload(selectedFiles, admin);
      await loadDocuments();
      setSelectedFiles([]);
      setNotice("Documentos enviados. Agora clique em Indexar.");
    } catch (err) {
      setNotice(err.message);
    }
  }

  async function indexDocuments() {
    setNotice("Indexando. Pode levar alguns minutos em chaves trial da Cohere...");
    try {
      const result = await api.index(admin);
      await loadDocuments();
      setNotice(`${result.message} ${result.chunks} chunks indexados.`);
    } catch (err) {
      setNotice(err.message);
    }
  }

  async function deleteDocuments() {
    if (!selectedDelete.length) return;
    setNotice("Removendo e reindexando...");
    try {
      await api.deleteDocuments(selectedDelete, admin);
      setSelectedDelete([]);
      await loadDocuments();
      setNotice("Documentos removidos e consulta atualizada.");
    } catch (err) {
      setNotice(err.message);
    }
  }

  const lastAssistantIndex = messages.map((m) => m.role).lastIndexOf("assistant");
  const hasMessages = messages.length > 0;

  return (
    <main className={`assistant-app ${presentationMode ? "presentation-mode" : ""}`}>
      <aside className={`character-stage ${assistantMinimized ? "minimized" : ""}`}>
        <span className="assistant-mini-label">Assistente Univille</span>
        <div className={`speech-cloud status-${status}`}>
          {presentationMode ? "Modo apresentação ativo" : STATUS_TEXT[status]}
        </div>
        <div className="character-wrap">
          <AssistantCharacter
            status={status}
            emotion={emotion}
            pizza={pizzaActive}
            presentation={presentationMode}
          />
        </div>
        <div className="character-id">
          <strong>Assistente Univille</strong>
          <span className={`status-pill status-${status}`}>
            <i className="status-dot" />
            {STATUS_LABEL[status]}
          </span>
        </div>
        <button
          className="assistant-toggle"
          onClick={() => setAssistantMinimized((value) => !value)}
          aria-label={assistantMinimized ? "Mostrar assistente" : "Minimizar assistente"}
          aria-expanded={!assistantMinimized}
        >
          {assistantMinimized ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
        </button>
      </aside>

      <section className="chat-column">
        <div className="conversation" ref={conversationRef}>
          {messages.map((message, index) => (
            <MessageBubble
              key={message.id}
              message={message}
              animate={message.animate && index === lastAssistantIndex}
              isLast={index === messages.length - 1}
              onRegenerate={regenerateLast}
              onTypingChange={setAiTyping}
              onSpeechChange={setAudioSpeaking}
              onTick={maybeScroll}
              presentationMode={presentationMode}
            />
          ))}

          {loading && <TypingIndicator />}
          <div ref={bottomRef} />
        </div>

        <div className="composer-dock">
          <Composer
            value={question}
            onChange={setQuestion}
            onSubmit={handleSubmit}
            loading={loading}
            onTypingChange={setUserTyping}
          />
        </div>
      </section>

      {ADMIN_ENABLED && adminOpen && (
        <AdminModal
          onClose={() => setAdminOpen(false)}
          admin={admin}
          setAdmin={setAdmin}
          notice={notice}
          documents={documents}
          selectedFiles={selectedFiles}
          setSelectedFiles={setSelectedFiles}
          selectedDelete={selectedDelete}
          setSelectedDelete={setSelectedDelete}
          onUpload={uploadDocuments}
          onIndex={indexDocuments}
          onDelete={deleteDocuments}
        />
      )}
    </main>
  );
}
