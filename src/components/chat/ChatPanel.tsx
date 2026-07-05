import { useMemo } from "react";
import {
  AssistantRuntimeProvider,
  ComposerPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
} from "@assistant-ui/react";
import { MarkdownTextPrimitive } from "@assistant-ui/react-markdown";
import { useOpenDataChatRuntime } from "../../lib/ai/chatRuntime";
import { datasets } from "../../config/datasets";
import { DatasetDetailsCard } from "./DatasetDetailsCard";
import { GeocodeCard } from "./GeocodeCard";
import { ArcGisToolCallCard, ToolCallCard } from "./ToolCallCard";

const MarkdownText = () => <MarkdownTextPrimitive />;

const SUGGESTION_COUNT = 4;

function pickRandomSuggestions(): string[] {
  const shuffledDatasets = [...datasets].sort(() => Math.random() - 0.5);
  return shuffledDatasets.slice(0, SUGGESTION_COUNT).map((dataset) => {
    const exemplars = dataset.exemplars;
    return exemplars[Math.floor(Math.random() * exemplars.length)].question;
  });
}

export function ChatPanel() {
  const runtime = useOpenDataChatRuntime();
  const suggestions = useMemo(() => pickRandomSuggestions(), []);

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <ToolCallCard />
      <ArcGisToolCallCard />
      <DatasetDetailsCard />
      <GeocodeCard />
      <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "var(--paper-raised)" }}>
        <ThreadPrimitive.Root style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
          <ThreadPrimitive.Viewport style={{ flex: 1, overflowY: "auto", padding: 16 }}>
            <ThreadPrimitive.Empty>
              <div>
                <div className="label" style={{ color: "var(--sign-green)", fontSize: 12, marginBottom: 8 }}>
                  Ask the map
                </div>
                <p style={{ color: "var(--ink-muted)", fontSize: 14, lineHeight: 1.6, margin: "0 0 10px" }}>Try:</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {suggestions.map((question) => (
                    <ThreadPrimitive.Suggestion key={question} prompt={question} send asChild>
                      <button
                        type="button"
                        style={{
                          textAlign: "left",
                          background: "none",
                          border: "1px solid var(--line)",
                          borderRadius: "var(--radius-lg)",
                          padding: "8px 12px",
                          fontSize: 14,
                          lineHeight: 1.5,
                          color: "var(--ink)",
                          cursor: "pointer",
                        }}
                      >
                        {question}
                      </button>
                    </ThreadPrimitive.Suggestion>
                  ))}
                </div>
              </div>
            </ThreadPrimitive.Empty>
            <ThreadPrimitive.Messages
              components={{
                UserMessage: () => (
                  <MessagePrimitive.Root>
                    <div style={{ textAlign: "right", margin: "10px 0" }}>
                      <span
                        style={{
                          display: "inline-block",
                          background: "var(--sign-green)",
                          color: "white",
                          borderRadius: "var(--radius-lg) var(--radius-lg) 2px var(--radius-lg)",
                          padding: "8px 14px",
                          fontSize: 14,
                          textAlign: "left",
                          maxWidth: "88%",
                        }}
                      >
                        <MessagePrimitive.Parts />
                      </span>
                    </div>
                  </MessagePrimitive.Root>
                ),
                AssistantMessage: () => (
                  <MessagePrimitive.Root>
                    <div style={{ margin: "10px 0", fontSize: 14, lineHeight: 1.6, color: "var(--ink)" }}>
                      <MessagePrimitive.Parts components={{ Text: MarkdownText }} />
                      <MessagePrimitive.Error />
                    </div>
                  </MessagePrimitive.Root>
                ),
              }}
            />
          </ThreadPrimitive.Viewport>
          <ComposerPrimitive.Root
            style={{
              display: "flex",
              gap: 8,
              padding: 14,
              borderTop: "1px solid var(--line)",
            }}
          >
            <ComposerPrimitive.Input
              placeholder="Ask about 311 requests or street trees..."
              className="field-input"
              style={{ flex: 1, resize: "none" }}
            />
            <ComposerPrimitive.Send className="btn btn-primary">Send</ComposerPrimitive.Send>
          </ComposerPrimitive.Root>
        </ThreadPrimitive.Root>
      </div>
    </AssistantRuntimeProvider>
  );
}
