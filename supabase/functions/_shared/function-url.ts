/**
 * Is a URL one that Supabase will actually route to an Edge Function?
 *
 * ── Why this is a file and not three lines inside a check ────────────────────────
 *
 * `twilio-selftest` exists to catch one specific failure: a TwiML App whose Voice Request URL is
 * wrong, so Twilio has nowhere to fetch TwiML from and a call connects and then dies in silence.
 * The first green run of that self-test, 2026-08-12 19:20, passed production while production
 * held exactly that failure:
 *
 *     Voice URL: https://mvlrkelahhsyjrwgsxaf.supabase.co/twilio-voice-twiml
 *
 * Supabase serves an Edge Function on two shapes and no others:
 *
 *     https://<ref>.functions.supabase.co/<name>
 *     https://<ref>.supabase.co/functions/v1/<name>
 *
 * The production value is neither. It is the project's REST host with the function name pasted
 * onto the root, which answers 404. Staging, configured separately, had the correct
 * `.functions.supabase.co` form.
 *
 * The check that let it through asked `voiceUrl.includes("twilio-voice-twiml")` — true of the
 * broken URL, of a typo'd path, of a URL on someone else's project, and of a comment mentioning
 * the function by name. A substring test cannot answer "will Twilio reach this", so this module
 * answers it by shape instead, and is unit-tested because that is the kind of predicate that is
 * wrong quietly.
 */

/** Query string and trailing slashes are not differences worth failing over. */
export const normaliseFunctionUrl = (url: string) => url.trim().split("?")[0].replace(/\/+$/, "");

/** `https://abc.supabase.co` → `abc`. Returns "" for anything that is not a URL. */
export const projectRefFrom = (supabaseUrl: string) =>
  supabaseUrl.replace(/^https?:\/\//, "").split(".")[0] ?? "";

/** Both canonical forms, most-used first. The first is what error messages tell you to paste. */
export const expectedFunctionUrls = (ref: string, fn: string) => [
  `https://${ref}.functions.supabase.co/${fn}`,
  `https://${ref}.supabase.co/functions/v1/${fn}`,
];

/**
 * True only for a URL Supabase routes to `fn`.
 *
 * ⚠️ The project ref is deliberately NOT pinned to our own. A custom domain in front of the
 * functions is legitimate and would fail a strict equality check while working perfectly. What is
 * verified is the shape and the function name; a cross-project ref stays visible in the detail
 * line the caller prints, where a human can see it.
 */
export const isRoutableFunctionUrl = (url: string, fn: string) => {
  const normalised = normaliseFunctionUrl(url);
  if (!normalised || !fn) return false;
  const shapeOk =
    /^https:\/\/[a-z0-9-]+\.functions\.supabase\.co\/[^/]+$/.test(normalised) ||
    /^https:\/\/[a-z0-9-]+\.supabase\.co\/functions\/v1\/[^/]+$/.test(normalised);
  return shapeOk && normalised.endsWith(`/${fn}`);
};

/**
 * Says which of the two ways a URL is wrong, because the fixes are different: one is "you pasted
 * the wrong host", the other is "you pointed it at another function entirely".
 */
export const describeUnroutableFunctionUrl = (url: string, fn: string, canonical: string) => {
  const normalised = normaliseFunctionUrl(url);
  return normalised.endsWith(`/${fn}`)
    ? `names ${fn} but is not a routable Edge Function URL: ${url} — Twilio will POST it and get a 404, and the call will die silently. The function path is missing. Set it to ${canonical} (POST).`
    : `does not point at ${fn}: ${url || "(empty)"} — set it to ${canonical} (POST).`;
};
