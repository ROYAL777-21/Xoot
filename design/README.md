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

**Its palette is not the shipped one.** The kit is warm coral on cream (`#E64B36`,
`#FCEEDA`, ink `#3B3430`); `src/index.css` is red on near-white (`#e42a21` / `#fff7f5`).
That conflict is unresolved — see `docs/xoot-ios-build-prompt.md`, "Decide this before
writing a line".
