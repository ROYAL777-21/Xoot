import { supabase } from "@/integrations/supabase/client";
import type { PublicDirectoryProfile } from "../../supabase/functions/_shared/public-directory";

export type XooterDirectory = {xooters: PublicDirectoryProfile[]; total: number};
let pending: Promise<XooterDirectory> | null = null;
let expiresAt = 0;

/** Share the same roster snapshot between the homepage badge and its profile cards. */
export function loadXooterDirectory(): Promise<XooterDirectory> {
  if (pending && Date.now() < expiresAt) return pending;
  expiresAt = Date.now() + 30_000;
  pending = (async () => {
    const { data, error } = await supabase.functions.invoke<XooterDirectory>("public-xooter-directory", {body:{}});
    if (error || !data || !Array.isArray(data.xooters) || !Number.isInteger(data.total) || data.total < 0) {
      throw new Error("The Xooter roster could not be loaded.");
    }
    return data;
  })().catch(error => { pending = null; expiresAt = 0; throw error; });
  return pending;
}
