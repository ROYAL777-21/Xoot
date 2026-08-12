# Design source

## `Xoot_App.html`

The Xoot app UI kit, exported from Claude Design (project
`ed20677b-1f0c-4bd4-92c8-3a3d6de253ca`). Committed because the `DesignSync` MCP tool
needs `/design-login`, which requires an interactive terminal — remote and CI sessions
cannot reach the project, so the export is the only durable copy.

It is a self-extracting bundle: 2.9 MB, one line of payload. **Do not open it whole.**
Each entry in the asset map is base64-encoded gzip:

```python
import base64, gzip, json, pathlib
src = pathlib.Path("design/Xoot_App.html").read_text()
blob = next(l for l in src.split("\n") if l.strip().startswith('{"') and '"data"' in l)
for key, entry in json.loads(blob).items():
    raw = base64.b64decode(entry["data"])
    if entry.get("compressed"):
        raw = gzip.decompress(raw)
    # entry["mime"] tells you what it is — text/javascript or font/ttf
```

26 assets: 7 authored app modules with readable header comments, 3 vendor bundles, and
7 TTF fonts. 197 components across 35 screens.

**Its palette is not the shipped one, and the difference is not the one it looks like at
a glance.** The kit's UI is **violet** (`--xoot-violet-500` `#7C5CFC`) for brand emphasis,
selection and progress, with **ink** (`#151515`) as the primary commit button — the Tiimo
pattern — on a warm neutral page (`#F5F3F2`). Red is not the UI colour: the kit reserves
its red family for Care+ alone, and says so in a comment beside the tokens — "Care+ · the
MEMBERSHIP red. Xoot's UI is violet; Care+ is red, always. Use only for subscription
surfaces: badge, paywall, the '+' mark, plan savings." Coral (`#E64B36`) is one of the
pastel tint-set colours, not the brand.

`src/index.css` is currently red-primary on near-white (`#e42a21` / `#fff7f5`) and the
native app is pinned dark. Adopting the kit therefore changes three things, not one: the
brand colour, the primary action colour, and the default scheme (the kit is light by
default with a `[data-theme="dark"]` opt-in that redeclares semantic aliases only). See
`docs/xoot-ios-build-prompt.md`.

---

## The design operating system

Salvaged from PR #25 on 2026-08-12 and rebranded. That PR was a four-week-old draft carrying an
`apps/web` / `apps/mobile` / `apps/admin` monorepo layout this repository does not have and never
adopted, plus edits to three workflow files and `blocker.md` that have all moved on since. The
21 documents below were the only part still worth having, so they were taken and the rest closed.

⚠️ **They predate the Zoot → Xoot rename**, and a handful still say "Zoot" — `PHASE-1-AUDIT.md`
most of all, which is a point-in-time audit and is left as written rather than retconned. Read the
brand name as Xoot; read the audit as a July snapshot.

⚠️ **They also predate `Xoot_App.html`** above, which is the newer authority on colour. Where the
two disagree — and on the brand colour they do — the exported kit wins. See the note above on
violet versus red.

This directory is the design authority for Zoot. It governs the React/Vite website and web app, the Expo customer and Zooter experiences, and the web operations and administration surfaces.

### Product thesis

Soft surfaces. Clear decisions. Confident service.

### Approval rule

Implementation may be inspired by Figma, but it may only claim design approval when a frame is labelled `APPROVED BY OWNER` and recorded in `approved-frames.json`. An empty registry means no redesign direction is approved.

### Reading order

1. `PHASE-1-AUDIT.md`
2. `BRAND.md`
3. `UX-PRINCIPLES.md`
4. `DESIGN-SYSTEM.md`
5. `GLASS-SYSTEM.md`
6. `MOTION.md` and `HAPTICS.md`
7. `ACCESSIBILITY.md` and `PERFORMANCE.md`
8. `FIGMA-WORKFLOW.md`
9. `QUALITY-GATES.md`
10. `features/customer-sign-in-first-booking/BRIEF.md`

Existing product logic, database contracts, RLS, payment verification, role boundaries, and audit trails take priority over a visual redesign.
