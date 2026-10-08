import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { ProfileUpdateInput } from "@/lib/validators";

export type Identity = Pick<Tables<"profiles">, "full_name" | "avatar_url" | "phone" | "address">;
export type PlaceSummary = Pick<Tables<"household_profiles">, "id" | "label" | "address" | "is_default">;
export type HomeDraft = Pick<Tables<"household_profiles">, "label" | "address" | "is_default" | "pet_notes" | "parking_instructions" | "gate_code" | "alarm_code" | "access_instructions" | "access_notes" | "cleaning_preferences" | "fragile_areas" | "favourite_products">;
export const identityColumns = "full_name,avatar_url,phone,address";
export const homeColumns = "label,address,is_default,pet_notes,parking_instructions,gate_code,alarm_code,access_instructions,access_notes,cleaning_preferences,fragile_areas,favourite_products";
const pageSize = 100;

export async function readIdentity(owner: string): Promise<Identity> {
  const result = await supabase.from("profiles").select(identityColumns).eq("id", owner).maybeSingle();
  if (result.error || !result.data) throw new Error("Your account could not be loaded.");
  return result.data;
}

export async function readProfileOverview(owner: string) {
  const profile = await readIdentity(owner);
  const places: PlaceSummary[] = [];
  for (let start = 0; ; start += pageSize) {
    const result = await supabase.from("household_profiles").select("id,label,address,is_default")
      .eq("user_id", owner).order("is_default", { ascending: false }).order("id", { ascending: true }).range(start, start + pageSize - 1);
    if (result.error || !result.data) throw new Error("Your places could not be loaded.");
    places.push(...result.data);
    if (result.data.length < pageSize) break;
  }
  // Only the real Care+ plan is a membership; other subscription products are not.
  const subscriptions = [];
  for (let start = 0; ; start += pageSize) {
    const result = await supabase.from("user_subscriptions")
      .select("id,status,started_at,next_billing_at,subscription_plans!user_subscriptions_plan_id_fkey(name)")
      .eq("user_id", owner).order("started_at", { ascending: false }).order("id", { ascending: true }).range(start, start + pageSize - 1);
    if (result.error || !result.data) throw new Error("Your membership could not be loaded.");
    subscriptions.push(...result.data);
    if (result.data.length < pageSize) break;
  }
  const membership = subscriptions.find(row => /^(?:Home)?Care\+$/i.test(row.subscription_plans?.name.trim() ?? "") && row.status !== "cancelled") ?? null;
  return { profile, places, membership };
}

export async function saveIdentity(owner: string, draft: Identity) {
  if ((draft.full_name?.length ?? 0) > 120 || (draft.phone?.length ?? 0) > 30 || (draft.address?.length ?? 0) > 500) {
    throw new Error("Account details are too long. Check the field lengths.");
  }
  const parsed = ProfileUpdateInput.safeParse({ full_name: draft.full_name ?? "", phone: draft.phone ?? "", address: draft.address ?? "" });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Check your account details.");
  const result = await supabase.from("profiles").update(parsed.data).eq("id", owner).select("id").maybeSingle();
  if (result.error || result.data?.id !== owner) throw new Error("Your account was not saved. Please try again.");
}

export const blankHome: HomeDraft = { label: "", address: "", is_default: false, pet_notes: "", parking_instructions: "", gate_code: "", alarm_code: "", access_instructions: "", access_notes: "", cleaning_preferences: "", fragile_areas: "", favourite_products: "" };
const optionalText = (max: number) => z.string().trim().max(max, `Keep this field to ${max} characters.`).nullable();
export const HomeInput = z.object({
  label: z.string().trim().min(1, "Name this place.").max(120, "Keep the place name to 120 characters."),
  address: z.string().trim().min(10, "Enter a complete address.").max(500),
  is_default: z.boolean(), pet_notes: optionalText(1000), parking_instructions: optionalText(1000),
  gate_code: optionalText(100), alarm_code: optionalText(100), access_instructions: optionalText(1000),
  access_notes: optionalText(1000), cleaning_preferences: optionalText(1000), fragile_areas: optionalText(1000), favourite_products: optionalText(1000),
});

export async function readHome(owner: string, id: string): Promise<HomeDraft> {
  const result = await supabase.from("household_profiles").select(homeColumns).eq("id", id).eq("user_id", owner).maybeSingle();
  if (result.error || !result.data) throw new Error("This place could not be loaded. It may no longer be available.");
  return result.data;
}

export async function saveHome(owner: string, id: string | null, draft: HomeDraft) {
  // Default selection needs an atomic backend operation; ordinary editing must
  // not overwrite a concurrent default change or create another default.
  const parsed = HomeInput.omit({ is_default: true }).safeParse(draft);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Check your place details.");
  const payload = { ...parsed.data, updated_at: new Date().toISOString() };
  const result = id
    ? await supabase.from("household_profiles").update(payload).eq("id", id).eq("user_id", owner).select("id").maybeSingle()
    : await supabase.from("household_profiles").insert({ ...payload, is_default: false, user_id: owner }).select("id").maybeSingle();
  if (result.error || !result.data?.id || (id && result.data.id !== id)) throw new Error("This place was not saved. Please try again.");
  return result.data.id;
}
