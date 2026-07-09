import { handleTwilioVerifyWebhook } from "../_shared/twilio-webhook.ts";

Deno.serve((req) => handleTwilioVerifyWebhook(req));
