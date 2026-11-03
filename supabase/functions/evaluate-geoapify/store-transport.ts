import { STAGING_ORIGIN } from "./adapter.ts";

/** Never forward the presented service credential to another host or a database redirect. */
export function stagingEvaluationFetch(request: typeof fetch = fetch): typeof fetch {
  return (input, init) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    if (url.origin !== STAGING_ORIGIN || url.username || url.password) return Promise.reject(new Error("evaluation_database_target_refused"));
    const signal = init?.signal ?? (input instanceof Request ? input.signal : null), deadline = AbortSignal.timeout(10_000);
    return request(input, { ...init, redirect: "error", signal: signal ? AbortSignal.any([signal, deadline]) : deadline });
  };
}
