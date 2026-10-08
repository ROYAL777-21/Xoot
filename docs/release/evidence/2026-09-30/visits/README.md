# Visits list visual check — 30 September

The original visual source is `design/handoff-2026-09-03/xoot/app/Visits.jsx:140` plus its
primitive definitions in `xoot/ds-bundle.js`. Both the unmodified source and the actual new
`Bookings.tsx` component were rendered in Chromium at 390 pixels for comparison.

- [Original upcoming list](reference-upcoming-390.png)
- [Implemented upcoming list](implemented-upcoming-390.png)
- [Original past list](reference-past-390.png)
- [Implemented past list](implemented-past-390.png)
- [Six-width measurements](evidence.json)

These are **isolated component checks with synthetic account records**. Authentication and
database adapters are replaced in the temporary local harness only; those fixtures are not
part of the shipped website. The surrounding AppShell is excluded. The hosted homepage
screenshots in the parent directory are separate actual Vercel captures.

Upcoming, past and empty controls rendered at 320/390/768/1024/1440/1920, with no page errors
or horizontal overflow. The heading resolves to Newsreader, without a transform or filter.
Original tabs, service icons, card geometry, avatars, verified marks and rating colours match
the supplied composition. Real service/status/name/date/payment text replaces prototype data;
long text wraps. Unsupported helper suburb and same-helper availability claims are omitted.

Fourteen focused component tests, web typecheck and scoped lint pass. Independent review found
and verified fixes for generic service-field and subtotal-as-payment defects. Historical paid
amounts are not net of separately processed refunds. Live authenticated roles, crew/detail/rating
journeys, full AppShell and native rendering remain outside this bounded check.
