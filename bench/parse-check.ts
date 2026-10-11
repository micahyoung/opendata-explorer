import { parseQwenOutput } from "./qwenWebLlmModel";
const tools: any[] = [{ type: "function", name: "fetchSocrataData", inputSchema: { type: "object", properties: { datasetId: { type: "string" }, limit: { type: "number" }, where: { type: "string" }, tags: { type: "array" } } } }];
const cases = [
  "<think>\n\n</think>\n\nLooking up.\n\n<tool_call>\n<function=fetchSocrataData>\n<parameter=datasetId>\nerm2-nwe9\n</parameter>\n<parameter=limit>\n50\n</parameter>\n<parameter=tags>\n[\"a\",\"b\"]\n</parameter>\n</function>\n</tool_call>",
  "<tool_call>\n<function=fetchSocrataData>\n<parameter=datasetId>\n123\n</parameter>\n<parameter=where>\nborough = 'BROOKLYN'\n</parameter>",
  "Just an answer, no call.",
  "<tool_call>\n<function=a>\n</function>\n</tool_call>\n<tool_call>\n<function=b>\n<parameter=x>\n1\n</parameter>\n</function>\n</tool_call>",
];
for (const c of cases) console.log(JSON.stringify(parseQwenOutput(c, tools)));
