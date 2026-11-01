const STAGING_ORIGIN="https://fxmxyabdjqviqbcxmvlp.supabase.co";
/** Never forward a presented worker credential to another host or follow a database redirect. */
export function stagingScannerFetch(request: typeof fetch = fetch): typeof fetch {
  return (input,init) => {
    const url=new URL(input instanceof Request ? input.url : String(input));
    if(url.origin!==STAGING_ORIGIN || url.username || url.password) return Promise.reject(new Error("scanner_database_target_refused"));
    const supplied=init?.signal ?? (input instanceof Request ? input.signal : null);
    const deadline=AbortSignal.timeout(15_000);
    return request(input,{...init,redirect:"error",signal:supplied ? AbortSignal.any([supplied,deadline]) : deadline});
  };
}
