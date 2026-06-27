import { handleTwilioStatusCallback } from "../_shared/twilio-webhook.ts";

Deno.serve((req) => handleTwilioStatusCallback(req));
