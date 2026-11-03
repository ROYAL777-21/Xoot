/** Evaluation only. These public civic addresses are never customer/home input. */
export const EVALUATION_POLICY = "xoot-geoapify-public-fixtures-v1";
export const STAGING_PROJECT = "fxmxyabdjqviqbcxmvlp";
export const STAGING_ORIGIN = `https://${STAGING_PROJECT}.supabase.co`;
export const PUBLIC_FIXTURES = {
  gcis_head_office: {
    query: "1035 Frances Baard Street, Hatfield, Pretoria, South Africa",
    houseNumber: "1035", streets: ["Frances Baard Street", "Schoeman Street"],
    source: "https://www.gcis.gov.za/content/contact-us",
  },
  state_theatre: {
    query: "320 Pretorius Street, Pretoria, South Africa",
    houseNumber: "320", streets: ["Pretorius Street"],
    source: "https://www.statetheatre.co.za/ticket-loyalties/contact-us/",
  },
  union_buildings: {
    query: "Union Buildings, Government Avenue, Pretoria, South Africa",
    houseNumber: null, streets: ["Government Avenue"],
    source: "https://www.gov.za/about-government/contact-directory/presidency/presidency",
  },
} as const;
export type FixtureId = keyof typeof PUBLIC_FIXTURES;
export const fixtureId = (input: unknown): input is FixtureId =>
  typeof input === "string" && Object.hasOwn(PUBLIC_FIXTURES, input);

const resultTypes = ["unknown", "amenity", "building", "street", "suburb", "district", "postcode", "city", "county", "state", "country"] as const;
const matchTypes = ["full_match", "inner_part", "match_by_building", "match_by_street", "match_by_postcode", "match_by_city_or_disrict", "match_by_city_or_district", "match_by_country_or_state"] as const;
type ResultType = typeof resultTypes[number];
type MatchType = typeof matchTypes[number] | "unknown";
export type EvaluationReport = {
  outcome: "address_candidate" | "place_candidate" | "needs_review" | "no_results";
  candidateCount: number;
  countryCode: string | null;
  houseNumber: "match" | "missing" | "mismatch" | "not_requested";
  streetMatches: boolean;
  localityMatches: boolean;
  provinceMatches: boolean;
  resultType: ResultType;
  matchType: MatchType;
  confidence: { overall: number | null; city: number | null; street: number | null; building: number | null };
  location: { latitude: number | null; longitude: number | null };
  source: "openstreetmap" | "unreviewed";
};
const record = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
const confidence = (value: unknown) => typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1 ? value : null;
const coordinate = (value: unknown, max: number) => typeof value === "number" && Number.isFinite(value) && Math.abs(value) <= max ? value : null;
const normalize = (value: unknown) => typeof value === "string" && value.length <= 160
  ? value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9 ]/g, " ").trim().replace(/\s+/g, " ") : "";
const street = (value: unknown) => normalize(value).replace(/\b(?:st|str)\b/g, "street").replace(/\b(?:ave|av)\b/g, "avenue");
const empty = (count: number): EvaluationReport => ({ outcome: count ? "needs_review" : "no_results", candidateCount: count,
  countryCode: null, houseNumber: "missing", streetMatches: false, localityMatches: false, provinceMatches: false,
  resultType: "unknown", matchType: "unknown", confidence: { overall: null, city: null, street: null, building: null },
  location: { latitude: null, longitude: null }, source: "unreviewed" });

function candidate(value: unknown, id: FixtureId, count: number): EvaluationReport {
  const row = record(value), report = empty(count);
  if (!row) return report;
  const expected = PUBLIC_FIXTURES[id], rank = record(row.rank), datasource = record(row.datasource);
  report.countryCode = typeof row.country_code === "string" && /^[a-z]{2}$/.test(row.country_code) ? row.country_code : null;
  report.houseNumber = expected.houseNumber === null ? "not_requested" : typeof row.housenumber !== "string" || !row.housenumber.trim()
    ? "missing" : row.housenumber.trim().toUpperCase() === expected.houseNumber ? "match" : "mismatch";
  report.streetMatches = expected.streets.some(expectedStreet => street(expectedStreet) === street(row.street));
  report.localityMatches = ["pretoria", "city of tshwane", "tshwane"].includes(normalize(row.city));
  report.provinceMatches = normalize(row.state) === "gauteng";
  report.resultType = resultTypes.includes(row.result_type as ResultType) ? row.result_type as ResultType : "unknown";
  report.matchType = rank && matchTypes.includes(rank.match_type as typeof matchTypes[number]) ? rank.match_type as MatchType : "unknown";
  report.confidence = { overall: confidence(rank?.confidence), city: confidence(rank?.confidence_city_level),
    street: confidence(rank?.confidence_street_level), building: confidence(rank?.confidence_building_level) };
  report.location = { latitude: coordinate(row.lat, 90), longitude: coordinate(row.lon, 180) };
  // Only this exact documented data-source attribution has been reviewed. Never invent OSM
  // attribution for a different/unknown source or trust upstream HTML/URLs in an email/UI.
  if (datasource?.sourcename === "openstreetmap" && datasource.attribution === "© OpenStreetMap contributors" &&
    datasource.license === "Open Database License" && datasource.url === "https://www.openstreetmap.org/copyright") report.source = "openstreetmap";
  const common = report.countryCode === "za" && report.streetMatches && report.localityMatches && report.provinceMatches &&
    report.location.latitude !== null && report.location.longitude !== null && report.source === "openstreetmap" &&
    report.matchType === "full_match" && (report.confidence.overall ?? 0) >= 0.95 &&
    (report.confidence.city ?? 0) >= 0.95 && (report.confidence.street ?? 0) >= 0.95;
  const building = ["building", "amenity"].includes(report.resultType) && (report.confidence.building ?? 0) >= 0.9;
  if (common && building && report.houseNumber === "match") report.outcome = "address_candidate";
  else if (common && building && report.houseNumber === "not_requested" && normalize(row.name) === "union buildings") report.outcome = "place_candidate";
  return report;
}

