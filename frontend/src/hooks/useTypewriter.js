import { useEffect, useRef, useState } from "react";

export function useTypewriter(fullText, { enabled = true, speed = 14, chunk = 2, onTick } = {}) {
  const [text, setText] = useState(enabled ? "" : fullText);
  const [done, setDone] = useState(!enabled);
  const indexRef = useRef(0);
  const tickRef = useRef(onTick);
  tickRef.current = onTick;

  useEffect(() => {
    if (!enabled) {
      setText(fullText);
      setDone(true);
      return undefined;
    }

    setText("");
    setDone(false);
    indexRef.current = 0;

    const timer = setInterval(() => {
      indexRef.current = Math.min(indexRef.current + chunk, fullText.length);
      setText(fullText.slice(0, indexRef.current));
      tickRef.current?.();
      if (indexRef.current >= fullText.length) {
        clearInterval(timer);
        setDone(true);
      }
    }, speed);

    return () => clearInterval(timer);
  }, [fullText, enabled, speed, chunk]);

  return { text, done };
}
