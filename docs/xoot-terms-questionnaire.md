# Terms and conditions — what I need from you before drafting

You asked for terms drafted to South African law, in legal register, so an attorney can read
and grasp them quickly. That is the right instruction — a marketplace agreement written in
friendly product prose is harder to review, not easier, because the operative provisions get
buried. The draft will use defined terms, numbered clauses, and statutory cross-references.

Two things to set expectations honestly before the questions.

**This will need an admitted attorney to sign off.** Not a disclaimer for its own sake — the
specific reason is that several provisions here cannot be validly drafted around. The
Consumer Protection Act 68 of 2008 renders certain terms void regardless of what the contract
says (ss 48, 51), and the classification question below determines whether an entirely
different statute governs the relationship. A draft gets you 80% of the way and saves the
attorney's expensive hours for the 20% that actually needs judgement.

**One document is not enough.** What is actually required:

| Instrument | Parties | Why separate |
|---|---|---|
| Customer Terms of Use | Xoot ↔ customer | CPA applies in full; consumer rights are mandatory |
| Xooter Agreement | Xoot ↔ Xooter | Different party, opposite interests. Classification lives here |
| Privacy Notice | Xoot ↔ all data subjects | POPIA s18 mandatory disclosures. Cannot be a T&C clause |
| Operator Agreements | Xoot ↔ each processor | POPIA s21. Written, per processor |
| Booking Cover disclosures | Xoot ↔ customer | FAIS, if Xoot intermediates. See Q3 |

Putting the Xooter terms inside the customer terms is the most common mistake in this
category and it is the one that does the most damage in a dispute.

---

## The four questions that change everything

Answer these first. Each of them rewrites large parts of the draft, so drafting before they
are settled wastes the work.

### Q1. Are Xooters independent contractors or employees?

This is the single largest legal exposure in the business, and it is a business-model question
that the contract records rather than decides. South African law will not take the label at
face value.

- **Section 200A of the Labour Relations Act 66 of 1995** and **section 83A of the Basic
  Conditions of Employment Act 75 of 1997** create a **rebuttable presumption of employment**
  for persons earning below the BCEA earnings threshold — which will cover most Xooters —
  where any one of seven listed factors is present. Among them: the manner of work being
  subject to control or direction, hours being subject to control or direction, economic
  dependence on the other person, and provision of tools of trade.
- A platform that sets the price, assigns the job, sets the standards, rates the worker, and
  can deactivate them ticks several of those on its face.

If Xooters were held to be employees, the exposure includes UIF, COIDA, leave, notice,
severance, and unfair-dismissal claims — retrospectively.

**What I need:** which model you intend, and specifically who sets the price, who decides which
Xooter gets a job, whether a Xooter can decline freely without consequence, whether they may
work for competitors, who supplies equipment, and whether "deactivation" is contemplated. If
the intended answer is independent contractor, the product itself has to support that answer,
not just the contract.

*This is the question to take to an attorney first, before anything else in this document.*

### Q2. Is Xoot the principal or the agent?

Does the customer contract with Xoot for cleaning services, with Xooters as Xoot's
subcontractors — or does the customer contract with the Xooter, with Xoot providing the
platform and collecting payment on their behalf?

This determines: who is liable when a service goes wrong or property is damaged, who is liable
for the R VAT on the full booking value versus only on commission, whether the tip is Xoot's
income passing through or never Xoot's money, and what the invoice must say.

The tip decision already recorded (ZD-023 — Xoot takes no cut) points toward agency, but the
answer must be consistent across the whole model. It cannot be principal for liability and
agent for VAT.

### Q3. Booking Cover — is Xoot licensed to intermediate?

The brief records Booking Cover at R22, underwritten **by Genric**, with the provider
changing. Good: Xoot is not underwriting, which would require an insurance licence.

But offering, marketing, or advising on an insurance product to a customer is **rendering a
financial service** under the **Financial Advisory and Intermediary Services Act 37 of 2002**.
Doing so requires being an authorised FSP, or a representative or juristic representative of
one, and brings mandatory disclosures, record-keeping, and a complaints process.

**What I need:** Under whose FSP licence is Booking Cover offered — Xoot's, the insurer's, or
a broker's? And is it genuinely optional? The brief describes it as "flat, preselected", and a
preselected financial product carries its own problems under both FAIS and CPA s41
(misleading representations).

### Q4. Who holds the money, and for how long?

If Xoot receives customer funds and later pays Xooters, Xoot may be operating as a payment
intermediary. The South African Reserve Bank's position papers on the National Payment System
distinguish between receiving funds **as agent of the beneficiary** and receiving them **as
agent of the payer**, and the treatment differs. Holding funds materially before settlement
raises the question sharply.

**What I need:** the intended flow — does money move customer → payment provider → Xooter
directly, or customer → Xoot → Xooter? What is the settlement delay? Is there any hold or
reserve? This also decides the tip payout path currently open in `blocker.md`.

---

## Then these

### Identity and entity

1. Registered legal name, company registration number, and registered address.
2. VAT registration status and number, if registered. Turnover above R1 million in any
   12 months makes registration compulsory.
3. Registered POPIA Information Officer — full name and Information Regulator registration.
4. Trading name and domain, once registered.
5. Physical address for service of legal process, and an email address for legal notices.

