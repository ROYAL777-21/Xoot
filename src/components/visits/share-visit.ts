import type { VisitData } from "./visit-data";
import type { VisitResource } from "@/pages/app/BookingDetail";
import { buildBookingEtaShareText, createNativeBookingActionPayload, sendNativeBookingAction } from "@/lib/native-booking-actions";
import { visitNativeInput } from "./visit-native";

/** The reviewed private route and truthful native/browser/clipboard outcomes. */
export async function shareVisit(data: VisitData, resource: Pick<VisitResource, "isCurrent">, copyOnly = false) {
  const payload = createNativeBookingActionPayload("share_eta", visitNativeInput(data));
  const text = buildBookingEtaShareText(payload), url = new URL(payload.route, window.location.origin).href;
  if (!resource.isCurrent()) return null;
  const delivered = !copyOnly && sendNativeBookingAction(payload);
  if (!copyOnly && navigator.share) {
    try { await navigator.share({ title: "Xoot visit update", text, url }); return "Visit update shared."; }
    catch (failure) { if (failure && typeof failure === "object" && "name" in failure && failure.name === "AbortError") return delivered ? "Browser share cancelled. Native share options were requested." : "Share cancelled."; }
  }
  if (!resource.isCurrent()) return null;
  if (navigator.clipboard?.writeText) {
    try { await navigator.clipboard.writeText(`${text}\n${url}`); return "Visit update and link copied."; }
    catch { /* A successful native dispatch can still open share options. */ }
  }
  if (delivered) return "Native share options requested.";
  throw new Error("Sharing is unavailable on this device.");
}
