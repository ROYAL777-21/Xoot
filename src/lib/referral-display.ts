/**
 * The referral reward, for DISPLAY only.
 *
 * ⚠️ **This is a deliberate, narrow exception to "referrals have no client mirror", and the line
 * matters.** `_shared/referrals.ts` has no client copy because a screen that can decide its own
 * *eligibility* can decide its own *discount* — `checkReferral` and `referralCreditCents` must
 * never exist in the browser, and `referrals.test.ts` fails if they appear.
 *
 * An advertised **amount** is a different kind of thing. It is a marketing claim, and under the
 * CPA a displayed offer has to be honoured — so the site must be able to say the number, and the
 * number it says must be the one the server actually applies.
 *
 * ⛔ **So this file exports the figure and nothing else.** No eligibility rule, no cap arithmetic,
 * no funding rule. `referral-display.test.ts` pins it to `REFERRAL_REWARD_CENTS` on the server, so
 * the two cannot drift the way the price ladder and the locked document did.
 *
 * ⚠️ The server records this amount as **provisional** — see `_shared/referrals.ts`. When it
 * changes, the parity test fails and this file is updated in the same commit.
 */
export const REFERRAL_REWARD_CENTS = 10_000;
