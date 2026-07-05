import { makeAssistantToolUI } from "@assistant-ui/react";
import type { ArcgisQueryParams, ArcgisQueryResult } from "../../types/arcgisTool";
import type { SocrataQueryParams, SocrataQueryResult } from "../../types/socrataTool";
import { ToolCallCardContent } from "./ToolCallCardContent";

export const ToolCallCard = makeAssistantToolUI<SocrataQueryParams, SocrataQueryResult>({
  toolName: "fetchSocrataData",
  render: ToolCallCardContent,
});

export const ArcGisToolCallCard = makeAssistantToolUI<ArcgisQueryParams, ArcgisQueryResult>({
  toolName: "fetchArcGisData",
  render: ToolCallCardContent,
});
