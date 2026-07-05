import { makeAssistantToolUI } from "@assistant-ui/react";
import type { SocrataQueryParams, SocrataQueryResult } from "../../types/socrataTool";
import { ToolCallCardContent } from "./ToolCallCardContent";

export const ToolCallCard = makeAssistantToolUI<SocrataQueryParams, SocrataQueryResult>({
  toolName: "fetchSocrataData",
  render: ToolCallCardContent,
});
