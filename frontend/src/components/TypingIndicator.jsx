export function TypingIndicator() {
  return (
    <div className="msg-row assistant">
      <div className="bubble assistant typing-bubble" aria-label="Assistente está digitando">
        <span className="dot" />
        <span className="dot" />
        <span className="dot" />
      </div>
    </div>
  );
}
