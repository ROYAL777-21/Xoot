// Shared web/native list contract. Sensitive access fields never enter this API.
export const placeSummaryColumns = "id,label,address,is_default";
export type PlaceSummary = { id: string; label: string; address: string | null; is_default: boolean };
export function defaultPlace<T extends PlaceSummary>(places: T[]): T | null {
  return places.find(place => place.is_default) ?? null;
}
export async function readAllPlaces(readPage: (start: number, end: number) => PromiseLike<{ data: PlaceSummary[] | null; error: unknown }>): Promise<PlaceSummary[]> {
  const places: PlaceSummary[] = [];
  for (let start = 0; ; start += 100) {
    const result = await readPage(start, start + 99);
    if (result.error || !result.data) throw new Error("Your places could not be loaded.");
    places.push(...result.data);
    if (result.data.length < 100) return places;
  }
}
