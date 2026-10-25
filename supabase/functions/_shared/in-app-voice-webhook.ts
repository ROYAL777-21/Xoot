/** Bounded form-only Twilio authentication; no payload is logged or persisted. */
export async function signedVoiceForm(req: Request, validationUrl = req.url): Promise<FormData | null> {
  const secret = Deno.env.get("TWILIO_WEBHOOK_AUTH_TOKEN") ?? Deno.env.get("TWILIO_AUTH_TOKEN");
  const signature = req.headers.get("x-twilio-signature");
  if (req.method !== "POST" || !secret || !signature || !req.body ||
    !req.headers.get("content-type")?.toLowerCase().startsWith("application/x-www-form-urlencoded")) return null;
  const reader = req.body.getReader(); const chunks: Uint8Array[] = []; let size = 0;
  try {
    while (true) {
      const part = await reader.read(); if (part.done) break;
      size += part.value.byteLength;
      if (size > 16_384) { await reader.cancel(); return null; }
      chunks.push(part.value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  const form = new FormData();
  for (const [key, value] of new URLSearchParams(new TextDecoder().decode(bytes))) form.append(key, value);
  const parameters = [...new Set(form.keys())].sort().map(key =>
    [...new Set(form.getAll(key).map(String))].sort().map(value => key + value).join("")).join("");
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
  const hash = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(validationUrl + parameters)));
  const expected = btoa(String.fromCharCode(...hash));
  if (expected.length !== signature.length) return null;
  let difference = 0;
  for (let i = 0; i < expected.length; i++) difference |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  return difference === 0 ? form : null;
}
