import {
  AssistantRuntimeProvider,
  ComposerPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
} from "@assistant-ui/react";
import { useOpenDataChatRuntime } from "../../lib/ai/chatRuntime";
import { ToolCallCard } from "./ToolCallCard";

export function ChatPanel() {
  const runtime = useOpenDataChatRuntime();

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <ToolCallCard />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
          fontFamily: "sans-serif",
          fontSize: 14,
        }}
      >
        <ThreadPrimitive.Root style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
          <ThreadPrimitive.Viewport style={{ flex: 1, overflowY: "auto", padding: 12 }}>
            <ThreadPrimitive.Empty>
              <div style={{ color: "#868e96" }}>
                Ask about NYC 311 requests or the 2015 street tree census — e.g. "show me noise complaints in
                Queens" or "trees in Brooklyn with poor health".
              </div>
            </ThreadPrimitive.Empty>
            <ThreadPrimitive.Messages
              components={{
                UserMessage: () => (
                  <MessagePrimitive.Root>
                    <div style={{ textAlign: "right", margin: "8px 0" }}>
                      <span
                        style={{
                          display: "inline-block",
                          background: "#1971c2",
                          color: "white",
                          borderRadius: 12,
                          padding: "6px 12px",
                        }}
                      >
                        <MessagePrimitive.Parts />
                      </span>
                    </div>
                  </MessagePrimitive.Root>
                ),
                AssistantMessage: () => (
                  <MessagePrimitive.Root>
                    <div style={{ margin: "8px 0" }}>
                      <MessagePrimitive.Parts />
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
              gap: 6,
              padding: 12,
              borderTop: "1px solid #e9ecef",
            }}
          >
            <ComposerPrimitive.Input
              placeholder="Ask about 311 requests or street trees..."
              style={{ flex: 1, padding: "8px 10px", borderRadius: 6, border: "1px solid #ced4da" }}
            />
            <ComposerPrimitive.Send style={{ padding: "8px 14px", borderRadius: 6 }}>Send</ComposerPrimitive.Send>
          </ComposerPrimitive.Root>
        </ThreadPrimitive.Root>
      </div>
    </AssistantRuntimeProvider>
  );
}
