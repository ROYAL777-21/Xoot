# Reward contribution check — 1 November 2026

The founder approved milestones at 12 paid-and-completed cleans, then another 24 (36 total).
The free-clean value is not yet defined. This calculation proposes one four-hour Regular clean
(current service price R250), with extras/upgrades separate. The founder corrects the original
proposal: the reward is separate from Care+ and does **not** itself waive the R39 booking fee.
Only an independently verified Care+ membership retains its existing fee waiver.
It is a decision aid, not a published entitlement or proof of company net profitability.

The calculation executes the current server `quoteBooking` and `xooterPayout`, at both the
20% earned commission floor and 35% starting commission. Xoot funds the full flat 10% Care+
discount; members pay no booking fee. No cadence-only prototype discount is assumed. Processor
cash cost uses [PayFast's card tariff](https://payfast.io/fees/), 3.2% + R2 excluding VAT, with
[15% VAT](https://www.sars.gov.za/tax-rates/other-taxes/) on the processing fee. Figures round
to cents. VAT recovery/output-tax status is not assumed. Real contracted fees must be checked
against the live merchant agreement before activation.

| Paid visits | Commission | Cash per visit | Worker per paid visit | Card fee incl. VAT | 12 visits less first reward | Next 24 less second reward |
|---|---:|---:|---:|---:|---:|---:|
| Regular, no Care+ | 20% | R289 | R200 | R12.94 | R747.98 | R1,660.70 |
| Regular, no Care+ | 35% | R289 | R162.50 | R12.94 | R1,235.48 | R2,598.20 |
| Regular, Care+ | 20% | R225 | R200 | R10.58 | **−R26.96** | R146.08 |
| Regular, Care+ | 35% | R225 | R162.50 | R10.58 | R460.54 | R1,083.58 |
| Express, no Care+ | 20% | R259 | R176 | R11.83 | R689.30 | R1,543.34 |
| Express, Care+ | 20% | R198 | R176 | R9.59 | **−R51.08** | R97.84 |

These columns exclude membership income, referral/credit funding, support, refunds/chargebacks,
payout fees, operations and tax. A paid R99 Care+ cycle contributes about R93.06 after the same
card tariff, before its other benefits/costs. The opening trial has no membership receipt;
do not assume every 12 visits earn three paid months. The welcome R30 is one-time and excluded
for onboarding-trial members, not renewed every billing cycle.

The honest answer is **conditionally profitable**: ordinary booking contribution can fund the
capped reward; the first Care+ reward can be negative before membership income and overhead.
Cheap/discounted qualifying visits must not unlock an unlimited ten-hour or crew clean. A cap
contains that exposure but does not guarantee profit; acquisition and operating costs still need
actual measurement. At the 20% floor, budget the proposed reward at R200 contractor cost.
For a nonmember, the R39 reward-booking receipt contributes R35.26 after its R3.74 card fee,
reducing the reward's net funding requirement to R164.74. A separate Care+ fee waiver removes
that receipt; its rows correctly retain the full R200 reward cost.

The earlier `docs/care-plus-unit-economics.md` is historical and assumes shared discount funding
and older fee-waiver/commission rules. It must not be used to approve this reward programme.
No reward interval after 36 or merchandise inventory is invented. Activation requires the
founder's benefit decision and an atomic paid/completed, refund/dispute-safe server ledger.
