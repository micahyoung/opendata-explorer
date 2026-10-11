import type { LanguageModelV3CallOptions } from "@ai-sdk/provider";

export type LanguageModelPrompt = LanguageModelV3CallOptions["prompt"];
export type FunctionTool = Extract<NonNullable<LanguageModelV3CallOptions["tools"]>[number], { type: "function" }>;
type ToolMessage = Extract<LanguageModelPrompt[number], { role: "tool" }>;
export type ToolResultOutput = Extract<ToolMessage["content"][number], { type: "tool-result" }>["output"];
