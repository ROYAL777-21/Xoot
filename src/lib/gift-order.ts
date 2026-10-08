import { supabase } from "@/integrations/supabase/client";
export { quoteGift } from "../../supabase/functions/_shared/gift-order";
export type {
  GiftDraft,
  GiftQuote,
  GiftTint,
} from "../../supabase/functions/_shared/gift-order";
import type {
  GiftDraft,
  GiftQuote,
} from "../../supabase/functions/_shared/gift-order";

export type GiftOrderResult = {
  order_id: string;
  payment_record_id: string;
  status: string;
  quote: GiftQuote;
  replayed: boolean;
};
export class GiftOrderError extends Error {
  constructor(
    message: string,
    public revisedQuote?: GiftQuote,
  ) {
    super(message);
  }
}
async function request<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("ops-workflow", {
    body,
  });
  let result = data;
  if (error?.context instanceof Response)
    result = await error.context
      .clone()
      .json()
      .catch(() => null);
  if (error || result?.error) {
    if (result?.error === "quote_changed" && result.quote)
      throw new GiftOrderError(
        "The gift price changed. Review the revised total before saving.",
        result.quote,
      );
    throw new GiftOrderError(
      result?.error === "request_key_reused"
        ? "This request was already used for another gift. Start a new gift."
        : typeof result?.error === "string"
          ? result.error
          : "Gift setup could not be reached. Please try again.",
    );
  }
  return result as T;
}
export const loadGiftQuote = (service: GiftDraft["service"], count: number) =>
  request<{ quote: GiftQuote; checkout_available: boolean }>({
    action: "gift_quote",
    service,
    count,
  });
export const saveGiftOrder = (
  draft: GiftDraft,
  acceptedQuote: GiftQuote,
  requestKey: string,
) =>
  request<GiftOrderResult>({
    action: "gift_order_create",
    draft,
    acceptedQuote,
    requestKey,
  });
