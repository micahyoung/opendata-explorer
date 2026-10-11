import { describe, expect, it } from "vitest";
import type { FunctionTool } from "./aiTypes";
import { capResult, parseQwenOutput, pyJson, qwenToolsBlock, toQwenMessages } from "./qwenPrompt";

const tools: FunctionTool[] = [
  {
    type: "function",
    name: "fetchSocrataData",
    description: "Query a dataset.",
    inputSchema: {
      type: "object",
      properties: {
        datasetId: { type: "string" },
        limit: { type: "integer", minimum: 1, maximum: 200 },
        ids: { type: "array", items: { type: "string" } },
      },
    },
  },
];

describe("pyJson", () => {
  it("uses Python's separators", () => {
    expect(pyJson({ a: 1, b: [1, 2], c: { d: "x" } })).toBe('{"a": 1, "b": [1, 2], "c": {"d": "x"}}');
  });
  it("differs from JSON.stringify only in spacing", () => {
    const v = { type: "function", function: { name: "n", parameters: { type: "object", required: ["a", "b"] } } };
    expect(pyJson(v).replace(/(, |: )/g, (m) => m.trim())).toBe(JSON.stringify(v));
  });
  it("drops undefined properties", () => {
    expect(pyJson({ a: undefined, b: 1 })).toBe('{"b": 1}');
  });
});

describe("qwenToolsBlock", () => {
  it("lists one descriptor per line inside <tools>", () => {
    const block = qwenToolsBlock(tools);
    expect(block.startsWith("# Tools\n\nYou have access to the following functions:\n\n<tools>\n{")).toBe(true);
    expect(block).toContain('"name": "fetchSocrataData"');
    expect(block).toContain("\n</tools>\n\nIf you choose to call a function");
  });
});

describe("capResult", () => {
  it("leaves short text alone and truncates long text with a note", () => {
    expect(capResult("abc", 10)).toBe("abc");
    expect(capResult("abcdef", 3)).toBe("abc\n[output truncated: 3 of 6 characters omitted]");
  });
});

describe("parseQwenOutput", () => {
  const call = (body: string) => `<tool_call>\n<function=fetchSocrataData>\n${body}\n</function>\n</tool_call>`;

  it("parses a well-formed call", () => {
    const out = parseQwenOutput(call("<parameter=datasetId>\nerm2-nwe9\n</parameter>\n<parameter=limit>\n50\n</parameter>"), tools);
    expect(out.text).toBe("");
    expect(out.calls).toEqual([{ name: "fetchSocrataData", input: { datasetId: "erm2-nwe9", limit: 50 } }]);
  });

  it("returns leading prose separately from the call", () => {
    const out = parseQwenOutput(`Let me look.\n\n${call("<parameter=datasetId>\nx\n</parameter>")}`, tools);
    expect(out.text).toBe("Let me look.");
    expect(out.calls).toHaveLength(1);
  });

  it("tolerates missing </function> and </tool_call>", () => {
    const out = parseQwenOutput("<tool_call>\n<function=fetchSocrataData>\n<parameter=datasetId>\nx\n</parameter>", tools);
    expect(out.calls).toEqual([{ name: "fetchSocrataData", input: { datasetId: "x" } }]);
  });

  it("keeps string parameters as strings even if they look like numbers", () => {
    const out = parseQwenOutput(call("<parameter=datasetId>\n123\n</parameter>"), tools);
    expect(out.calls[0].input.datasetId).toBe("123");
  });

  it("parses JSON arrays", () => {
    const out = parseQwenOutput(call('<parameter=ids>\n["a", "b"]\n</parameter>'), tools);
    expect(out.calls[0].input.ids).toEqual(["a", "b"]);
  });

  it("falls back to the raw string for a truncated array", () => {
    const out = parseQwenOutput(call('<parameter=ids>\n["a", "b'), tools);
    expect(out.calls[0].input.ids).toBe('["a", "b');
  });

  it("clamps numbers to the schema bounds", () => {
    const out = parseQwenOutput(call("<parameter=limit>\n5000\n</parameter>"), tools);
    expect(out.calls[0].input.limit).toBe(200);
  });

  it("strips think blocks, including a lone </think>", () => {
    expect(parseQwenOutput("<think>\nhmm\n</think>\n\nAnswer.", tools).text).toBe("Answer.");
    expect(parseQwenOutput("hmm\n</think>\n\nAnswer.", tools).text).toBe("Answer.");
  });

  it("returns plain text when there is no call", () => {
    expect(parseQwenOutput("Just an answer.", tools)).toEqual({ text: "Just an answer.", calls: [] });
  });
});

describe("toQwenMessages", () => {
  it("puts the tools block ahead of the system prompt", () => {
    const m = toQwenMessages([{ role: "system", content: "SYS" }], tools);
    expect(m).toHaveLength(1);
    expect(m[0].content.startsWith("# Tools")).toBe(true);
    expect(m[0].content.endsWith("\n\nSYS")).toBe(true);
  });

  it("renders assistant tool calls and tool results the way Qwen's template does", () => {
    const m = toQwenMessages(
      [
        { role: "system", content: "SYS" },
        { role: "user", content: [{ type: "text", text: "hi" }] },
        { role: "assistant", content: [{ type: "tool-call", toolCallId: "c1", toolName: "fetchSocrataData", input: { datasetId: "x" } }] },
        { role: "tool", content: [{ type: "tool-result", toolCallId: "c1", toolName: "fetchSocrataData", output: { type: "json", value: { ok: true } } }] },
      ],
      tools,
    );
    expect(m[2]).toEqual({
      role: "assistant",
      content: "<tool_call>\n<function=fetchSocrataData>\n<parameter=datasetId>\nx\n</parameter>\n</function>\n</tool_call>",
    });
    expect(m[3]).toEqual({ role: "user", content: '<tool_response>\n{"ok":true}\n</tool_response>' });
  });

  it("caps tool results", () => {
    const m = toQwenMessages(
      [{ role: "tool", content: [{ type: "tool-result", toolCallId: "c", toolName: "t", output: { type: "text", value: "abcdef" } }] }],
      [],
      3,
    );
    expect(m[0].content).toContain("abc\n[output truncated: 3 of 6");
  });
});
