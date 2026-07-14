export const ACTIVE_RESULTS_CHANGED_ATTACHMENT_NAME = "activeResultsChanged";

/**
 * The attachment's mere presence is the signal (no payload data) — it tells
 * the model the map view or the user's selections moved since its last turn,
 * so it should call readActiveResults rather than trust stale context.
 */
export function formatActiveResultsChangedText(): string {
  return "The map view or the user's point selections have changed since your last message — call readActiveResults if it's relevant to answering.";
}
