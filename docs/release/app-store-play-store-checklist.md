# App Store and Play Store Rejection-Prevention Checklist

Sources reviewed on 2026-05-27:

- Apple App Review Guidelines: https://developer.apple.com/app-store/review/guidelines/
- Google Play AI-generated content policy: https://support.google.com/googleplay/android-developer/answer/14094294
- Android Data Safety: https://developer.android.com/privacy-and-security/declare-data-use
- OWASP Mobile Top 10 2024: https://owasp.org/www-project-mobile-top-10/

## Shared Submission Checklist

- Test the production build for crashes, blank screens, broken routing, failed sign-in, failed booking, failed support submission, and failed payment return states.
- Provide a complete reviewer demo account for client, Zooter, and host/office flows if those roles are reviewable.
- Keep backend services live during review, including auth, booking mocks/seed data, support, payment test modes, and push notification endpoints where applicable.
- Explain non-obvious features in review notes: Care+, Home Memory, Favourite Zooter, ZootCred, host/office dashboards, AI-style reminders, and support escalation.
- Make app metadata accurate: screenshots, privacy labels, subscription price, billing terms, support links, account deletion flow, and contact information.
- Remove placeholder text, staging banners, test-only credentials, unapproved third-party logos, unsupported guarantees, and internal admin/debug UI.
- Ensure all claims are supportable: do not claim guaranteed replacement, full insurance, criminal-background coverage, or named vendor checks unless the production process supports it.
- Make terms, privacy policy, POPIA handling, cancellation policy, refund policy, and contact details easy to find.

## Apple App Store Checklist

- App must be useful, complete, and stable; do not submit a shell, broken web wrapper, or unfinished marketplace flow.
- If the app requires login, provide App Review with active credentials or a fully-featured demo mode.
- App information and metadata must be complete and accurate, including Care+ R99/month and any subscription details.
- In-app purchase rules must be reviewed before selling digital memberships through iOS. If Care+ is sold as a digital subscription in the iOS app, use the correct Apple purchase flow unless legal/product counsel confirms an exception.
- User-generated content areas such as reviews, support messages, profile bios, and chat must include filtering, reporting, blocking or moderation paths, and published contact details.
- Do not include offensive, discriminatory, unsafe, deceptive, or misleading generated/support content.
- Ask only for permissions that are needed, and explain why location, photos, camera, notifications, or contacts are needed at the moment of request.
- Keep sensitive home access notes out of notifications, emails, SMS, lock screen previews, and screenshots.
- Provide account deletion support and avoid dark patterns for subscription cancellation.
- Remove debug menus, development payment providers, and private API keys from the shipped app.

## Google Play Checklist

- Complete the Data safety form accurately for every data type collected or shared, including third-party SDK behavior.
- Declare location, personal info, financial info, photos/videos, files/documents, app activity, device identifiers, and diagnostics where applicable.
- Make privacy policy and data deletion details accessible from the store listing and inside the app.
- If AI generation becomes a central app feature, comply with Google Play's AI-generated content policy and user feedback requirements.
- Ensure AI-generated or AI-assisted outputs cannot create prohibited content, scams, harassment, deepfake sexual content, deceptive election content, malicious code, or fake official documents.
- Keep payments compliant: do not bypass required billing rules for in-app digital goods, and ensure physical service payments are clearly described.
- Avoid deceptive behavior: no fake reviews, misleading rankings, manipulated ratings, hidden data collection, or false trust/safety claims.
- Remove unused permissions and justify every permission in user-facing copy.
- Protect mobile credentials against OWASP Mobile Top 10 risks: improper credential usage, insecure auth/authorisation, insecure communication, privacy control gaps, insecure storage, and weak cryptography.
- Test app bundle signing, production keystore handling, version codes, target SDK requirements, and release track configuration.

## Zoot-Specific Release Gates

- Care+ copy says priority replacement support, not guaranteed replacement.
- Home Memory stores access notes securely and avoids exposing gate/lockbox codes outside the app.
- Favourite Zooter flow uses personal CTA copy such as `Book Nomsa again` but respects availability.
- ZootCred and R30 add-on credit terms explain eligibility, expiry, and completed-booking requirement.
- Host and office dashboards do not expose tenant/client/staff details beyond the current account's scope.
- Support escalation has a human-review path for refunds, damage, theft, harassment, safety, no-shows, cancellation, and access-code issues.
- Haptics are subtle, optional, degrade gracefully, and do not block core actions on unsupported devices.
