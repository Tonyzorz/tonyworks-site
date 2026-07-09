# tools

Regenerate the Infinite Loot-Loop app data from the Unity project.

There are two equivalent ways to refresh `apps/infinite-loot-loop/data/data.json`
and the sprite/map images:

### A. From Unity (canonical)
In the Unity editor: **Infinite Loot Loop → Dev → Export Site Data**
(`Assets/Scripts/Editor/SiteDataExportTool.cs`). Writes directly into this repo.

### B. Headless (no Unity needed)
Requires the Unity project to sit next to this repo as `../Infinite Loot-Loop`.

```
node tools/build-data.mjs
powershell -ExecutionPolicy Bypass -File tools/resize-images.ps1
```

- `build-data.mjs` parses the `.asset` YAML, resolves `guid` references via the
  `.meta` files, copies the referenced sprite PNGs, and renders each map's grid
  to a PNG. It reproduces the same JSON shape the Unity tool produces.
- `resize-images.ps1` downscales the copied sprites to 256px (they ship from
  Unity at full art resolution, which is far too large for the web).

Then commit and push:
```
git add -A && git commit -m "Refresh game data" && git push
```
