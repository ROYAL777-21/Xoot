import { Gift, Send, Sparkles, Wallet } from "lucide-react";
import { REFERRAL_REWARD_CENTS } from "@/lib/referral-display";
import { ReferralCodeCard } from "./ReferralCodeCard";
import "@/styles/gift-care-handoff.css";
import "@/styles/homepage-sections.css";
import "@/styles/referrals-reviews-handoff.css";

/*
 * ZD-036 — "Refer & earn" on the public site.
 *
 * ⚠️ **The design's own note is the reason this exists**, and it is worth keeping:
 *
 *   > The app had a referral screen; the site had nothing, so a link shared to WhatsApp landed on
 *   > a homepage that never mentioned the R100 the sender had just promised. That gap is where
 *   > referral programmes die — the recipient assumes they were sent an advert.
 *
 * ⛔ **The design's `referral.js` decides eligibility in the browser. This port does not, and must
 * never.** `_shared/referrals.ts` has no client mirror precisely because a screen that can decide
 * its own eligibility can decide its own discount, and `locked-commercial-facts.md` lists
 * "referral qualification" among the things the frontend is never authoritative for.
 *
 * What this component does: **state the offer.** What it does not do: decide whether you qualify
 * for it. `checkReferral` runs on the server, at booking time, and the 409 it returns is what the
 * checkout field renders.
 */

const REWARD_RAND = REFERRAL_REWARD_CENTS / 100;

const STEPS = [
  {
    icon: Send,
    title: "Send your link",
    body: "One tap. WhatsApp, message, however you talk to them.",
  },
  {
    icon: Sparkles,
    title: `They save R${REWARD_RAND}`,
    body: "Their invite is checked with the first-booking quote, before they pay.",
  },
  {
    icon: Wallet,
    title: `You get R${REWARD_RAND}`,
    // ⚠️ "once that first visit is booked and paid" is load-bearing and was kept verbatim from the
    // design. `referral_redemptions.rewarded` stays false at booking time on purpose: paying the
    // referrer before the booking completes lets a pair book, collect, and cancel.
    body: "Into your XootCred after a qualifying first visit is completed and paid.",
  },
] as const;

export const ReferSection = () => (
  <section id="refer" className="xoot-public-section xoot-referrals" aria-labelledby="referrals-title">
    <div className="xoot-public-inner">
      <div className="xoot-referrals-grid">
        <div>
          <p className="xoot-section-eyebrow">
            Refer &amp; earn
          </p>
          <h2 id="referrals-title" className="xoot-section-title">
            R{REWARD_RAND} for them. <span className="xoot-squiggle">R{REWARD_RAND} for you.</span>
          </h2>
          <p className="mt-4 max-w-md text-muted-foreground">
            The people who trust us most found us through someone they already trusted. So the offer
            runs both ways and the amounts match — nobody should feel like they are selling to their
            neighbour.
          </p>
        <ul className="xoot-referral-steps">
          {STEPS.map(({ icon: Icon, title, body }) => (
            <li key={title} className="flex items-start gap-4">
              <span className="grid h-10 w-10 flex-none place-items-center rounded-xl bg-primary/10">
                <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
              </span>
              <div>
                <p className="font-semibold">{title}</p>
                <p className="text-sm text-muted-foreground">{body}</p>
              </div>
            </li>
          ))}
        </ul></div>
        <ReferralCodeCard />
      </div>

      <p className="mt-10 max-w-xl text-sm text-muted-foreground">
        Your code also lives under Rewards. Xoot funds this out of its own commission — a
        Xooter's pay does not change because a customer arrived through someone else's link.
      </p>
    </div>
  </section>
);

/**
 * The bar that appears when someone arrives on a referral link.
 *
 * ⚠️ **This is the more important of the two.** It is the only proof the recipient has that the
 * link did anything, and without it a shared link lands on a homepage that never mentions what was
 * promised.
 *
 * ⛔ **It states the offer; it does not promise the credit will apply.** Whether this particular
 * person qualifies is `checkReferral`'s answer at booking time — they may have booked before, or
 * be the referrer themselves. The wording is therefore what the code is *worth*, not what they are
 * *guaranteed*, and the checkout is where the server's verdict is shown.
 */
export const ReferralWelcome = ({ from }: { from?: string | null }) => (
  <div className="flex flex-wrap items-center gap-4 bg-primary px-4 py-3 text-primary-foreground md:px-8">
    <Gift className="h-5 w-5 flex-none" aria-hidden="true" />
    <p className="min-w-0 flex-1 text-sm leading-relaxed">
      <strong>
        {from ? `${from} sent you` : "You were sent"} R{REWARD_RAND} off your first clean.
      </strong>{" "}
      <span className="opacity-90">
        Enter the code at checkout and Xoot applies it — we confirm it before you pay.
      </span>
    </p>
  </div>
);
