# Native authentication readiness — source only

PR94 is stacked on website PR92 so mobile authentication remains separate from website publication.
Its native source at be3bd74 received independent review across ten changed paths, with 21 synthetic
assertions passing and no introduced correctness/privacy blocker. Two pure regression suites pass
18 tests; the slow pending-exchange case failed against the previous implementation. Root/mobile
TypeScript checks pass. These are not Expo lifecycle, provider-token or device acceptance tests.

The signed-in Expo dashboard actually shows owner **don-pacho777**, project slug **zoot**, ID
**b4c6e0b8-e2e7-40c5-b259-3b34c79be30b**, and a link to the correct GitHub repository. The config
already used that ID but said slug xoot and left owner implicit. The d7c84d8 follow-up aligns the
slug/owner and non-secret example with the existing project, preserving installed Xoot display
names, za.co.xoot.app / preview identifiers, callback schemes and update target. No remote rename
or new project/account was performed. Actual local Expo public-config resolution confirms the
expected owner/slug/ID and unchanged preview identifiers. Existing identity checks 5/5, mobile
TypeScript and scoped lint pass. Independent review also checked the four environments and
owner fallback/explicit override, with no blocker.

The native Apple path generates a cryptographic raw nonce and state, passes SHA-256 nonce to
Apple, verifies returned state, exchanges the identity token using raw nonce and requires an actual
Supabase session. iOS uses the official Apple button; Android retains browser authentication.
PKCE callbacks are restricted to the exact allowed app route, reject legacy implicit tokens and
ambiguous/malformed codes, and coalesce browser/deep-link delivery while an exchange is pending.
The bounded completed-entry cache retains no access/refresh tokens. None of this proves an actual
Apple JWT, cold start, platform entitlement or signed device journey.

The current Apple account has no active Developer Program membership. The founder explicitly
selected **keep Apple pending**; no enrolment, agreement, purchase or repeated membership request
is needed. Production Auth currently reports Apple disabled. No build, signing credential,
store submission, provider activation or paid service was requested. Signed preview builds,
callback allowlist/association verification and authorised iOS/Android devices remain future gates.
Native email UI also needs acceptance against the actual code-based email setup; source Apple
hardening does not complete native email or native voice/chat. Required GitHub checks cannot start
because of account billing/spending restrictions; the founder requires retaining the current plan
and limit.

Primary references read before edits:
[Expo v56 AppleAuthentication](https://docs.expo.dev/versions/v56.0.0/sdk/apple-authentication/),
[Expo v56 AuthSession](https://docs.expo.dev/versions/v56.0.0/sdk/auth-session/),
[Expo v56 app configuration](https://docs.expo.dev/versions/v56.0.0/config/app/).
