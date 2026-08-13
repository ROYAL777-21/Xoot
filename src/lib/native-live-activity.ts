export type XootBookingLiveActivityStatus =
  | "confirmed"
  | "enroute"
  | "arrived"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "reassigned"
  | "pending";

export interface XootBookingLiveActivityPayload {
  bookingId: string;
  status: XootBookingLiveActivityStatus;
  statusLabel: string;
  serviceName: string;
  xooterName?: string;
  propertyName?: string;
  suburb?: string;
  scheduledAt?: string;
  etaMinutes?: number;
  nextStep?: string;
  supportState?: "standard" | "priority" | "escalated";
  updatedAt: string;
}

declare global {
  interface Window {
    webkit?: {
      messageHandlers?: {
        xootLiveActivity?: { postMessage: (payload: XootBookingLiveActivityPayload) => void };
      };
    };
    ReactNativeWebView?: { postMessage: (message: string) => void };
    XootNative?: { updateBookingLiveActivity?: (payload: XootBookingLiveActivityPayload) => void };
  }
}

export const notifyBookingLiveActivity = (payload: XootBookingLiveActivityPayload) => {
  if (typeof window === "undefined") return false;

  window.dispatchEvent(new CustomEvent("xoot:booking-live-activity", { detail: payload }));

  window.webkit?.messageHandlers?.xootLiveActivity?.postMessage(payload);
  window.XootNative?.updateBookingLiveActivity?.(payload);
  window.ReactNativeWebView?.postMessage(JSON.stringify({ type: "xoot.bookingLiveActivity", payload }));

  return true;
};
