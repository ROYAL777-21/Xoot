# Notifications handoff comparison

Source: `design/handoff-2026-09-03/xoot/app/Search.jsx`, `NotificationsFeedScreen`,
with the original Frame and design tokens. The reference is unchanged.

- [Original 390px reference](reference-notifications-390.png).
- Actual web components: [320px](notifications-320x844.png), [390px](notifications-390x844.png),
  [768px](notifications-768x844.png), [1024px](notifications-1024x844.png),
  [1440px](notifications-1440x1000.png), [1920px](notifications-1920x1080.png),
  [landscape 844×390](notifications-844x390.png).
- [Measurements and interaction results](evidence.json), captured 2 October SAST.

These captures render the actual NotificationsFeed, NotificationBell, owner-bound hook,
data handlers and AppShell with isolated synthetic authentication/database adapters.
The test records deliberately identify themselves as synthetic. No records were inserted
into staging or production, and these images do not establish authenticated live delivery.
The original reference includes its prototype records and a 20px outer preview offset;
the website does not add a fake native status bar.

The screen preserves the source fonts, quiet Back control, 40px pastel icon wells, 16px
card padding, unread elevation, read outlines and compact relative times. Exact timestamps
remain available through accessible detail. The Home link retains the original 44px control
and decorative 8px dot; its exact whole-history unread count is a real accessible description.
All seven sizes passed overflow, runtime-error, geometry and interaction checks, with no
persistent heading transform or filter. Browser QA covers initial/older pages, mark-all,
confirmed safe destination, empty state, Back/Home entry and retry.

The bounded implementation and fix passed 77 focused tests across eight files, web
typecheck and scoped lint. Independent spec/quality review passed after fixing the
inaccessible count and removing the independent legacy native push listener. Ordinary
app/auth deep links and viewport behavior have covering tests.

The web feed uses real owner-filtered queries and confirmed writes. Realtime delivery is
not verified: the table is absent from both environments' realtime publications. Excess
TRUNCATE/TRIGGER privileges on notifications/push_tokens also need a reviewed migration.
The optional legacy Capacitor alert entry accurately reports unavailable; it requests no
permission or registration. Full Expo push ownership, provider configuration, device-token
revocation and device delivery remain unfinished. See the [current production checklist](../../../production-checklist.md).
