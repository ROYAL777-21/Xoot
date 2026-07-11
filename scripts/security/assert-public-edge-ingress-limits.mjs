import { readFileSync } from "node:fs";

const config = readFileSync("supabase/config.toml", "utf8");
const publicFunctions = [];
let currentFunction = "";

for (const line of config.split(/\r?\n/)) {
  const section = line.match(/^\[functions\.([^\]]+)\]/);
  if (section) currentFunction = section[1];
  if (/^verify_jwt\s*=\s*false\s*$/.test(line) && currentFunction) {
    publicFunctions.push(currentFunction);
  }
}

if (publicFunctions.length === 0) {
  throw new Error("No public Edge Functions were found; config parsing may have drifted.");
}

const twilioFunctions = new Set([
  "twilio-message-webhook",
  "twilio-whatsapp-webhook",
  "twilio-voice-webhook",
  "twilio-status-callback",
  "twilio-verify-webhook",
]);

for (const functionName of publicFunctions) {
  const sourcePath = twilioFunctions.has(functionName)
    ? "supabase/functions/_shared/twilio-webhook.ts"
    : `supabase/functions/${functionName}/index.ts`;
  const source = readFileSync(sourcePath, "utf8");
  if (!/read(?:Json|RequestText)WithLimit/.test(source)) {
    throw new Error(`${functionName} does not enforce a byte-capped request-body reader (${sourcePath}).`);
  }
}

const paymentSource = readFileSync("supabase/functions/confirm-payment/index.ts", "utf8");
if (!paymentSource.includes("verifyPaymentWebhook")) {
  throw new Error("confirm-payment is not bound to provider-specific webhook authentication.");
}

console.log(`Public Edge ingress limits passed for ${publicFunctions.length} unauthenticated functions.`);
