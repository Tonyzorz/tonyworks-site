import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const escape = value => String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");

// Draw only the blueprint's ordinary route zones. The separate secrets collection,
// NPCs, portals and original painting never enter this public SVG.
export function publicMapLayout(game, id) {
  const region = require(path.join(game, "Tools/epoch4_blueprint/r_" + id.slice(0, 2).toLowerCase() + ".js"));
  const map = region.maps.find(m => m.id === id);
  if (!map?.zones?.length || !map.W || !map.H) throw new Error("Missing public layout: " + id);
  const colors = ["#487a77", "#71918a", "#aa9268", "#617a99"];
  const scale = 600 / Math.max(map.W, map.H), pad = 36;
  let shapes = "", labels = "";
  map.zones.forEach((zone, index) => {
    if (!zone.rects?.length) throw new Error("Missing route geometry: " + id);
    const rects = zone.rects.map(r => ({x: pad + r.x * scale, y: 96 + (map.H - r.y - r.h) * scale, w: r.w * scale, h: r.h * scale}));
    const outline = rects.map(r => `M${r.x},${r.y}h${r.w}v${r.h}h-${r.w}Z`).join(" ");
    shapes += `<path d="${outline}" fill="${colors[Math.floor(index / 5) % colors.length]}" stroke="#15282d" stroke-width="1.5"/>`;
    const r = rects.reduce((a, b) => a.w * a.h >= b.w * b.h ? a : b);
    labels += `<text x="${r.x + r.w / 2}" y="${r.y + r.h / 2}" text-anchor="middle" dominant-baseline="central" font-size="12" font-weight="700" fill="#fff">${index + 1}</text>`;
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="672" height="752" viewBox="0 0 672 752"><title>${escape(map.name)} — map layout</title><rect width="672" height="752" rx="24" fill="#122126"/><g font-family="system-ui,sans-serif"><text x="36" y="40" fill="#b8d8d4" font-size="12" letter-spacing="2">${escape(id)} · ${map.hard ? "HARD" : "NORMAL"}</text><text x="36" y="72" fill="#fff" font-size="26" font-weight="700">${escape(map.name)}</text>${shapes}${labels}<text x="36" y="730" fill="#b8d8d4" font-size="12">${map.zones.length} ROUTE ZONES · MAP LAYOUT</text></g></svg>\n`;
}

export function writePublicMapLayout(game, imageDir, id) {
  const image = "map_" + id + "_layout.svg";
  fs.writeFileSync(path.join(imageDir, image), publicMapLayout(game, id));
  return image;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const site = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const game = path.resolve(site, "../Infinite Loot-Loop");
  const { publicationPolicy } = await import("./public-content.mjs");
  const policy = publicationPolicy(game);
  const file = path.join(site, "apps/infinite-loot-loop/data/data.json");
  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  for (const map of data.maps) if (policy.withheldMapArt.has(map.id)) {
    map.image = writePublicMapLayout(game, path.join(site, "apps/infinite-loot-loop/assets/img"), map.id);
  }
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
  console.log("Published route-only map layouts for " + policy.withheldMapArt.size + " maps.");
}
