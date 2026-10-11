import { useEffect, useState } from "react";
import { useAuiState } from "@assistant-ui/react";

const SHOW_AFTER_MS = 300;
const HINT_AFTER_MS = 10_000;

/** True while a run is active and no tool-call card is already showing its own pending state. */
function useIsThinking() {
  return useAuiState((s) => {
    if (!s.thread.isRunning) return false;
    const last = s.thread.messages[s.thread.messages.length - 1];
    if (last?.role !== "assistant") return true;
    return !last.content.some((part) => part.type === "tool-call" && part.result === undefined);
  });
}

/** Fills the silent gaps while the on-device model is deciding its next step. Delayed so quick replies don't flash it. */
export function ThinkingIndicator() {
  const thinking = useIsThinking();
  const [visible, setVisible] = useState(false);
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    if (!thinking) {
      setVisible(false);
      setSlow(false);
      return;
    }
    const showTimer = setTimeout(() => setVisible(true), SHOW_AFTER_MS);
    const hintTimer = setTimeout(() => setSlow(true), HINT_AFTER_MS);
    return () => {
      clearTimeout(showTimer);
      clearTimeout(hintTimer);
    };
  }, [thinking]);

  return (
    <div role="status" style={{ margin: "10px 0", fontSize: 14, color: "var(--ink-muted)" }}>
      {thinking && visible && (
        <div className="thinking-row">
          <span aria-hidden="true" className="status-dot status-dot--pending" style={{ background: "var(--curb-yellow)" }} />
          Thinking…
          {slow && <span className="thinking-hint"> The first answer on this device can take a while.</span>}
        </div>
      )}
    </div>
  );
}
