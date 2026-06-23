import { useMemo } from "react";

export function useAssistantController({ loading, aiTyping, userTyping, error, confused }) {
  return useMemo(() => {
    let status = "idle";
    if (loading) status = "thinking";
    else if (aiTyping) status = "speaking";
    else if (userTyping) status = "listening";

    let emotion = "neutral";
    if (error || confused) emotion = "confused";
    else if (loading) emotion = "thinking";
    else if (status === "speaking" || status === "listening") emotion = "happy";

    return { status, emotion };
  }, [loading, aiTyping, userTyping, error, confused]);
}
