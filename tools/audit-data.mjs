import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const app = path.join(root, "apps", "infinite-loot-loop");
const imageDir = path.join(app, "assets", "img");
const data = JSON.parse(fs.readFileSync(path.join(app, "data", "data.json"), "utf8"));
const errors = [];
const enemies = new Map(data.enemies.map((enemy) => [enemy.id, enemy]));
const imageHashes = new Map();

function imageHash(file) {
  if (!imageHashes.has(file)) {
    const full = path.join(imageDir, file);
    if (!fs.existsSync(full)) {
      errors.push(`missing image ${file}`);
      return "";
    }
    imageHashes.set(file, crypto.createHash("sha256").update(fs.readFileSync(full)).digest("hex"));
  }
  return imageHashes.get(file);
}

// ⛔ THE TIER PREFIXES, AND THIS LIST IS THE CHECK'S WEAK POINT.
// A zone's monster family is one creature at several tiers — "Ossuary Hound", "Elder Ossuary
// Hound", "Ancient Ossuary Hound" — and tiers SHARE ART by design. Stripping the prefix is what
// collapses them to one archetype so the shared-art rule below does not fire on them.
//
// ★ `Ancient` added 2026-09-23. It was missing, so GY03 and KR02 failed the audit on content that
// had been published for weeks: 348 `Elder` and 200 `Greater` monsters normalised correctly while
// the 9 `Ancient` ones did not. A hand-maintained list that new content must be remembered into —
// the same defect shape as the release table in build-data.mjs, which is why the error message
// below now names this list as the first thing to check.
// ⚠ `Ancient` is ALSO part of proper names that are not tiers ("Ancient Golem" is a boss). That is
// harmless here: this only groups FIELD enemies inside one area, and two of them would have to
// share art before anything is reported.
const TIER_PREFIXES = /^(?:Elder|Greater|Ancient) /;
function archetype(name) {
  return String(name).replace(/ H$/, "").replace(TIER_PREFIXES, "");
}

for (const area of data.areas) {
  const archetypes = new Map();
  for (const id of area.enemyIds || []) {
    if (/_H$/.test(id)) continue;
    const enemy = enemies.get(id);
    if (!enemy) {
      errors.push(`${area.code}: missing enemy ${id}`);
      continue;
    }
    const key = archetype(enemy.name);
    if (!archetypes.has(key)) archetypes.set(key, enemy);
  }

  const byHash = new Map();
  for (const [name, enemy] of archetypes) {
    const hash = imageHash(enemy.image);
    if (!hash) continue;
    if (!byHash.has(hash)) byHash.set(hash, []);
    byHash.get(hash).push(name);
  }
  for (const names of byHash.values()) {
    if (names.length > 1) errors.push(`${area.code}: distinct archetypes share art (${names.join(", ")})`
      + ` — if these are TIERS of one creature, the missing piece is TIER_PREFIXES above, not the art`);
  }
}

for (const group of ["items", "enemies", "bosses", "maps", "characters"]) {
  for (const entry of data[group] || []) if (entry.image) imageHash(entry.image);
}

if (errors.length) {
  console.error(`Data audit failed with ${errors.length} issue(s):`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log(`Data audit passed: ${data.areas.length} maps have distinct monster-archetype art and all exported image references exist.`);
