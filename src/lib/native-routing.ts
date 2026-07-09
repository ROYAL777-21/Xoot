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
  "/auth/callback",
  "/auth/reset",
  "/care-plus",
  "/care-plus/apply",
  "/install",
  "/legal/privacy",
  "/legal/popia",
  "/legal/refunds-cancellations",
  "/legal/account-deletion",
  "/legal/acceptable-use",
  "/legal/ai-concierge",
  "/legal/care-plus-terms",
  "/legal/cookies",
  "/legal/terms",
  "/legal/trust-safety",
  "/legal/zooter-terms",
  "/trust-centre",
  "/zooter",
  "/zooter/earnings",
  "/zooter/jobs",
  "/zooter/kyc",
  "/zooter/profile",
  "/zooter/training",
]);

const authRoutes = new Set(["/auth/callback", "/auth/reset"]);
const queryPreservingRoutes = new Set(["/app", "/care-plus"]);
const allowedSafeQueryKeys = new Set(["area", "date", "intent", "service", "zootBot"]);
const allowedWebHosts = new Set([
  "zoothome.co.za",
  "www.zoothome.co.za",
  "staging.zoothome.co.za",
  "zoot.co.za",
  "www.zoot.co.za",
]);

const screenRoutes = new Map<string, string>([
  ["book", "/app"],
  ["book_clean", "/app"],
  ["book_cleaner", "/app"],
  ["book_cleaning", "/app"],
  ["book_house_clean", "/app"],
  ["clean_house", "/app"],
  ["clean_home", "/app"],
  ["clean_place", "/app"],
  ["booking", "/app/bookings"],
  ["booking_update", "/app/bookings"],
  ["booking_status", "/app/bookings"],
  ["booking_live_activity", "/app/bookings"],
  ["bookings", "/app/bookings"],
  ["cleaner", "/app"],
  ["office_clean", "/app"],
  ["office_cleaning", "/app"],
  ["commercial_clean", "/app"],
  ["airbnb_turnover", "/app"],
  ["moving_clean", "/app"],
  ["callback", "/auth/callback"],
  ["care", "/app/plans"],
  ["care_plus", "/app/plans"],
  ["care_plus_apply", "/care-plus/apply"],
  ["email_verification", "/auth/callback"],
  ["favorite_zooter", "/app/favorites"],
  ["favourite_zooter", "/app/favorites"],
  ["favorites", "/app/favorites"],
  ["favourites", "/app/favorites"],
  ["gift", "/app/gifts"],
  ["gifts", "/app/gifts"],
  ["host", "/app/properties/airbnb"],
  ["host_dashboard", "/app/properties/airbnb"],
  ["home_memory", "/app/properties"],
  ["install", "/install"],
  ["insurance", "/app/insurance"],
  ["loyalty", "/app/loyalty"],
  ["office", "/app/properties/office"],
  ["office_dashboard", "/app/properties/office"],
  ["otp", "/auth/callback"],
  ["profile", "/app/profile"],
  ["property", "/app/properties"],
  ["properties", "/app/properties"],
  ["reset_password", "/auth/reset"],
  ["support", "/app/support"],
  ["support_case", "/app/support"],
  ["trust_centre", "/trust-centre"],
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

const isLocalWebHost = (host: string) =>
  host === "localhost" || host === "127.0.0.1" || host === "::1" || /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host);

const isAllowedWebUrl = (url: URL) => {
  const host = url.hostname.toLowerCase();
  if (url.protocol === "https:" && allowedWebHosts.has(host)) return true;
  if (url.protocol === "http:" && isLocalWebHost(host)) return true;
  return false;
};

const safeSegment = (value: unknown) => {
  const segment = String(value ?? "").trim();
  return /^[A-Za-z0-9_-]{1,80}$/.test(segment) ? segment : null;
};

const bookingRoute = (bookingId: unknown) => {
  const segment = safeSegment(bookingId);
  return segment ? `/app/bookings/${segment}` : null;
};

const normalizePath = (pathname: string) => {
  const path = pathname.replace(/\/+$/g, "") || "/";
  if (path.includes("..") || path.includes("//")) return null;
  return path;
};

const safeQueryValue = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 120) return null;
  if (/[<>"'`\\]/.test(trimmed)) return null;
  if (hasPathTraversal(trimmed)) return null;
  if (/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(trimmed)) return null;
  return trimmed;
};

const safeQuery = (url: URL) => {
  const params = new URLSearchParams();

  allowedSafeQueryKeys.forEach((key) => {
    const value = url.searchParams.get(key);
    if (!value) return;
    const safeValue = safeQueryValue(value);
    if (safeValue) params.set(key, safeValue);
  });

  const query = params.toString();
  return query ? `?${query}` : "";
};

const appendSafeQuery = (path: string, url: URL) =>
  queryPreservingRoutes.has(path) ? `${path}${safeQuery(url)}` : path;

const routeForUrl = (url: URL) => {
  const path = normalizePath(url.pathname);
  if (!path) return null;
  if (path === "/") return appendSafeQuery("/app", url);
  if (staticRoutes.has(path)) return authRoutes.has(path) ? `${path}${url.search}${url.hash}` : appendSafeQuery(path, url);

  const bookingMatch = path.match(/^\/app\/bookings\/([^/]+)$/);
  if (bookingMatch) return bookingRoute(bookingMatch[1]);

  if (/^\/app\/favorites\/[^/]+$/.test(path)) return "/app/favorites";
  if (/^\/app\/support\/[^/]+$/.test(path)) return "/app/support";
  if (/^\/zooter\/jobs\/[^/]+$/.test(path)) return "/zooter/jobs";

  return null;
};

const toSafeRoute = (candidate: string) => {
  let value = candidate.trim();
  if (!value || hasPathTraversal(value)) return null;
  if (!value.startsWith("/")) value = `/${value}`;

  try {
    return routeForUrl(new URL(value, "https://zoot.local"));
  } catch {
    return null;
  }
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

  if (host === "callback") return toSafeRoute(`/auth/callback${url.search}${url.hash}`);

  const mapped = screenRoutes.get(host);
  if (mapped && !pathname) return appendSafeQuery(mapped, url);

  if (["app", "auth", "zooter", "care_plus", "care_plus_apply", "trust_centre"].includes(host)) {
    return toSafeRoute(`/${host.replace(/_/g, "-")}${pathname}${url.search}${url.hash}`);
  }

  return toSafeRoute(`${url.hostname ? `/${url.hostname}` : ""}${url.pathname}${url.search}${url.hash}`);
};

const routeFromUrl = (candidate: string) => {
  const value = candidate.trim();
  if (!value || hasPathTraversal(value)) return null;

  if (value.startsWith("/") || !/^[a-z][a-z0-9+.-]*:/i.test(value)) {
    return toSafeRoute(value);
  }

  try {
    const url = new URL(value);
    if (url.protocol === "zoot:" || url.protocol === "za.co.zoothome.app:" || url.protocol === "za.co.zoot.app:") {
      return routeFromZootUrl(url);
    }
    if (url.protocol === "https:" || url.protocol === "http:") return isAllowedWebUrl(url) ? routeForUrl(url) : null;
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
