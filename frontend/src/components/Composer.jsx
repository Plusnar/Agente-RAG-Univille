import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";

export function Composer({ value, onChange, onSubmit, loading, onTypingChange }) {
  const [focused, setFocused] = useState(false);
  const idleTimer = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (focused && value.trim()) {
      onTypingChange?.(true);
      clearTimeout(idleTimer.current);
      idleTimer.current = setTimeout(() => onTypingChange?.(false), 1400);
    } else {
      onTypingChange?.(false);
    }
    return () => clearTimeout(idleTimer.current);
  }, [value, focused, onTypingChange]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
  }, [value]);

  function handleKeyDown(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      onSubmit(event);
    }
  }

  return (
    <form className={`composer ${focused ? "is-focused" : ""}`} onSubmit={onSubmit}>
      <textarea
        ref={textareaRef}
        rows={1}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder="Pergunte alguma coisa"
        aria-label="Sua pergunta"
      />
      <button
        className="composer-send"
        type="submit"
        disabled={loading || !value.trim()}
        aria-label="Enviar"
      >
        <Send size={18} />
      </button>
    </form>
  );
}
