export const ACTIVE_RESULTS_CHANGED_ATTACHMENT_NAME = "activeResultsChanged";

/**
 * The attachment's mere presence is the signal (no payload data) — it tells
 * the model the map view or the user's selections moved since its last turn,
 * so it should call readActiveResults rather than trust stale context.
 */
export function formatActiveResultsChangedText(): string {
  return "The map view or the user's point selections have changed since your last message — call readActiveResults if it's relevant to answering.";
}

/**
 * The note only means something once a query has put points on the map. Before that there is nothing to read, and the first
 * message of a conversation would carry a note about a "change since your last message" that does not exist, which sent the
 * on-device model into reading an empty selection and re-running its own query.
 */
export function shouldAttachActiveResultsNote(changed: boolean, layerCount: number): boolean {
  return changed && layerCount > 0;
}
