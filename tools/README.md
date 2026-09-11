# tools

Regenerate the Infinite Loot-Loop app data from the Unity project.

## Refresh `apps/infinite-loot-loop/data/data.json` + images

**Use the headless builder — it is the only supported path.** Requires the Unity
project to sit next to this repo as `../Infinite Loot-Loop`.

```
node tools/build-data.mjs
powershell -ExecutionPolicy Bypass -File tools/resize-images.ps1
node tools/audit-data.mjs
node tools/build-upcoming.mjs        # planned content -> data/upcoming.json
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
- `audit-data.mjs` verifies every exported image reference and rejects maps where
  differently named monster archetypes accidentally resolve to identical art.

Then commit and push:
```
git add -A && git commit -m "Refresh game data" && git push
```

## Planned content — `data/upcoming.json`

`build-upcoming.mjs` emits the Epoch 4 / wave 1 regions (Cloud Plaza, Stone, Egypt, The Temple)
that are **designed but not built**: no Unity assets, no art, no authored stats. `app.js` merges
the file into `data.json` at load time and every record carries `upcoming: true`, so the Maps,
Monsters, Bosses and Items pages list them behind an **Upcoming** badge.

⛔ **ONE LIST.** Every name is parsed out of the game repo design doc
`Assets/Project Information/epoch4_wave1_cloud_and_circle.md` and is never retyped here. That doc
is also what the Unity setup tools and the art-prompt docs are generated from, and the game repo
polices the three against each other with `Tools/epoch4_blueprint/namecheck.js`. A fourth,
hand-typed list on the wiki is exactly how the Maze batch shipped 48 PNGs that matched 1 of 124
enemy names. The generator hard-fails if a region does not parse to 8 maps / 12 creatures /
40 gear items / 1 boss.

⛔ **It must never emit an HP / ATK / DEF number.** The balance pass owns those and none exist
yet. Levels *are* published because the route is unreadable without them, but every one is
labelled *projected* in the UI. A fabricated combat stat on a public wiki reads back later as if
it had been authored.

When a region actually ships, drop it from the design doc parse list here and let `build-data.mjs`
pick it up from the real assets instead — do not leave both sources live.

> A former in-editor exporter (`SiteDataExportTool.cs`) was **deleted 2026-07-27**.
> It had diverged from this builder — emitting a raw `baseHP`/`atkScaling` schema
> with no `worlds`/`areas`, which silently broke the Monsters and Maps pages. Keep
> `build-data.mjs` the single source of truth; do not add a second data path.
