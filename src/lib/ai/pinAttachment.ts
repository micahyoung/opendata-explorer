import type { PinnedPoint } from "../mapState/pinnedPointsStore";

export const PIN_ATTACHMENT_NAME = "pins";

export interface PinAttachmentPin {
  key: string;
  datasetId: string;
  longitude: number;
  latitude: number;
  stackedCount: number;
  properties: Record<string, unknown> | null | undefined;
}

export interface PinAttachmentData {
  pins: PinAttachmentPin[];
}

export function buildPinAttachmentData(pins: PinnedPoint[]): PinAttachmentData {
  return {
    pins: pins.map(({ key, datasetId, longitude, latitude, stackedCount, properties }) => ({
      key,
      datasetId,
      longitude,
      latitude,
      stackedCount,
      properties,
    })),
  };
}

function formatPinFields(properties: Record<string, unknown> | null | undefined): string {
  if (!properties) return "(no fields)";
  return Object.entries(properties)
    .filter(([, value]) => value !== null && value !== undefined && value !== "")
    .map(([field, value]) => `${field}=${value}`)
    .join(", ");
}

export function formatPinAttachmentText(data: PinAttachmentData): string {
  const lines = data.pins.map((pin) => {
    const stackedNote = pin.stackedCount > 1 ? ` (${pin.stackedCount} records at this location, showing 1)` : "";
    return `- ${pin.datasetId} at (${pin.longitude}, ${pin.latitude})${stackedNote}: ${formatPinFields(pin.properties)}`;
  });

  return `The user has pinned ${data.pins.length} point(s) on the map (their own selection, not something you queried):\n${lines.join("\n")}`;
}
