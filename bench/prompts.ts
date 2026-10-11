export interface BenchPrompt {
  id: string;
  text: string;
  /** datasetId that a correct fetch call should target (if any) */
  expectDataset?: string;
  /** tool names that must appear in the call sequence */
  expectTools: string[];
}

export const benchPrompts: BenchPrompt[] = [
  { id: "pick-nyc311", text: "Show noise complaints in Brooklyn from NYC 311.", expectDataset: "erm2-nwe9", expectTools: ["getDatasetDetails", "fetchSocrataData"] },
  { id: "pick-sf-trees", text: "Where are the oldest street trees in San Francisco?", expectDataset: "tkzw-k3nq", expectTools: ["getDatasetDetails", "fetchSocrataData"] },
  { id: "arcgis-dc-trees", text: "Map street trees in Washington DC.", expectDataset: "dc-street-trees", expectTools: ["getDatasetDetails", "fetchArcGisData"] },
  { id: "pick-chicago-schools", text: "List Chicago public schools on the map.", expectDataset: "hexd-c4gn", expectTools: ["getDatasetDetails", "fetchSocrataData"] },
  { id: "geocode-then-query", text: "Show NYC 311 complaints near the Empire State Building.", expectDataset: "erm2-nwe9", expectTools: ["geocodeLocation", "getDatasetDetails", "fetchSocrataData"] },
  { id: "no-fetch-question", text: "Which cities have street tree datasets available?", expectTools: [] },
];
