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