/** Pure bounded projection; provider confidence is not proof of occupancy, coverage or supply. */
export function evaluateResponse(value: unknown, id: FixtureId): EvaluationReport | null {
  const body = record(value);
  if (!body || !Array.isArray(body.results) || body.results.length > 3) return null;
  const rows = body.results;
  const reports = rows.map(row => candidate(row, id, rows.length));
  return reports.find(row => row.outcome === "address_candidate") ?? reports.find(row => row.outcome === "place_candidate") ?? reports[0] ?? empty(0);
}

/** Revalidate cached database evidence before reflecting it through the private endpoint. */
export function storedReport(value: unknown): EvaluationReport | null {
  const row = record(value), scores = record(row?.confidence), location = record(row?.location);
  const keys = ["outcome", "candidateCount", "countryCode", "houseNumber", "streetMatches", "localityMatches", "provinceMatches", "resultType", "matchType", "confidence", "location", "source"];
  if (!row || Object.keys(row).length !== keys.length || Object.keys(row).some(key => !keys.includes(key)) || !scores || !location ||
    Object.keys(scores).sort().join() !== "building,city,overall,street" || Object.keys(location).sort().join() !== "latitude,longitude" ||
    !["address_candidate", "place_candidate", "needs_review", "no_results"].includes(String(row.outcome)) ||
    !Number.isSafeInteger(row.candidateCount) || Number(row.candidateCount) < 0 || Number(row.candidateCount) > 3 ||
    (row.countryCode !== null && (typeof row.countryCode !== "string" || !/^[a-z]{2}$/.test(row.countryCode))) ||
    !["match", "missing", "mismatch", "not_requested"].includes(String(row.houseNumber)) ||
    [row.streetMatches, row.localityMatches, row.provinceMatches].some(value => typeof value !== "boolean") ||
    !resultTypes.includes(row.resultType as ResultType) || !["unknown", ...matchTypes].includes(row.matchType as MatchType) ||
    !["openstreetmap", "unreviewed"].includes(String(row.source)) ||
    Object.values(scores).some(value => value !== null && confidence(value) === null) ||
    (location.latitude !== null && coordinate(location.latitude, 90) === null) ||
    (location.longitude !== null && coordinate(location.longitude, 180) === null) ||
    ((row.outcome === "no_results") !== (row.candidateCount === 0))) return null;
  if (["address_candidate", "place_candidate"].includes(String(row.outcome)) &&
    (row.countryCode !== "za" || !row.streetMatches || !row.localityMatches || !row.provinceMatches || row.source !== "openstreetmap" ||
      row.matchType !== "full_match" || !["building", "amenity"].includes(String(row.resultType)) ||
      (scores.overall as number ?? 0) < 0.95 || (scores.city as number ?? 0) < 0.95 ||
      (scores.street as number ?? 0) < 0.95 || (scores.building as number ?? 0) < 0.9 ||
      location.latitude === null || location.longitude === null ||
      row.houseNumber !== (row.outcome === "address_candidate" ? "match" : "not_requested"))) return null;
  return row as EvaluationReport;
}

/** Fixed, reviewed links only. Unknown upstream licences/HTML never become attribution claims. */
export function attributionFor(report: EvaluationReport) {
  return { geoapify: { label: "Powered by Geoapify", url: "https://www.geoapify.com/" },
    dataSource: report.source === "openstreetmap" ? { name: "openstreetmap", label: "© OpenStreetMap contributors",
      license: "Open Database License", url: "https://www.openstreetmap.org/copyright" } : null,
    reviewRequired: report.source !== "openstreetmap" };
}
