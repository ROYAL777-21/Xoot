const staticRoutes = new Set([
  "/app",
  "/app/bookings",
  "/app/favorites",
  "/app/gifts",
  "/app/insurance",
  "/app/loyalty",
  "/app/plans",
  "/app/profile",
  "/app/properties",
  "/app/properties/airbnb",
  "/app/properties/office",
  "/app/support",
  "/app/training",
  "/care-plus",
  "/care-plus/apply",
  "/legal/privacy",
  "/legal/terms",
  "/legal/trust-safety",
  "/zooter",
  "/zooter/earnings",
  "/zooter/jobs",
  "/zooter/kyc",
  "/zooter/profile",
  "/zooter/training",
]);

const screenRoutes = new Map<string, string>([
  ["book", "/app"],
  ["booking", "/app/bookings"],
  ["booking_update", "/app/bookings"],
  ["booking_status", "/app/bookings"],
  ["booking_live_activity", "/app/bookings"],
  ["bookings", "/app/bookings"],
  ["care", "/app/plans"],
  ["care_plus", "/app/plans"],
  ["care_plus_apply", "/care-plus/apply"],
  ["favorite_zooter", "/app/favorites"],
  ["favourite_zooter", "/app/favorites"],
  ["favorites", "/app/favorites"],
  ["favourites", "/app/favorites"],
  ["gift", "/app/gifts"],
  ["gifts", "/app/gifts"],
  ["host", "/app/properties/airbnb"],
  ["host_dashboard", "/app/properties/airbnb"],
  ["home_memory", "/app/properties"],
  ["insurance", "/app/insurance"],
  ["loyalty", "/app/loyalty"],
  ["office", "/app/properties/office"],
  ["office_dashboard", "/app/properties/office"],
  ["profile", "/app/profile"],
  ["property", "/app/properties"],
  ["properties", "/app/properties"],
  ["support", "/app/support"],
  ["support_case", "/app/support"],
  ["trust_policy", "/app/insurance"],
  ["zootcred", "/app/loyalty"],
  ["zoot_cred", "/app/loyalty"],
  ["zooter", "/zooter"],
  ["zooter_jobs", "/zooter/jobs"],
]);

type NativeRouteRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is NativeRouteRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const normalizeKey = (value: unknown) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

const firstString = (record: NativeRouteRecord, keys: string[]) => {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }

  return null;
};

const hasPathTraversal = (value: string) => /(^|\/)(\.\.|%2e%2e)(\/|$)/i.test(value);

const safeSegment = (value: unknown) => {
  const segment = String(value ?? "").trim();
  return /^[A-Za-z0-9_-]{1,80}$/.test(segment) ? segment : null;
};

const bookingRoute = (bookingId: unknown) => {
  const segment = safeSegment(bookingId);
  return segment ? `/app/bookings/${segment}` : null;
};

const cleanPath = (candidate: string) => {
  let path = candidate.trim();
  if (!path || hasPathTraversal(path)) return null;
  if (!path.startsWith("/")) path = `/${path}`;

  try {
    path = new URL(path, "https://zoot.local").pathname;
  } catch {
    return null;
  }

  path = path.replace(/\/+$/g, "") || "/";
  if (path.includes("..") || path.includes("//")) return null;

  return path;
};

const toSafeRoute = (candidate: string) => {
  const path = cleanPath(candidate);
  if (!path) return null;
  if (path === "/") return "/app";
  if (staticRoutes.has(path)) return path;

  const bookingMatch = path.match(/^\/app\/bookings\/([^/]+)$/);
  if (bookingMatch) return bookingRoute(bookingMatch[1]);

  if (/^\/app\/favorites\/[^/]+$/.test(path)) return "/app/favorites";
  if (/^\/app\/support\/[^/]+$/.test(path)) return "/app/support";
  if (/^\/zooter\/jobs\/[^/]+$/.test(path)) return "/zooter/jobs";

  return null;
};

const bookingQueryParam = (url: URL) =>
  url.searchParams.get("bookingId") ?? url.searchParams.get("booking_id") ?? url.searchParams.get("id");

const routeFromZootUrl = (url: URL) => {
  const host = normalizeKey(url.hostname);
  const pathname = url.pathname === "/" ? "" : url.pathname;
  const bookingIdParam = bookingQueryParam(url);

  if ((host === "booking" || host === "bookings") && pathname) {
    return bookingRoute(pathname.replace(/^\//, ""));
  }

  if ((host === "booking" || host === "bookings") && bookingIdParam) {
    return bookingRoute(bookingIdParam);
  }

  const mapped = screenRoutes.get(host);
  if (mapped && !pathname) return mapped;

  if (host === "app" || host === "zooter" || host === "care_plus" || host === "care_plus_apply") {
    return toSafeRoute(`/${host.replace(/_/g, "-")}${pathname}`);
  }

  return toSafeRoute(`${url.hostname ? `/${url.hostname}` : ""}${url.pathname}`);
};

const routeFromUrl = (candidate: string) => {
  const value = candidate.trim();
  if (!value || hasPathTraversal(value)) return null;

  if (value.startsWith("/") || !/^[a-z][a-z0-9+.-]*:/i.test(value)) {
    return toSafeRoute(value);
  }

  try {
    const url = new URL(value);
    if (url.protocol === "zoot:") return routeFromZootUrl(url);
    if (url.protocol === "https:" || url.protocol === "http:") return toSafeRoute(url.pathname);
  } catch {
    return toSafeRoute(value);
  }

  return null;
};

const sourceBookingRoute = (record: NativeRouteRecord) => {
  const sourceTable = normalizeKey(record.source_table ?? record.sourceTable);
  if (sourceTable !== "bookings") return null;
  return bookingRoute(firstString(record, ["source_id", "sourceId"]));
};

const routeFromRecord = (record: NativeRouteRecord, depth: number): string | null => {
  const explicitRoute = firstString(record, ["url", "deepLink", "deeplink", "path", "route"]);
  if (explicitRoute) {
    const resolved = routeFromUrl(explicitRoute);
    if (resolved) return resolved;
  }

  const bookingId = firstString(record, ["bookingId", "booking_id"]);
  if (bookingId) {
    const resolved = bookingRoute(bookingId);
    if (resolved) return resolved;
  }

  const sourceRoute = sourceBookingRoute(record);
  if (sourceRoute) return sourceRoute;

  const routeKey = normalizeKey(firstString(record, ["screen", "type", "eventType", "event_type", "category"]));
  const mapped = screenRoutes.get(routeKey);
  if (mapped) return mapped;

  if (depth >= 3) return null;

  for (const key of ["data", "payload", "notification", "detail"]) {
    const nested = record[key];
    const resolved = resolveNativeRouteInner(nested, depth + 1);
    if (resolved) return resolved;
  }

  return null;
};

const resolveNativeRouteInner = (input: unknown, depth: number): string | null => {
  if (typeof input === "string") return routeFromUrl(input);
  if (isRecord(input)) return routeFromRecord(input, depth);
  return null;
};

export const resolveNativeRoute = (input: unknown): string | null => resolveNativeRouteInner(input, 0);
