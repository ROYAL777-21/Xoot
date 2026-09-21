import type { Json } from "../integrations/supabase/types";
import {
  calculateXootCredSummary as calculateSummary,
  type XootCredEntry,
  type XootCredLedgerRow as CoreXootCredLedgerRow,
  type XootCredSummary,
} from "./xootcred-core";

export type XootCredLedgerRow = CoreXootCredLedgerRow<Json>;
export type { XootCredEntry, XootCredSummary };

export const calculateXootCredSummary = (
  rows: XootCredLedgerRow[],
  now = new Date(),
): XootCredSummary => calculateSummary(rows, now);
