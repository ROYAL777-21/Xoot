import {
  calculateXootCredSummary,
  type XootCredEntry,
  type XootCredLedgerRow,
} from "../generated/xootcred-core";

export type NativeXootCredLedgerRow = XootCredLedgerRow;
export type NativeXootCredEntry = XootCredEntry;
export const calculateNativeXootCredSummary = calculateXootCredSummary;

export function xootCredReasonLabel(reason: string) {
  const labels: Record<string, string> = {
    loyalty_reward: "Reward credit",
    referral: "Referral credit",
    redemption: "Used on a booking",
    booking_redemption: "Used on a booking",
    care_plus_activation: "Care+ welcome credit",
    refund: "Booking credit",
  };
  return (
    labels[reason] ??
    reason
      .replace(/[_-]+/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase())
  );
}
