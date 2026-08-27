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

function archetype(name) {
  return String(name).replace(/ H$/, "").replace(/^(?:Elder|Greater) /, "");
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
    if (names.length > 1) errors.push(`${area.code}: distinct archetypes share art (${names.join(", ")})`);
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
