import { resolveNativeRoute } from "./native-routing";

const NOTIFICATION_ROUTE_PREFIXES = ["/app", "/xooter"];
const NOTIFICATION_EXACT_ROUTES = new Set(["/care-plus", "/trust-centre"]);

export const resolveNotificationLink = (value: string | null | undefined): string | null => {
  if (!value) return null;

  const route = resolveNativeRoute(value);
  if (!route) return null;

  if (NOTIFICATION_EXACT_ROUTES.has(route)) return route;
  if (NOTIFICATION_ROUTE_PREFIXES.some((prefix) => route === prefix || route.startsWith(`${prefix}/`))) return route;

  return null;
};

/**
 * ── Role-aware notification routing ─────────────────────────────────────────────
 *
 * `/app/*` is the CLIENT surface and its routes are guarded only by sign-in, not by role —
 * anyone authenticated can render them. That was fine until notifications entered the picture:
 * a Xooter tapping a booking or loyalty push was deep-linked straight into the client web app,
 * which is a trust boundary crossed by a tap ("xooters can magically access the client side of
 * the web app from their notifications").
 *
 * The rule, applied everywhere a notification can navigate:
 *
 *   - an `admin` keeps every route (admins act on both surfaces);
 *   - a `xooter` tapping a route into the client surface lands on the Xooter equivalent:
 *     booking screens → `/xooter/jobs`, everything else under `/app` → `/xooter`;
 *   - everyone else keeps the resolved route.
 *
 * A Xooter who is also a client still reaches their bookings by opening the app directly; what
 * they can no longer do is be pushed into the client surface by a notification.
 */
const XOOTER_ROUTE_REWRITES: { prefix: string; target: string }[] = [
  { prefix: "/app/bookings", target: "/xooter/jobs" },
  { prefix: "/app", target: "/xooter" },
];

export type NotificationRole = "admin" | "user" | "xooter" | string;

export const resolveNotificationLinkForRoles = (
  value: string | null | undefined,
  roles: NotificationRole[],
): string | null => {
  const route = resolveNotificationLink(value);
  if (route === null) return null;

  if (!roles.includes("xooter") || roles.includes("admin")) return route;

  for (const rewrite of XOOTER_ROUTE_REWRITES) {
    if (route === rewrite.prefix || route.startsWith(`${rewrite.prefix}/`)) return rewrite.target;
  }

  return route;
};

/** Same rewrite for already-resolved deep-link routes (push payloads, `appUrlOpen`). */
export const resolveNativeRouteForRoles = (route: string, roles: NotificationRole[]): string => {
  if (!roles.includes("xooter") || roles.includes("admin")) return route;

  for (const rewrite of XOOTER_ROUTE_REWRITES) {
    if (route === rewrite.prefix || route.startsWith(`${rewrite.prefix}/`)) return rewrite.target;
  }

  return route;
};
