# tools

Regenerate the Infinite Loot-Loop app data from the Unity project.

## Refresh `apps/infinite-loot-loop/data/data.json` + images

**Use the headless builder — it is the only supported path.** Requires the Unity
project to sit next to this repo as `../Infinite Loot-Loop`.

```
node tools/build-data.mjs
powershell -ExecutionPolicy Bypass -File tools/resize-images.ps1
```

- `build-data.mjs` parses the `.asset` YAML, resolves `guid` references via the
  `.meta` files, copies the referenced sprite PNGs, and renders each map's grid
  to a PNG. It emits the exact JSON shape `assets/js/app.js` reads: enemies with
  `worlds` / `hpMin` / `hpMax` / `resists` / `zoneNames`, plus a top-level
  `areas` table. The Monsters page filters on `worlds` and the Maps page renders
  from `areas`, so both are REQUIRED — data missing them makes those pages render
  empty even though the JSON still parses.
- `resize-images.ps1` downscales the copied sprites to 256px (they ship from
  Unity at full art resolution, which is far too large for the web).

Then commit and push:
```
git add -A && git commit -m "Refresh game data" && git push
```

> A former in-editor exporter (`SiteDataExportTool.cs`) was **deleted 2026-07-27**.
> It had diverged from this builder — emitting a raw `baseHP`/`atkScaling` schema
> with no `worlds`/`areas`, which silently broke the Monsters and Maps pages. Keep
> `build-data.mjs` the single source of truth; do not add a second data path.
