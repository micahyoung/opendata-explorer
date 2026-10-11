import { getDataset } from "../../config/datasets";

type Backend = "socrata" | "arcgis" | "ckan";

const FETCH_TOOL_BY_BACKEND: Record<Backend, string> = {
  socrata: "fetchSocrataData",
  arcgis: "fetchArcGisData",
  ckan: "fetchCkanData",
};

const BACKEND_LABEL: Record<Backend, string> = {
  socrata: "Socrata",
  arcgis: "ArcGIS",
  ckan: "CKAN",
};

/**
 * Validation message for a fetch tool called with a datasetId it doesn't own.
 * When the dataset exists on another backend the message names the right tool,
 * so a model that picked the wrong one can fix it on the next step instead of
 * retrying blindly.
 */
export function backendMismatchMessage(calledBackend: Backend, datasetId: string): string {
  const dataset = getDataset(datasetId);
  if (!dataset) return `Unknown datasetId: ${datasetId}`;
  const actual = dataset.backend as Backend;
  return `Dataset ${datasetId} is ${BACKEND_LABEL[actual]}-backed, not ${BACKEND_LABEL[calledBackend]}. Call ${FETCH_TOOL_BY_BACKEND[actual]} instead, with the same datasetId and ${BACKEND_LABEL[actual]}-style query params (see getDatasetDetails).`;
}
