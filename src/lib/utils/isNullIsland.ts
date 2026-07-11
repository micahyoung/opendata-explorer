// Several backends carry a failed-geocode sentinel of (0, 0) — "Null Island"
// — rather than a null geometry. Shared so every fetch path drops it the same way.
export function isNullIsland(lat: number, lon: number): boolean {
  return lat === 0 && lon === 0;
}
