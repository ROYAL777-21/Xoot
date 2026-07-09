import { handleTwilioMessagingWebhook } from "../_shared/twilio-webhook.ts";

Deno.serve((req) => handleTwilioMessagingWebhook(req, { expectedChannel: "whatsapp" }));
