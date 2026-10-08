import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { approvedPublicMapArt } from "./public-map-layouts.mjs";

const require = createRequire(import.meta.url);

// Only public sector names and ordinary zone IDs leave the authoring blueprint.
// Art prompts, hidden geometry and encounters are deliberately never serialized.
export function museumMapDetails(game, id) {
  if (!/^MH\d{2}$/.test(id)) return {};
  const map = require(path.join(game, "Tools/epoch4_blueprint/r_mh.js")).maps.find(m => m.id === id);
  if (!map?.sectors?.length) throw new Error("Missing Museum wing sections: " + id);
  return {
    worldWidth: map.W,
    worldHeight: map.H,
    sectors: map.sectors.map(sector => ({
      name: sector.n,
      zoneIds: sector.zones.map(index => id + "_HM_Z" + index)
    }))
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const site = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const game = path.resolve(site, "../Infinite Loot-Loop");
  const file = path.join(site, "apps/infinite-loot-loop/data/data.json");
  const imageDir = path.join(site, "apps/infinite-loot-loop/assets/img");
  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  const zoneIds = new Set(data.zones.map(z => z.id));
  for (const map of data.maps.filter(m => /^MH\d{2}$/.test(m.id))) {
    const details = museumMapDetails(game, map.id);
    for (const sector of details.sectors) {
      if (!sector.zoneIds.every(id => zoneIds.has(id))) throw new Error("Unpublished Museum section zone: " + map.id);
    }
    Object.assign(map, details);
    const art = approvedPublicMapArt(game, imageDir, map.id);
    if (art) map.image = art;
  }
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
  console.log("Updated the four Hard Museum wings and their public sections.");
}
