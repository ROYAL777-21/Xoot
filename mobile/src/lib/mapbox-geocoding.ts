/** Mobile Mapbox Geocoding v6: temporary search, separately confirmed Permanent result.
 * Never persist or log Temporary response objects, map IDs or exact coordinates.
 * The user-chosen, permanently licensed formatted address may become their booking text.
 */
export type NativeMapboxSuggestion = { id: string; label: string };
export const nativeMapboxSearchUrl = (value: string, token: string, permanent = false) => {
  const q = value.trim().replace(/\s+/g, ' ');
  if (!token.startsWith('pk.') || q.length < 4 || q.length > 160 || q.split(' ').length > 20 || /[;\n\r]/.test(q)) return null;
  const params = new URLSearchParams({
    q, country: 'za', language: 'en', limit: permanent ? '1' : '5',
    autocomplete: permanent ? 'false' : 'true',
    permanent: permanent ? 'true' : 'false',
    access_token: token,
  });
  return `https://api.mapbox.com/search/geocode/v6/forward?${params.toString()}`;
};
export const parseNativeMapboxSuggestions = (payload: unknown): NativeMapboxSuggestion[] => {
  if (!payload || typeof payload !== 'object' || !('features' in payload) || !Array.isArray(payload.features)) return [];
  const used = new Set<string>();
  const results: NativeMapboxSuggestion[] = [];
  for (const entry of payload.features.slice(0, 5)) {
    const p = entry && typeof entry === 'object' ? (entry as {properties?: Record<string, unknown>}).properties : null;
    if (!p || typeof p !== 'object') continue;
    const country = (p.context as {country?: {country_code?: unknown}} | undefined)?.country?.country_code;
    if (typeof country !== 'string' || country.toUpperCase() !== 'ZA') continue;
    const id = p.mapbox_id, label = p.full_address, type = p.feature_type;
    if (typeof id !== 'string' || !id || id.length > 256 || used.has(id) ||
        typeof label !== 'string' || label.length < 4 || label.length > 220 ||
        !['address', 'street', 'neighborhood', 'locality', 'place'].includes(String(type))) continue;
    results.push({id, label}); used.add(id);
  }
  return results;
};
