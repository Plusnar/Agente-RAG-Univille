import { useEffect, useRef, useState } from "react";
import { Check, Copy, FileText, MonitorPlay, RefreshCw, Volume2, VolumeX } from "lucide-react";
import { useTypewriter } from "../hooks/useTypewriter";
import { SourcesModal } from "./SourcesModal";
import { SlideModal } from "./SlideModal";

function renderInline(text, keyPrefix) {
  const nodes = [];
  const regex = /(\*\*([^*]+)\*\*|`([^`]+)`|\*([^*]+)\*|_([^_]+)_)/g;
  let last = 0;
  let match;
  let key = 0;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    if (match[2] !== undefined) {
      nodes.push(<strong key={`${keyPrefix}-b${key++}`}>{match[2]}</strong>);
    } else if (match[3] !== undefined) {
      nodes.push(<code key={`${keyPrefix}-c${key++}`}>{match[3]}</code>);
    } else if (match[4] !== undefined) {
      nodes.push(<em key={`${keyPrefix}-i${key++}`}>{match[4]}</em>);
    } else if (match[5] !== undefined) {
      nodes.push(<em key={`${keyPrefix}-u${key++}`}>{match[5]}</em>);
    }
    last = regex.lastIndex;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

function renderMarkdown(text) {
  const lines = String(text).split("\n");
  const blocks = [];
  let list = null;
  let listType = null;
  let para = [];

  const flushPara = () => {
    if (para.length) {
      blocks.push({ type: "p", lines: para });
      para = [];
    }
  };
  const flushList = () => {
    if (list) {
      blocks.push({ type: listType, items: list });
      list = null;
      listType = null;
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();
    const ulMatch = /^[-*]\s+(.*)/.exec(trimmed);
    const olMatch = /^\d+\.\s+(.*)/.exec(trimmed);
    if (ulMatch) {
      flushPara();
      if (listType !== "ul") {
        flushList();
        listType = "ul";
        list = [];
      }
      list.push(ulMatch[1]);
    } else if (olMatch) {
      flushPara();
      if (listType !== "ol") {
        flushList();
        listType = "ol";
        list = [];
      }
      list.push(olMatch[1]);
    } else if (trimmed === "") {
      flushPara();
      flushList();
    } else {
      flushList();
      para.push(line);
    }
  }
  flushPara();
  flushList();

  return blocks.map((block, index) => {
    if (block.type === "ul") {
      return (
        <ul key={`ul${index}`}>
          {block.items.map((item, i) => (
            <li key={i}>{renderInline(item, `ul${index}-${i}`)}</li>
          ))}
        </ul>
      );
    }
    if (block.type === "ol") {
      return (
        <ol key={`ol${index}`}>
          {block.items.map((item, i) => (
            <li key={i}>{renderInline(item, `ol${index}-${i}`)}</li>
          ))}
        </ol>
      );
    }
    return (
      <p key={`p${index}`}>
        {block.lines.map((line, i) => (
          <span key={i}>
            {renderInline(line, `p${index}-${i}`)}
            {i < block.lines.length - 1 ? <br /> : null}
          </span>
        ))}
      </p>
    );
  });
}

function getSpeechText(text) {
  return String(text || "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/\[(.*?)\]\((.*?)\)/g, "$1")
    .replace(/#{1,6}\s/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function getPortugueseVoice() {
  const voices = window.speechSynthesis?.getVoices?.() || [];
  const masculineVoicePattern = /daniel|antonio|ricardo|felipe|male|masculino|homem/i;
  return (
    voices.find(
      (voice) => voice.lang === "pt-BR" && masculineVoicePattern.test(voice.name)
    ) ||
    voices.find(
      (voice) => voice.lang?.startsWith("pt") && masculineVoicePattern.test(voice.name)
    ) ||
    voices.find((voice) => voice.lang?.toLowerCase() === "pt-br") ||
    voices.find((voice) => voice.lang?.toLowerCase().startsWith("pt")) ||
    null
  );
}

export function MessageBubble({
  message,
  animate = false,
  isLast = false,
  onRegenerate,
  onTypingChange,
  onSpeechChange,
  onTick,
  presentationMode = false,
}) {
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [slideSource, setSlideSource] = useState(null);
  const [copied, setCopied] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const speakingRef = useRef(false);
  const speechSupported =
    typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
  const isAssistant = message.role === "assistant";
  const validSources = (message.sources || []).filter((source) =>
    String(source.excerpt || "").trim()
  );

  const { text, done } = useTypewriter(message.content, {
    enabled: isAssistant && animate,
    onTick,
  });

  useEffect(() => {
    if (!isAssistant || !animate) return;
    onTypingChange?.(!done);
    if (done) onTypingChange?.(false);
  }, [isAssistant, animate, done, onTypingChange]);

  useEffect(() => {
    function stopWhenAnotherMessageStarts(event) {
      if (event.detail !== message.id) {
        setSpeaking(false);
        if (speakingRef.current) onSpeechChange?.(false);
      }
    }

    window.addEventListener("univille-assistant-speech-start", stopWhenAnotherMessageStarts);
    return () => {
      window.removeEventListener("univille-assistant-speech-start", stopWhenAnotherMessageStarts);
    };
  }, [message.id, onSpeechChange]);

  useEffect(() => {
    speakingRef.current = speaking;
    onSpeechChange?.(speaking);
  }, [speaking, onSpeechChange]);

  useEffect(() => {
    return () => {
      if (speakingRef.current) {
        onSpeechChange?.(false);
        window.speechSynthesis?.cancel();
      }
    };
  }, [onSpeechChange]);

  const display = isAssistant ? text : message.content;

  function copyToClipboard() {
    navigator.clipboard
      ?.writeText(message.content)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      })
      .catch(() => {});
  }

  function toggleSpeech() {
    if (!speechSupported) return;

    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      onSpeechChange?.(false);
      return;
    }

    const speechText = getSpeechText(message.content);
    if (!speechText) return;

    window.speechSynthesis.cancel();
    window.dispatchEvent(new CustomEvent("univille-assistant-speech-start", { detail: message.id }));

    const utterance = new SpeechSynthesisUtterance(speechText);
    utterance.lang = "pt-BR";
    utterance.rate = 1.15;
    utterance.pitch = 0.85;
    utterance.volume = 1;
    utterance.voice = getPortugueseVoice();
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);

    setSpeaking(true);
    window.speechSynthesis.speak(utterance);
  }

  const showActions = isAssistant && (done || !animate);
  const primarySlideSource = validSources.find((source) => source.file_type === "pdf" && source.page);

  return (
    <div className={`msg-row ${message.role}`}>
      <div className={`bubble ${message.role} ${message.isError ? "is-error" : ""}`}>
        <div className="bubble-content">
          {isAssistant ? renderMarkdown(display) : <p>{display}</p>}
          {isAssistant && animate && !done && <span className="caret" />}
        </div>

        {showActions && (
          <div className="bubble-actions">
            {speechSupported && !message.isError && (
              <button
                type="button"
                className={`bubble-action-speech ${speaking ? "is-speaking" : ""}`}
                onClick={toggleSpeech}
                aria-label={speaking ? "Parar leitura da resposta" : "Ouvir resposta em voz alta"}
                title={speaking ? "Parar leitura" : "Ouvir resposta"}
              >
                {speaking ? <VolumeX size={15} /> : <Volume2 size={15} />}
                {speaking ? "Parar" : "Ouvir"}
              </button>
            )}
            {!!validSources.length && (
              <button onClick={() => setSourcesOpen(true)}>
                <FileText size={15} /> Consultar fonte
              </button>
            )}
            {presentationMode && primarySlideSource && (
              <button type="button" className="bubble-action-slide" onClick={() => setSlideSource(primarySlideSource)}>
                <MonitorPlay size={15} /> Mostrar slide
              </button>
            )}
            {!message.isError && (
              <button type="button" className="bubble-action-copy" onClick={copyToClipboard}>
                {copied ? <Check size={15} /> : <Copy size={15} />}
                {copied ? "Copiado" : "Copiar"}
              </button>
            )}
            {isLast && message.isError && (
              <button type="button" className="bubble-action-retry-error" onClick={onRegenerate}>
                <RefreshCw size={15} /> Tentar novamente
              </button>
            )}
          </div>
        )}
      </div>
      {sourcesOpen && (
        <SourcesModal
          sources={validSources}
          onClose={() => setSourcesOpen(false)}
          presentationMode={presentationMode}
          onShowSlide={setSlideSource}
        />
      )}
      {slideSource && (
        <SlideModal source={slideSource} onClose={() => setSlideSource(null)} />
      )}
    </div>
  );
}
