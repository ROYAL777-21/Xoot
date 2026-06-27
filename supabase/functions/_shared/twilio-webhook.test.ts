import { assertEquals } from "jsr:@std/assert@1";
import { computeTwilioSignature } from "./twilio-webhook.ts";

Deno.test("computeTwilioSignature matches Twilio's documented request example", async () => {
  const params = new URLSearchParams();
  params.append("CallSid", "CA1234567890ABCDE");
  params.append("Caller", "+14158675310");
  params.append("Digits", "1234");
  params.append("From", "+14158675310");
  params.append("To", "+18005551212");

  const signature = await computeTwilioSignature(
    "12345",
    "https://mycompany.com/myapp.php?foo=1&bar=2",
    params,
  );

  assertEquals(signature, "GvWf1cFY/Q7PnoempGyD5oXAezc=");
});

Deno.test("computeTwilioSignature sorts and de-duplicates repeated values", async () => {
  const params = new URLSearchParams();
  params.append("Foo", "z");
  params.append("Foo", "a");
  params.append("Foo", "a");
  params.append("Bar", "2");

  const signature = await computeTwilioSignature(
    "12345",
    "https://example.com/webhook",
    params,
  );

  assertEquals(signature, "tfxzW/SNZT8eI16TcWJOP7IEGdE=");
});
