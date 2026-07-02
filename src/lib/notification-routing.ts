import { resolveNativeRoute } from "./native-routing";

const NOTIFICATION_ROUTE_PREFIXES = ["/app", "/zooter"];
const NOTIFICATION_EXACT_ROUTES = new Set(["/care-plus", "/care-plus/apply", "/trust-centre"]);

export const resolveNotificationLink = (value: string | null | undefined): string | null => {
  if (!value) return null;

  const route = resolveNativeRoute(value);
  if (!route) return null;

  if (NOTIFICATION_EXACT_ROUTES.has(route)) return route;
  if (NOTIFICATION_ROUTE_PREFIXES.some((prefix) => route === prefix || route.startsWith(`${prefix}/`))) return route;

  return null;
};
