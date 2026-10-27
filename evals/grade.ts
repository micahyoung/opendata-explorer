import type { z } from "zod";
import { getDataset, type DatasetDefinition } from "../src/config/datasets";
import { buildArcgisUrl } from "../src/lib/arcgis/buildArcgisUrl";
import { buildDatastoreSearchUrl } from "../src/lib/ckan/buildDatastoreSearchUrl";
import { buildSoqlUrl } from "../src/lib/socrata/buildSoqlUrl";
import { tools } from "../src/lib/ai/tools";

/** What a generation amounts to: a plain-text reply, a tool call, or nothing. */
export type Outcome = { kind: "text"; text: string } | { kind: "tool_call"; name: string; input: Record<string, unknown> } | { kind: "empty" };

export interface Grade {
  ok: boolean;
  detail: string;
}

const pass = (detail: string): Grade => ({ ok: true, detail });
const fail = (detail: string): Grade => ({ ok: false, detail });

export const FETCH_TOOL = { socrata: "fetchSocrataData", arcgis: "fetchArcGisData", ckan: "fetchCkanData" } as const;

const describe = (o: Outcome) => (o.kind === "tool_call" ? `tool_call ${o.name}` : o.kind);

/** The call must be to `name`; `check` returns a problem description, or undefined when the input is acceptable. */
export function expectToolCall(o: Outcome, name: string, check?: (input: Record<string, unknown>) => string | undefined): Grade {
  if (o.kind !== "tool_call") return fail(`expected a call to ${name}, got ${describe(o)}`);
  if (o.name !== name) return fail(`expected a call to ${name}, got ${o.name}`);
  const problem = check?.(o.input);
  return problem ? fail(problem) : pass(`${name} ok`);
}

export function expectText(o: Outcome, check?: (text: string) => string | undefined): Grade {
  if (o.kind !== "text") return fail(`expected a plain-text reply, got ${describe(o)}`);
  const problem = check?.(o.text);
  return problem ? fail(problem) : pass("text ok");
}

/** Routing: asking for the details of the dataset that answers the question. */
export function gradeRoute(datasetId: string, o: Outcome): Grade {
  return expectToolCall(o, "getDatasetDetails", (input) => {
    const ids = input.datasetIds;
    if (!Array.isArray(ids)) return `datasetIds is not an array: ${JSON.stringify(ids)}`;
    return ids.includes(datasetId) ? undefined : `datasetIds ${JSON.stringify(ids)} does not include ${datasetId}`;
  });
}

const NOT_FIELDS = new Set(["and", "or", "not", "null", "is", "in", "like", "between", "true", "false", "case", "when", "then", "else", "end", "asc", "desc"]);
const COMPARISON = /([A-Za-z_][A-Za-z0-9_]*)\s*(?:=|!=|<>|<=|>=|<|>|\blike\b|\bin\b|\bis\b|\bbetween\b|\bnot\b)/gi;

/** Names compared in a where clause that are not fields of the dataset (a hallucinated column). String literals are ignored. */
export function unknownFieldsInClause(clause: string, known: Set<string>): string[] {
  // Literals and `::type` casts (mapdbh::number > 24) are not column names.
  const withoutLiterals = clause.replace(/'(?:[^']|'')*'/g, "''").replace(/::\w+/g, "");
  const unknown = new Set<string>();
  for (const m of withoutLiterals.matchAll(COMPARISON)) {
    const name = m[1].toLowerCase();
    if (!NOT_FIELDS.has(name) && !known.has(name)) unknown.add(m[1]);
  }
  return [...unknown];
}

/** Leading column names of a comma-separated select/order list; entries with functions or `*` are skipped. */
export function unknownFieldsInList(list: string, known: Set<string>): string[] {
  return list
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item && item !== "*" && !item.includes("("))
    .map((item) => item.split(/\s+/)[0])
    .filter((name) => !known.has(name.toLowerCase()));
}

function unknownFields(dataset: DatasetDefinition, input: Record<string, unknown>): string[] {
  const known = new Set(dataset.fields.map((f) => f.name.toLowerCase()));
  const str = (v: unknown) => (typeof v === "string" ? v : undefined);
  const found: string[] = [];
  const clause = (v: unknown) => str(v) && found.push(...unknownFieldsInClause(str(v)!, known));
  const list = (v: unknown) => str(v) && found.push(...unknownFieldsInList(str(v)!, known));
  clause(input.where);
  list(input.select);
  list(input.order);
  list(input.outFields);
  list(input.orderByFields);
  list(input.sort);
  if (input.filters && typeof input.filters === "object") {
    found.push(...Object.keys(input.filters).filter((k) => !known.has(k.toLowerCase())));
  }
  return found;
}

/** The query arguments the model chose: the right backend's tool, a valid schema, a buildable URL, and only fields the dataset has. */
export function gradeFetch(dataset: DatasetDefinition, o: Outcome): Grade {
  const toolName = FETCH_TOOL[dataset.backend];
  if (o.kind !== "tool_call") return fail(`expected a call to ${toolName}, got ${describe(o)}`);
  if (o.name !== toolName) return fail(`expected a call to ${toolName}, got ${o.name}`);

  const parsed = (tools[toolName].inputSchema as unknown as z.ZodType<Record<string, unknown>>).safeParse(o.input);
  if (!parsed.success) return fail(`arguments do not match the tool schema: ${parsed.error.issues.map((i) => `${i.path.join(".")} ${i.message}`).join("; ")}`);
  const input = parsed.data;
  if (input.datasetId !== dataset.id) return fail(`datasetId ${JSON.stringify(input.datasetId)}, expected ${dataset.id}`);

  try {
    // The Socrata/ArcGIS/CKAN builders take loosely typed params; the schema parse above already guarantees their shapes.
    if (dataset.backend === "socrata") buildSoqlUrl(dataset, input as never);
    else if (dataset.backend === "arcgis") buildArcgisUrl(dataset, input as never);
    else buildDatastoreSearchUrl(dataset, input as never);
  } catch (err) {
    return fail(`could not build the request URL: ${err instanceof Error ? err.message : String(err)}`);
  }

  const bad = unknownFields(dataset, input);
  if (bad.length) return fail(`fields not in ${dataset.id}: ${bad.join(", ")}`);
  return pass(`${toolName}(${JSON.stringify(input)})`);
}

/** Convenience for graders that know only a dataset id. */
export function gradeFetchById(datasetId: string, o: Outcome): Grade {
  const dataset = getDataset(datasetId);
  return dataset ? gradeFetch(dataset, o) : fail(`unknown dataset ${datasetId}`);
}
