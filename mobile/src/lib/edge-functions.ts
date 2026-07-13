import { supabase } from '@/lib/supabase';

export async function invokeZootFunction<TResponse>(
  name: string,
  body: Record<string, unknown>,
  options: { timeoutMs?: number } = {},
): Promise<TResponse> {
  const invocation = supabase.functions.invoke(name, { body });
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const { data, error } = await Promise.race([
    invocation,
    new Promise<never>((_, reject) => {
      timeout = setTimeout(
        () => reject(new Error(`${name} timed out`)),
        options.timeoutMs ?? 15_000,
      );
    }),
  ]).finally(() => {
    if (timeout) clearTimeout(timeout);
  });
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
