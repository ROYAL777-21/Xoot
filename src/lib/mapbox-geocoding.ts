/** Temporary Mapbox v6 geocoding only. Do not cache response features or derived coordinates.
 * A booking address selected in the UI is customer-supplied text, NOT licensed coordinates
 * or proof of service coverage. Explicitly check Mapbox Permanent Geocoding terms before
 * persisting any Mapbox-derived latitude, longitude, or location identifiers.
 */
export type MapboxAddressSuggestion = { id: string; label: string; featureType: string };

export function mapboxAddressSearchUrl(raw: string, token: string): string | null {
  const query = raw.trim().replace(/\s+/g, ' ');
  if (!token.startsWith('pk.') || query.length < 4 || query.length > 160 || query.split(' ').length > 20) return null;
  const params = new URLSearchParams({
    q: query, country: 'za', language: 'en', limit: '5',
    types: 'address,street,neighborhood,locality,place',
    autocomplete: 'true', permanent: 'false', access_token: token,
  });
  return `https://api.mapbox.com/search/geocode/v6/forward?${params.toString()}`;
}

export function parseMapboxAddressSuggestions(body: unknown): MapboxAddressSuggestion[] {
  if (!body || typeof body !== 'object' || !('features' in body) || !Array.isArray(body.features)) return [];
  const output: MapboxAddressSuggestion[] = [];
  const seen = new Set<string>();
  for (const feature of body.features.slice(0, 5)) {
    if (!feature || typeof feature !== 'object') continue;
    const props = (feature as { properties?: unknown }).properties;
    if (!props || typeof props !== 'object') continue;
    const data = props as Record<string, unknown>;
    const context = data.context as Record<string, unknown> | undefined;
    const country = context?.country as Record<string, unknown> | undefined;
    if (typeof country?.country_code !== 'string' || country.country_code.toUpperCase() !== 'ZA') continue;
    const id = typeof data.mapbox_id === 'string' ? data.mapbox_id : '';
    const label = typeof data.full_address === 'string' ? data.full_address.trim() : '';
    const type = typeof data.feature_type === 'string' ? data.feature_type : '';
    if (!id || id.length > 256 || label.length < 4 || label.length > 220 || seen.has(id)) continue;
    if (!['address','street','neighborhood','locality','place'].includes(type)) continue;
    seen.add(id);
    output.push({ id, label, featureType: type });
  }
  return output;
}
