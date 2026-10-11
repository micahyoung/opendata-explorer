import { z } from "zod";
import { parseQwenOutput, capResult } from "./qwenWebLlmModel";
import { DEFAULT_ROW_READ_LIMIT, MAX_ROW_READ_LIMIT } from "../src/config/constants";

// Same shape as readPastResultsInputSchema in src/lib/ai/resultSetTools.ts (that module needs Vite's import.meta.glob).
const inputSchema = z.object({
  resultSetId: z.string(),
  offset: z.number().int().nonnegative().optional().default(0),
  limit: z.number().int().positive().max(MAX_ROW_READ_LIMIT).optional().default(DEFAULT_ROW_READ_LIMIT),
  columns: z.array(z.string()).optional(),
});
const t: any = { inputSchema };
const schema = z.toJSONSchema(t.inputSchema) as any;
console.log("limit schema:", JSON.stringify(schema.properties.limit));
const tools: any[] = [{ type: "function", name: "readPastResults", inputSchema: schema }];
const out = parseQwenOutput("<tool_call>\n<function=readPastResults>\n<parameter=resultSetId>\ncall_1_0\n</parameter>\n<parameter=limit>\n1000\n</parameter>\n<parameter=offset>\n0\n</parameter>\n</function>\n</tool_call>", tools);
console.log("parsed:", JSON.stringify(out.calls[0].input));
const ok = t.inputSchema.safeParse(out.calls[0].input);
console.log("schema accepts clamped input:", ok.success, ok.success ? "" : JSON.stringify(ok.error.issues.map((i: any) => i.message)));
const raw = t.inputSchema.safeParse({ resultSetId: "x", limit: 1000 });
console.log("schema rejects raw 1000:", !raw.success);
const long = "x".repeat(50);
console.log("cap:", JSON.stringify(capResult(long, 20)), "| under cap unchanged:", capResult("short", 20) === "short");
