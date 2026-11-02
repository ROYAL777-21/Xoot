# Xooter navigation handoff

The founder requested the worker sidebar and tab bar follow the approved handoff. The mobile
dock uses the original Frame/TabBar geometry: floating glass,5px padding,56px controls,16px
side insets,14px bottom inset plus the device safe area, source typography and restrained icon
weights. Desktop adapts those tokens into a warm card sidebar with the original wordmark and a
static handoff flower. Private workspace surfaces inherit the existing light/dark theme.

All six existing destinations remain: Dashboard,Jobs,Training,Earnings,Verification,Profile.
Mobile retains four direct work destinations and exposes Profile,Verification and sign-out
through a native You disclosure. Enter opens it; Escape closes and returns focus; an outside
tap or destination change closes it. The shell remounts its presentation on owner changes and
retains the original owner-aware sign-out handler. No backend read/write, verification state,
worker activation, earning amount, route permission, public-page theme or provider call changes.

`XooterShell` preserves its children API and adds optional `updatesAvailable=false`. The
separate notification release can set `<XooterShell updatesAvailable>` on its existing worker
routes when `/xooter/updates` actually ships. This standalone change exposes no dead Updates
link. The fixture exercises that enabled presentation, without declaring the real route live.

Seven focused cases cover routes, mobile account reachability, Updates gating, account-switch
cleanup and existing sign-out success/failure boundaries. Six initial cases fail against the
old layout. The isolated Chromium check renders the actual shell with a synthetic provider;
320/390/768/1024/1440px light and390/1440px dark cases pass. It checks current-page links,
44px targets, no horizontal overflow, source fonts, changing private theme surfaces, keyboard/
outside-tap behaviour and content clearance above the dock. No framework overlay, console
error or external/backend request occurs. Desktop account-disclosure fields in the evidence
are not applicable; those controls remain directly in the sidebar.

The responsive script uses a temporary isolated Vite cache and deletes only its own verified
temporary fixture folder. Run `node scripts/ops/verify-xooter-navigation.mjs`; optionally set
`XOOT_NAV_EVIDENCE_DIR` to an absolute folder outside the repository to retain screenshots.
The required redesign release workflow runs the same check. No dependency was added.

This is navigation/rendering evidence, not a genuine worker JWT, physical-device, full inner
screen or native app acceptance. Current release state remains in `production-checklist.md`;
the parent release session owns cross-review, merge, deployment and served-source verification.
