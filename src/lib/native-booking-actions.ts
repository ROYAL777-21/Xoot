export type ZootNativeBookingAction = "directions" | "masked_call" | "share_eta";

export interface NativeBookingActionInput {
  bookingId: string;
  status?: string | null;
  statusLabel?: string | null;
  serviceName?: string | null;
  zooterName?: string | null;
  propertyName?: string | null;
  suburb?: string | null;
  address?: string | null;
  etaMinutes?: number | null;
  callSessionId?: string | null;
  updatedAt?: string;
}

export interface ZootNativeBookingActionPayload {
  type: "zoot.bookingAction";
  action: ZootNativeBookingAction;
  bookingId: string;
  route: string;
  status?: string;
  statusLabel?: string;
  serviceName?: string;
  zooterName?: string;
  destinationLabel?: string;
  suburb?: string;
  etaMinutes?: number;
  callSessionId?: string;
  directionsUrl?: string;
  updatedAt: string;
}

type BookingActionWindow = Window & {
  webkit?: {
    messageHandlers?: {
      zootBookingAction?: { postMessage: (payload: ZootNativeBookingActionPayload) => void };
    };
  };
  ReactNativeWebView?: { postMessage: (message: string) => void };
  ZootNative?: { performBookingAction?: (payload: ZootNativeBookingActionPayload) => void };
};

const textValue = (value: unknown, maxLength = 120) => {
  if (typeof value !== "string" && typeof value !== "number") return undefined;
  const text = String(value).replace(/[\u0000-\u001f<>]/g, " ").replace(/\s+/g, " ").trim();
  return text ? text.slice(0, maxLength) : undefined;
};

const safeBookingSegment = (value: unknown) => {
  const segment = textValue(value, 80);
  return segment && /^[A-Za-z0-9_-]{1,80}$/.test(segment) ? segment : null;
};

const numberValue = (value: unknown) => {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  return Math.max(0, Math.round(value));
};

const unique = (items: Array<string | undefined>) => {
  const seen = new Set<string>();
  return items.filter((item): item is string => {
    if (!item || seen.has(item.toLowerCase())) return false;
    seen.add(item.toLowerCase());
    return true;
  });
};

export const buildBookingRoute = (bookingId: unknown) => {
  const segment = safeBookingSegment(bookingId);
  return segment ? `/app/bookings/${segment}` : "/app/bookings";
};

export const buildBookingDestinationQuery = (input: NativeBookingActionInput) => {
  const parts = unique([
    textValue(input.propertyName),
    textValue(input.address, 180),
    textValue(input.suburb),
    "South Africa",
  ]);

  return parts.length > 1 ? parts.join(", ") : null;
};

export const buildBookingDirectionsUrl = (input: NativeBookingActionInput) => {
  const query = buildBookingDestinationQuery(input);
  return query ? `https://maps.apple.com/?q=${encodeURIComponent(query)}` : null;
};

export const createNativeBookingActionPayload = (
  action: ZootNativeBookingAction,
  input: NativeBookingActionInput,
): ZootNativeBookingActionPayload => {
  const bookingId = safeBookingSegment(input.bookingId) ?? "booking";
  const status = textValue(input.status, 40);
  const statusLabel = textValue(input.statusLabel, 80);
  const propertyOrSuburb = textValue(input.propertyName) ?? textValue(input.suburb);
  const destinationLabel = action === "directions"
    ? textValue(input.propertyName) ?? textValue(input.address, 120) ?? textValue(input.suburb)
    : propertyOrSuburb;
  const directionsUrl = action === "directions" ? buildBookingDirectionsUrl(input) ?? undefined : undefined;

  return {
    type: "zoot.bookingAction",
    action,
    bookingId,
    route: buildBookingRoute(input.bookingId),
    ...(status ? { status } : {}),
    ...(statusLabel ? { statusLabel } : {}),
    ...(textValue(input.serviceName) ? { serviceName: textValue(input.serviceName) } : {}),
    ...(textValue(input.zooterName) ? { zooterName: textValue(input.zooterName) } : {}),
    ...(destinationLabel ? { destinationLabel } : {}),
    ...(textValue(input.suburb) ? { suburb: textValue(input.suburb) } : {}),
    ...(numberValue(input.etaMinutes) !== undefined ? { etaMinutes: numberValue(input.etaMinutes) } : {}),
    ...(textValue(input.callSessionId, 80) ? { callSessionId: textValue(input.callSessionId, 80) } : {}),
    ...(directionsUrl ? { directionsUrl } : {}),
    updatedAt: input.updatedAt ?? new Date().toISOString(),
  };
};

const tryBridge = (callback: () => void) => {
  try {
    callback();
    return true;
  } catch {
    return false;
  }
};

export const sendNativeBookingAction = (payload: ZootNativeBookingActionPayload) => {
  if (typeof window === "undefined") return false;

  const nativeWindow = window as BookingActionWindow;
  window.dispatchEvent(new CustomEvent("zoot:booking-action", { detail: payload }));

  let delivered = false;
  const webkitBridge = nativeWindow.webkit?.messageHandlers?.zootBookingAction;
  if (webkitBridge) delivered = tryBridge(() => webkitBridge.postMessage(payload)) || delivered;

  const nativeBridge = nativeWindow.ZootNative?.performBookingAction;
  if (nativeBridge) delivered = tryBridge(() => nativeBridge(payload)) || delivered;

  const reactNativeBridge = nativeWindow.ReactNativeWebView;
  if (reactNativeBridge) {
    delivered = tryBridge(() => reactNativeBridge.postMessage(JSON.stringify({ type: "zoot.bookingAction", payload }))) || delivered;
  }

  return delivered;
};

export const openBookingDirections = (input: NativeBookingActionInput) => {
  const payload = createNativeBookingActionPayload("directions", input);
  const fallbackUrl = payload.directionsUrl ?? null;
  if (!fallbackUrl) return { delivered: false, fallbackUrl, payload };

  const delivered = sendNativeBookingAction(payload);
  if (!delivered && typeof window !== "undefined" && typeof window.open === "function") {
    window.open(fallbackUrl, "_blank", "noopener,noreferrer");
  }

  return { delivered, fallbackUrl, payload };
};

export const buildBookingEtaShareText = (payload: ZootNativeBookingActionPayload) => {
  const parts = unique([
    "Zoot booking update",
    payload.statusLabel ?? payload.status,
    payload.etaMinutes !== undefined ? `ETA ${payload.etaMinutes} min` : undefined,
    payload.zooterName ? `${payload.zooterName} assigned` : undefined,
  ]);

  return parts.join(" - ");
};
