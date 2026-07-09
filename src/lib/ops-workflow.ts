import { supabase } from "@/integrations/supabase/client";

export type OpsWorkflowRequest = {
  action: string;
  [key: string]: unknown;
};

export const invokeOpsWorkflow = async <T = Record<string, unknown>>(body: OpsWorkflowRequest) => {
  const { data, error } = await supabase.functions.invoke("ops-workflow", { body });
  if (error) throw error;
  return data as T;
};
