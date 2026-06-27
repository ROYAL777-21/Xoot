import { handleTwilioVoiceWebhook } from "../_shared/twilio-webhook.ts";

Deno.serve((req) => handleTwilioVoiceWebhook(req));
