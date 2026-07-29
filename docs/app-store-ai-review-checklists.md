# App Store, Play Store, and AI Review Checklists

These checklists are for the Xoot PWA/native path and should be completed before submitting iOS or Android builds.

## Apple App Store Review

- Use a real production domain and working demo account.
- Provide reviewer notes explaining that Xoot connects clients with independent home-care contractors.
- Include privacy policy and terms links in the app and App Store Connect.
- Do not claim employment, insurance, background checks, or replacement guarantees beyond approved policy support.
- Ensure login, forgot password, Google auth, Apple auth, and account deletion/correction paths work.
- Use Apple Sign In if Google/social sign-in is available in the native iOS app.
- Generate and deploy `/.well-known/apple-app-site-association` with the final Apple Team ID and bundle ID.
- Confirm iOS associated domains include the production domain and open booking/auth/support routes in the native shell.
- Do not show broken payment, booking, or subscription flows. Use safe unavailable states until providers are live.
- Explain data collection: names, contact details, addresses, booking notes, contractor documents, payments, support records, and device/session data.
- Avoid collecting gate codes or ID documents before the user understands why the data is needed.
- Make support contact details visible.
- Confirm push notification permission prompts are contextual, not shown on first launch without reason.
- Confirm haptics are subtle and do not interfere with accessibility.
- Confirm no debug builds, console secrets, staging banners, or test credentials ship to production.

## Google Play Review

- Complete the Data Safety form accurately.
- Include privacy policy URL and support contact.
- Declare account creation, account deletion, and data correction methods.
- Declare location/address usage only for booking and contractor matching, not unrelated tracking.
- Declare photos/uploads for contractor verification or before/after proof only where implemented.
- Generate and deploy `/.well-known/assetlinks.json` with the final package name and release signing certificate SHA-256 fingerprint.
- Confirm Android app links open booking/auth/support routes in the native shell.
- Do not request SMS permissions for routine Xoot messaging; Twilio SMS is not part of the approved Xoot scope.
- Use secure storage for auth tokens in native builds.
- Avoid logging sensitive data, gate codes, payment references, ID numbers, or support allegations.
- Confirm app content, screenshots, and metadata do not make unsupported guarantees.
- Confirm production API endpoints use HTTPS and certificate validation.
- Confirm Play Integrity/App Check strategy before high-risk production payment or document flows.

## AI Usage Review

- Disclose meaningful AI-assisted features where users would reasonably expect it.
- Do not present AI output as verified operational truth unless it comes from a source-of-truth state.
- Keep AI agents least-privilege: marketing cannot access ID documents; support cannot approve high-risk refunds without human review; coding agents cannot access production secrets by default.
- Do not let AI invent reviews, contractor credentials, verification status, legal claims, insurance claims, replacement guarantees, or booking availability.
- Require human review for safety incidents, account bans, refunds above threshold, payout changes, legal-sensitive replies, public claims, and bulk outreach.
- Do not send raw gate codes, ID documents, selfies, bank details, or support allegations to AI tools unless a privacy-reviewed workflow explicitly allows it.
- Moderate generated content before publication.
- Store prompt logs carefully and redact secrets, gate codes, full addresses, ID numbers, and bank details.
- Tell users when a recommendation is a concierge-style suggestion, not a confirmed booking state.
- Maintain fallback paths when AI suggestions are unavailable or low confidence.

## Sources to Review Before Submission

- Apple App Review Guidelines: https://developer.apple.com/app-store/review/guidelines/
- Apple Universal Links: https://developer.apple.com/documentation/xcode/supporting-universal-links-in-your-app
- Android App Links: https://developer.android.com/training/app-links
- Google Play AI-generated content policy: https://support.google.com/googleplay/android-developer/answer/14094294
- Android Data Safety: https://developer.android.com/privacy-and-security/declare-data-use
- OWASP Mobile Top 10: https://owasp.org/www-project-mobile-top-10/
