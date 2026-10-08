import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { publicationPolicy, walkFiles } from "./public-content.mjs";
import { publicMapLayout } from "./public-map-layouts.mjs";

const site = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const app = path.join(site, "apps/infinite-loot-loop");
const policy = publicationPolicy(path.resolve(site, "../Infinite Loot-Loop"));
const data = JSON.parse(fs.readFileSync(path.join(app, "data/data.json"), "utf8"));
const groups = ["items", "enemies", "bosses", "maps", "zones", "areas", "characters", "achievements"];
for (const group of groups) {
  const rows = data[group];
  assert.equal(rows.length, data.counts[group], `${group} count`);
  assert.equal(new Set(rows.map(r => r.id || r.code)).size, rows.length, `${group} duplicate IDs`);
}
function inspect(value) {
  if (typeof value === "string") assert(!policy.privateIds.has(value) && !policy.privateAchievements.has(value), "Private reference in public data");
  else if (value && typeof value === "object") Object.values(value).forEach(inspect);
}
inspect(data);
const items = new Map(data.items.map(i => [i.id, i]));
const enemies = new Map(data.enemies.map(e => [e.id, e]));
const maps = new Map(data.maps.map(m => [m.id, m]));
assert(data.items.every(i => !i.isTrollItem && !i.hiddenFromCollection));
for (const z of data.zones) {
  for (const e of z.enemies) assert(enemies.has(e.enemyId), "Dangling zone enemy");
  for (const id of z.shopItems) assert(items.has(id), "Dangling zone stock");
}
for (const e of data.enemies) for (const row of e.drops) {
  assert(items.has(row.itemId), "Dangling field reward");
  assert.equal(items.get(row.itemId).isHardModeItem, e.isHard, "Wrong-mode field reward");
  assert(row.chance > 0 && row.chance <= 100, "Invalid field rate");
}
for (const b of data.bosses) for (const [mode, rows] of Object.entries(b.drops)) {
  if (!b.modes.includes(mode)) assert.equal(rows.length, 0, "Rewards in unavailable boss mode");
  for (const row of rows) {
    assert(items.has(row.itemId), "Dangling boss reward");
    assert.equal(items.get(row.itemId).isHardModeItem, mode === "hard", "Wrong-mode boss reward");
    assert(row.chance > 0 && row.chance <= 100, "Invalid boss rate");
  }
}
for (const m of data.maps) {
  assert(m.world !== "Other", "Unclassified public map");
  for (const door of m.doors || []) {
    assert(maps.has(door.to), "Dangling destination");
    assert(door.modes.length > 0, "Door with no playable mode");
    for (const mode of door.modes) assert(m.modes.includes(mode) && maps.get(door.to).modes.includes(mode), "Wrong-mode door");
  }
  if (policy.withheldMapArt.has(m.id)) {
    assert.equal(m.image, "map_" + m.id + "_layout.svg", "Use the route-only map layout");
    assert.equal(fs.readFileSync(path.join(app, "assets/img", m.image), "utf8"), publicMapLayout(path.resolve(site, "../Infinite Loot-Loop"), m.id), "Map layout must contain only public route geometry");
    assert(!fs.existsSync(path.join(app, "assets/img", "map_" + m.id + ".png")), "Original map painting must remain withheld");
  }
}
const museum = data.maps.filter(m => m.world === "Museum");
assert.equal(museum.filter(m => m.modes.includes("normal")).length, 25, "Normal Museum map count");
assert.equal(museum.filter(m => m.modes.includes("hard")).length, 5, "Hard Museum map count");
assert.equal(data.bosses.filter(b => /^MU/.test(b.mapId)).length, 4);
assert.equal(data.bosses.filter(b => /^MH/.test(b.mapId)).length, 4);
for (const prefix of ["MX", "CY", "SM"]) assert.equal(data.maps.filter(m => m.id.startsWith(prefix)).length, 3);
const images = new Set(groups.flatMap(g => data[g].map(r => r.image).filter(Boolean)));
for (const file of fs.readdirSync(path.join(app, "assets/img"))) {
  if (/^(item|enemy|boss|map|char)_/.test(file) && file !== "map_legend.png") assert(images.has(file), "Orphaned exported art");
}
for (const file of walkFiles(path.join(app, "data/localization"))) {
  const locale = JSON.parse(fs.readFileSync(file, "utf8"));
  assert(!Object.keys(locale).some(k => /^(secret_|hidden_|troll_|notice_)/.test(k)), "Private or unfiltered game text in localization");
}
const upcoming = JSON.parse(fs.readFileSync(path.join(app, "data/upcoming.json"), "utf8"));
assert.equal(upcoming.worlds.length, 0, "Released previews must be retired");
// Exercise the production localizer against array field drops and per-mode boss drops.
const i18n = fs.readFileSync(path.join(site, "assets/js/i18n.js"), "utf8");
const localizer = i18n.slice(i18n.indexOf("  function localizeGameData(data) {"), i18n.indexOf("  function translateDocumentMetadata"));
assert(localizer.startsWith("  function localizeGameData(data) {"), "Missing production localizer");
const translations = JSON.parse(fs.readFileSync(path.join(site, "assets/i18n/site-content/ko.json"), "utf8"));
const localized = vm.runInNewContext(localizer + "\nlocalizeGameData(data);", {
  data: structuredClone(data), code: "ko", translatePhrase: value => translations[value] || value
});
assert.deepEqual(localized.bosses.map(b => b.drops), data.bosses.map(b => b.drops), "Localization changed reward IDs or rates");
assert.deepEqual(localized.maps.map(m => m.modes), data.maps.map(m => m.modes), "Localization changed map modes");
assert.equal(localized.maps.find(m => m.id === "MH01").name, translations["Modern 1"], "Museum wing translation");
console.log("Publication audit passed: no private references or orphaned art; valid loot, routes and Museum modes.");
