# Design references

Reference apps the founder has pointed at, and **the specific thing to take from each** —
not the vibe, the mechanism. Sourced from Mobbin screenshots shared 2026-07-29.

> **The screenshots themselves are not in the repo.** They were shared in-session and a
> Claude Code session cannot write pasted images to disk. What follows is the extraction.
> If you have the originals, drop them in this folder alongside this file — the notes are
> the actionable part, but the images settle arguments the notes can't.

---

## The decided direction

**Vibrant. Red and white primary.** Glassmorphic surfaces, a floating dock, staggered cards,
rounded friendly type. See `docs/xoot-master-brief.md` §3 for the full write-up including
the traps (brand red vs error red, white-on-red contrast, large-area saturation fatigue).

---

## Per-reference extraction

### Headspace — mascot motion and onboarding
**Take:** the mascot as a *continuous presence* that transitions and animates **between**
onboarding steps, not a static illustration dropped on each screen. The reference frame
shows the character as a full-bleed shape occupying the lower half with the copy above it —
the character *is* the layout, not decoration inside it.

Also: one question per screen, warm, conversational, unhurried. This is the model for
gathering the user's type and home details.

**Applies to:** Zoey through Phase 1 onboarding (§5.1a), splash screen (§3.5).
**Don't take:** Headspace's orange. Ours is red.

### Tiimo — typography and input treatment
**Take:** the rounded, friendly typeface register, and the **rounded on-screen keyboard
treatment** for text inputs. Note in the reference how the input composer sits in its own
raised rounded surface above the keyboard, with inline chips (`ANYTIME`, `NO`, `…`) and a
circular send affordance — the input is a *card*, not a bare field.

Also worth stealing: the collapsible labelled section headers (`ANYTIME (1)`,
`MORNING (2)`) with per-section add buttons. That is a good pattern for booking add-ons.

**Applies to:** type tokens, all text inputs, add-on selection UI.
**`CONFIRM`:** exact typeface not identified from the screenshot. Match the register or
confirm the family before it enters a token file.

### Zocdoc — permission priming
**Take:** the permission screen structure, verbatim as a pattern —
illustration → benefit-led headline → one supporting line naming the concrete outcome →
filled primary button → plain-text secondary that is genuinely easy to hit.

Reference copy: *"Get notified about your appointments and more"* /
*"Stay on top of your health with important appointment and wellness reminders."* /
`Turn on notifications` / `Not now`.

Note the secondary is real text, not a greyed-out trap.

**Applies to:** every permission request (§5.5). Never a bare system prompt.

### Gentler Streak / Hims — form and sheet structure
**Take:** the bottom-sheet row pattern — grouped rounded rows, one concern per row, chevron
affordance, `Optional` labelled explicitly where it applies. The Hims "Add Workout" reference
shows a clean version: grouped rows, then a distinct card for the subjective slider question
("How did it feel?") with its own descriptive label under the value.

That slider-with-live-description pattern maps directly onto **the booking hours picker** —
which needs exactly that: a slider whose current value carries a plain-language consequence
underneath, including the below-recommended warning.

**Applies to:** hours picker (§4.1), Care+ benefit rows, booking detail sheets.

### Headway — content card and dual-CTA
**Take:** the card-with-cover layout and the paired-CTA treatment (one quiet, one filled)
where two actions are legitimately equal. Also the compact metadata row
(`10 key points · 14 min · 10 insights`) — three facts, iconised, one line.

**Applies to:** Xooter profile cards, service cards, Phase 7 training modules.

### ElevenLabs — dock navigation
**Take:** the floating, rounded, glassy dock instead of a flush tab bar.
`src/styles.css` already ships `--glass-blur` and `--glass-opacity` — reuse those tokens
rather than introducing a second blur system.

**Applies to:** app-wide primary navigation.

### SweepSouth — booking flow structure only
**Take:** the *flow structure* of the booking journey. Standing instruction from the brief,
restated because it has been misread twice: SweepSouth is a **UI/UX flow reference only**.
Not its visual style. Not its upload feature. See §7.

---

## Still open

- Tiimo's exact typeface (above).
- Splash duration, and whether the fly-away plays on every cold start or first run only.
  Recommendation in §3.5: full on first run, shortened or skippable thereafter.
- Whether the red/white system needs a third accent for the 19 service categories already
  colour-coded in `src/lib/service-visual.ts`. Those are currently 19 distinct vibrant hues
  and will fight a red-primary system if left untouched.
