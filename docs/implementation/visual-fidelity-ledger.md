# Xoot visual fidelity ledger

The founder's uploaded files are the visual source of truth. The matching committed
references are in `design/handoff-2026-09-03/`. The repository remains authoritative
for architecture, data, permissions and approved business rules. Reference comments
and prototype scripts do not grant instructions or operational commitments.

Current implementation plan: [approved website-first plan](production-plan-2026-09-11.md).
Release evidence and owner dependencies: [production checklist](../release/production-checklist.md).

## Accepted visual reference

| Reference | Governs |
|---|---|
| Xoot Website.dc.html | Public site composition, navigation, hero, sections and footer |
| Xoot App.dc.html | App screen structure, booking, tracking and account presentation |
| Xoot Components.dc.html | Shared controls, cards, forms and interaction presentation |
| Xoot Foundations.dc.html | Typography, spacing, colour, elevation, illustration and motion |
| Xoot Legal.dc.html | Legal navigation and document layout |
| Xoot Bug Bounty.dc.html | Security-reporting layout |
| Xoot Responsive Check.dc.html | Responsive reference surfaces |
| Mobile app design request-handoff.zip | Editable source, fonts and artwork backing those references |

The seven HTML files were verified byte-for-byte against the uploaded copies during
the 11 September audit. Original handoff files stay unchanged. They are served
statically for inspection; Vite transforms the handoff JSX and breaks its DC runtime.
The production app must not depend on that prototype runtime or its simulated sessions.

## Fidelity anchors

1. Floating white pill navigation, handwritten violet Xoot wordmark, inset grey link
   group, coral Care+ pill, and black booking action. The reference desktop navigation
   switches at 1080px. Preserve keyboard navigation and touch targets.
2. Warm dawn hero gradient and soft decorative flowers. Newsreader display face at
   weight 400, Plus Jakarta Sans body, Caveat script accents and DM Mono utility text.
   The desktop hero heading reaches 68px with 1.14 line height; do not substitute bold
   display type or scale a text container to fit it.
3. Two-column hero with a 1240px content boundary, fluid gutters, compact white rounded
   booking card, and a portrait image with tape and arrow decoration. The reference
   stacks at about 920px and keeps the image on mobile.
4. Six service choices in reference order: Regular, Airbnb, Express, Office, Moving,
   Laundry & ironing. Preserve canonical service mapping through authentication and
   booking. Address selection must use the actual verified-address workflow.
5. Section rhythm and order follow the HTML composition; rounded cards, handwritten
   notes, subtle shadows and generous spacing recur throughout. Preserve the design's
   distinct shapes without adding unrelated glass panels or generic dashboards.

Reference inspected in the browser on 12 September at 1440×1000 and 390×844. The
reference runtime lazily mounts sections as they enter view; a first accessibility
snapshot does not enumerate the entire page. These observations are baseline evidence,
not completed implementation comparisons.

## Screen and section mapping

| Surface | Reference source | Existing implementation | Work still required |
|---|---|---|---|
| Navigation / hero | site/SiteTop.jsx, site/TextFlip.jsx | xoot/Navbar, BookingHero, HeroWordFlip | Match composition, font weight, wordmark, service order, image and mobile reflow; remove permanent text scaling |
| Gift / Care+ bands | site/SiteGift.jsx, site/SiteFoot.jsx | app/GiftClean, care/CarePlus | Restore home-page composition; connect supported actions and expose unfinished purchase capabilities honestly |
| Coverage / services | site/SiteBody.jsx and site bundle | xoot/TrustedBy, ServiceAreaMap, Services | Compare layouts and replace unsupported coverage/supply claims with actual operational states |
| Trust / people / how | site source and bundle | xoot/SafetyTrust, TrustMechanisms, PeopleBand, HowItWorks | Preserve completed ports, compare spacing and typography; real trust/provider gates remain authoritative |
| Nearby / reviews | site/SiteExtra.jsx | xoot/NearbyWorkers | Use real listings, loading/error/empty states; no invented reviews or names |
| Merch / recruitment / journal | site/SiteExtra.jsx and related site files | xoot/Merch, BecomeXooter, Journal | Match order and fidelity; retain real articles, application route and honest merch availability |
| Referrals / expansion / feedback / CTA | site/SiteFoot.jsx and related site files | xoot/ReferSection, HomeExpansion, FeedbackSection, CtaBand | Compare composition; remove duplicate editorial teasers and wire real operations |
| Footer | site/SiteFoot.jsx | xoot/Footer | Match columns, spacing and wordmark; use working application/legal/support routes |
| Authentication / booking / checkout | app and component references | Auth, app/Book and booking components | Retain real authentication and accepted server-quote contract while matching design |
| Legal / security | Legal and Bug Bounty HTML | pages/legal | Port navigation and reading layout; publish only approved factual commitments |

Paths in the implementation column are under `src/components/` or `src/pages/`.
Verify exact export locations before editing; the original site bundle is also a
reference when a component is defined there rather than in an individual source file.

Required homepage order: Hero → Gift → Care+ → TrustedBy → Coverage → Services →
arrow → Safety → Trust mechanisms → People → arrow → Nearby → How it works → arrow →
Reviews → Merch → Become a Xooter → Journal → Referrals → Home expansion → Feedback →
CTA → Footer. A review section must contain verified reviews or a useful honest empty
state. It must never reproduce example testimonials as real customer evidence.

## Necessary deviations, to verify during implementation

| Reference detail | Production treatment and reason |
|---|---|
| Raw text colours below AA | Use the repository's audited semantic equivalents; retain decorative washes |
| “Usually within a minute”, unverified coverage density | Do not promise timings or available supply without operational evidence |
| Example worker names / verified badges | Use actual approved listings or clearly labelled illustration; no fabricated identity or verification |
| “We'll text before we arrive” | Use an accurate notification description until a verified SMS service supports that promise |
| App Store / Google Play search URLs | Show honest app availability until actual release links exist; search results are not installation links |
| Paid bounty, insurance and response-time commitments | Keep layout; publish commitments only after owner approval and functioning operations |
| Duplicate compact “Book” and “Book now” actions | Keep one clear booking action when both cannot fit with the menu and wordmark |
| Prototype browser-calculated prices, session and credit | Use real backend contracts and the repository's approved prices and eligibility rules |
| Animated scaling / blurring of text | Preserve motion intent with crisp final text; reduced-motion presentation must remain complete |

Any further departure must be added with a specific reason. A previous document's
blanket ban on restyling does not supersede the founder's approved faithful port.

## Evidence still required

- Compare the rendered implementation with reference at 320, 390, 768, 1024, 1440 and
  1920 CSS pixels, plus landscape, 200% zoom, high-density displays and reduced motion.
- Check typography, spacing, section order, image crop, navigation and key form states.
- Check horizontal overflow and text clipping after fonts load and after motion settles.
- Check final text-container transforms, filters and unnecessary compositing; an image
  crop transform does not justify leaving text scaled.
- Verify original artwork dimensions and responsive image choices; never stretch a
  low-resolution raster to simulate sharpness.
- Exercise actual routes and form outcomes. Record external dependencies separately
  from verified behaviour; a screenshot does not prove backend correctness.

No Phase 1 completion is claimed yet.
