import {
  convertToModelMessages,
  validateUIMessages,
  type Agent,
  type ChatTransport,
  type InferUITools,
  type ToolSet,
  type UIMessage,
} from "ai";
import { PIN_ATTACHMENT_NAME, formatPinAttachmentText, type PinAttachmentData } from "./pinAttachment";

/**
 * A DirectChatTransport lookalike (its agent/options fields are TS-private,
 * so subclassing can't reach them) that additionally converts the "pins"
 * data attachment into a text part before it reaches the model — AI SDK's
 * convertToModelMessages silently drops unhandled data-* parts otherwise.
 */
export class PinAwareChatTransport<
  TOOLS extends ToolSet = ToolSet,
  UI_MESSAGE extends UIMessage<unknown, never, InferUITools<TOOLS>> = UIMessage<unknown, never, InferUITools<TOOLS>>,
> implements ChatTransport<UI_MESSAGE>
{
  private readonly agent: Agent<never, TOOLS, never>;

  constructor({ agent }: { agent: Agent<never, TOOLS, never> }) {
    this.agent = agent;
  }

  async sendMessages({ messages, abortSignal }: Parameters<ChatTransport<UI_MESSAGE>["sendMessages"]>[0]) {
    // Cast: TOOLS is generic here, and the AI SDK's own ToolSet type isn't
    // self-assignable under strict structural checking of a generic bound.
    const validatedMessages = await validateUIMessages({ messages, tools: this.agent.tools as never });
    const modelMessages = await convertToModelMessages(validatedMessages, {
      tools: this.agent.tools as ToolSet,
      convertDataPart: (part) =>
        part.type === `data-${PIN_ATTACHMENT_NAME}` ? { type: "text", text: formatPinAttachmentText(part.data as PinAttachmentData) } : undefined,
    });

    const result = await this.agent.stream({ prompt: modelMessages, abortSignal });
    return result.toUIMessageStream();
  }

  /**
   * Direct transport does not support reconnection since there is no
   * persistent server-side stream to reconnect to.
   */
  async reconnectToStream(
    _options: Parameters<ChatTransport<UI_MESSAGE>["reconnectToStream"]>[0]
  ): ReturnType<ChatTransport<UI_MESSAGE>["reconnectToStream"]> {
    return null;
  }
}
