import { supabase } from "@/integrations/supabase/client";
import { placeSummaryColumns, readAllPlaces } from "./saved-places";

export function readPlaces(owner: string) {
  return readAllPlaces((start, end) => supabase.from("household_profiles").select(placeSummaryColumns)
    .eq("user_id", owner).is("archived_at", null).order("is_default", { ascending: false }).order("id", { ascending: true }).range(start, end));
}
export async function selectDefaultHome(owner: string, id: string, selected = true) {
  const { data, error } = await supabase.rpc("set_default_home", { p_expected_owner: owner, p_home_id: id, p_selected: selected });
  if (error || !data || typeof data !== "object" || Array.isArray(data) || data.id !== id || data.is_default !== selected)
    throw new Error("Default place could not be confirmed. Reload your places before trying again.");
}
export async function removeHome(owner: string, id: string) {
  const { data, error } = await supabase.rpc("delete_home", { p_expected_owner: owner, p_home_id: id });
  if (error || !data || typeof data !== "object" || Array.isArray(data) || data.id !== id || data.deleted !== true)
    throw new Error("Removing this place could not be confirmed. Reload your places before trying again.");
}