*Items 1–4 are also mandatory disclosures under section 43 of the Electronic Communications
and Transactions Act 25 of 2002 for anyone offering goods or services electronically.*

### Cancellation, refunds, no-shows

6. Customer cancellation: how far ahead is free, what is charged after that? **CPA s17** gives
   a consumer the right to cancel an advance booking subject to a *reasonable* cancellation
   charge, and reasonableness is judged on the statutory factors, not on what the contract
   says. What is your intended schedule?
7. **ECTA s44** gives a seven-day cooling-off right for electronic transactions, with
   exclusions — including services that have begun with the consumer's consent. How do you
   want that handled for same-day bookings?
8. Xooter no-show or late arrival — what is the customer entitled to?
9. Customer no-show or no access on arrival — is the Xooter paid, and by whom?
10. Service quality complaints — what is the remedy? Re-clean, partial refund, full refund? Is
    there a window?

### Care+

11. Care+ is a subscription. **CPA s14** governs fixed-term agreements: maximum 24 months, the
    consumer may cancel on 20 business days' notice, and a reasonable cancellation penalty may
    apply. Is Care+ fixed-term or month-to-month?
12. What exactly is promised — and is every promise something the system can currently
    deliver? Under **CPA s41** a representation that cannot be honoured is a prohibited
    misleading representation, not marketing latitude.
13. The R99/month offer positioned as a 50% discount off the original: what is the original
    price, and has it actually been charged at that level? Presenting a price as a discount
    off a price never charged is prohibited under **CPA s30** (bait marketing) and s41.
14. The R20 credit — expiry, transferability, refundability, and what happens on cancellation.

### Liability, damage, and safety

15. Property damage during a service — who is liable, up to what limit, and how is it claimed?
16. Theft allegations — what is the process, and what does Xoot commit to?
17. Injury to a Xooter at a customer's property — who carries it? If contractor, they are
    outside COIDA and this needs an answer.
18. Limitation of liability: note that **CPA s51** voids terms purporting to exclude liability
    for gross negligence, and **s61** imposes strict liability on the supply chain for harm
    caused by unsafe goods or services regardless of fault. The clause has to be drafted
    inside those limits rather than against them.

### Access, keys, and the sensitive data

19. May a Xooter hold keys, and under what conditions?
20. Gate codes and alarm codes — what does Xoot commit to about storage, who may see them, and
    how long they are retained? This is both a contract term and a POPIA question, and given
    what the data is, it deserves an express clause rather than a general security statement.
21. Retention period for access credentials after a booking completes, and after an account
    closes.

### Conduct and termination

22. Grounds on which Xoot may suspend or terminate a customer account, and a Xooter account.
    Note the interaction with Q1: broad unilateral deactivation rights are one of the facts a
    court weighs on classification.
23. Is there an internal dispute process before legal proceedings?
24. Dispute resolution: courts, or arbitration? Note that a consumer retains the right to
    approach the National Consumer Commission or a consumer court regardless, and cannot
    contract out of it.
25. Governing law and jurisdiction — presumably South African law and the SA courts. Confirm.

### Data and privacy

26. Which processors receive personal information, and which store it outside South Africa?
    Each one outside triggers the **POPIA s72** assessment.
27. Retention periods, by data category.
28. Marketing consent — POPIA s69 restricts direct electronic marketing to non-customers
    without consent, on an opt-in basis.
29. Is any automated decision-making used in a way that affects a person? **POPIA s71**
    restricts it, and Xooter verification is exactly such a case — see
    `docs/xoot-verification-automation.md`, which is built to stay on the right side of it.

### Consent mechanics

30. ZD-021 records that terms are accepted implicitly at sign-up behind a visible linked
    notice. For that to be defensible you need a stored record of **which version** was
    accepted and **when**, per user. It is not built yet. Do you want version-and-timestamp
    capture, or an explicit tick?
31. How are material amendments communicated, and what notice period applies?

---

## Additions I would make that you have not asked for

- **A separate Xooter Agreement, drafted first.** It carries the classification risk, and the
  customer terms have to be consistent with whatever it says. Drafting the customer terms
  first and retrofitting is how the two end up contradicting each other.
- **A plain-language summary alongside the legal text.** You want law jargon for the lawyers,
  and that is right for the operative document. But a consumer contract in South Africa is
  subject to **CPA s22**, the right to information in plain and understandable language, and a
  term a consumer could not reasonably be expected to understand is at risk. The answer is not
  to soften the legal text — it is to publish a short summary next to it. Both, not either.
- **Service-specific annexures.** Cleaning, laundry, moving, elder care, and Airbnb turnovers
  carry different risks. Put the common terms in the body and the differences in annexures, so
  adding a service later does not mean reopening the whole contract.
- **A record of what was agreed, retained per booking.** Terms change. In a dispute two years
  from now the question is what the terms said on the day, so store the version reference on
  the booking, not just on the user.

## How I will draft it

On your answers to Q1–Q4 plus the numbered items, in this order:

1. Xooter Agreement — because classification governs everything downstream.
2. Customer Terms of Use.
3. Privacy Notice, aligned to the POPIA s18 disclosure list.
4. The plain-language summaries.
5. A schedule of the operator agreements still needed, per processor.

Every clause that depends on an unanswered question will be flagged inline as `[FOUNDER
INPUT — ...]` rather than filled with a plausible guess, so nothing reaches an attorney
looking settled when it is not.
