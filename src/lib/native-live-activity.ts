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
  zooterName?: string;
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
        zootLiveActivity?: { postMessage: (payload: XootBookingLiveActivityPayload) => void };
      };
    };
    ReactNativeWebView?: { postMessage: (message: string) => void };
    XootNative?: { updateBookingLiveActivity?: (payload: XootBookingLiveActivityPayload) => void };
  }
}

export const notifyBookingLiveActivity = (payload: XootBookingLiveActivityPayload) => {
  if (typeof window === "undefined") return false;

  window.dispatchEvent(new CustomEvent("zoot:booking-live-activity", { detail: payload }));

  window.webkit?.messageHandlers?.zootLiveActivity?.postMessage(payload);
  window.XootNative?.updateBookingLiveActivity?.(payload);
  window.ReactNativeWebView?.postMessage(JSON.stringify({ type: "zoot.bookingLiveActivity", payload }));

  return true;
};
