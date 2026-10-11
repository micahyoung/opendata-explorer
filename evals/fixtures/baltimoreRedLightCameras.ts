/** The successful fetchArcGisData result the model saw in the recorded loop (resultSetId is the app's per-session counter). */
export const baltimoreResult = {
  success: true,
  datasetId: "baltimore-red-light-cameras",
  featureCount: 180,
  facets: [
    {
      field: "DisttNo",
      distinctCount: 14,
      overflowed: false,
      topValues: [
        { value: "11", count: 24 },
        { value: "12", count: 22 },
        { value: "7", count: 18 },
        { value: "4", count: 15 },
        { value: "8", count: 14 },
        { value: "6", count: 12 },
        { value: "3", count: 11 },
        { value: "2", count: 11 },
      ],
    },
    {
      field: "Quadrant",
      distinctCount: 4,
      overflowed: false,
      topValues: [
        { value: "1", count: 50 },
        { value: "3", count: 45 },
        { value: "2", count: 43 },
        { value: "4", count: 42 },
      ],
    },
  ],
  resultSetId: "call_1",
  displayedOnMap: true,
};
