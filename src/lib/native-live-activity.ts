export type ZootBookingLiveActivityStatus =
  | "confirmed"
  | "enroute"
  | "arrived"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "reassigned"
  | "pending";

export interface ZootBookingLiveActivityPayload {
  bookingId: string;
  status: ZootBookingLiveActivityStatus;
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
        zootLiveActivity?: { postMessage: (payload: ZootBookingLiveActivityPayload) => void };
      };
    };
    ReactNativeWebView?: { postMessage: (message: string) => void };
    ZootNative?: { updateBookingLiveActivity?: (payload: ZootBookingLiveActivityPayload) => void };
  }
}

export const notifyBookingLiveActivity = (payload: ZootBookingLiveActivityPayload) => {
  if (typeof window === "undefined") return false;

  window.dispatchEvent(new CustomEvent("zoot:booking-live-activity", { detail: payload }));

  window.webkit?.messageHandlers?.zootLiveActivity?.postMessage(payload);
  window.ZootNative?.updateBookingLiveActivity?.(payload);
  window.ReactNativeWebView?.postMessage(JSON.stringify({ type: "zoot.bookingLiveActivity", payload }));

  return true;
};
