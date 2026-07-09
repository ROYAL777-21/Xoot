import { supabase } from '@/lib/supabase';

export async function invokeZootFunction<TResponse>(
  name: string,
  body: Record<string, unknown>,
): Promise<TResponse> {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) throw error;

  const payload = data as { success?: boolean; error?: string; data?: TResponse } | TResponse | null;
  if (payload && typeof payload === 'object' && 'success' in payload && payload.success === false) {
    throw new Error(payload.error ?? `${name} failed`);
  }

  if (payload && typeof payload === 'object' && 'data' in payload) {
    return payload.data as TResponse;
  }

  return payload as TResponse;
}
