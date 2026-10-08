import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const siteRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const defaultSource = path.resolve(siteRoot, "..", "Infinite Loot-Loop", "Assets", "Resources", "Localization");
const source = path.resolve(process.argv[2] || defaultSource);
const destination = path.join(siteRoot, "apps", "infinite-loot-loop", "data", "localization");
const languages = ["en", "ko", "ja", "zh-CN", "zh-TW", "de", "fr", "es", "pt-BR", "ru", "id", "it", "pl", "tr", "vi"];
const files = languages.flatMap(language => [`${language}.json`, `${language}_content.json`]);

if (!fs.existsSync(source)) {
  console.error(`Localization source not found: ${source}`);
  process.exit(1);
}

fs.mkdirSync(destination, { recursive: true });
const data = JSON.parse(fs.readFileSync(path.join(siteRoot, "apps/infinite-loot-loop/data/data.json"), "utf8"));
const valuesOf = rows => new Set(rows.flatMap(r => [r.name, r.name?.replace(/(?: \[H\]| H)$/, ""), r.description, r.setName]).filter(Boolean));
const itemText = valuesOf(data.items);
const enemyText = valuesOf([...data.enemies, ...data.bosses]);
const zoneText = valuesOf(data.zones);
const publicText = valuesOf([...data.items, ...data.enemies, ...data.bosses, ...data.zones, ...data.maps, ...data.characters, ...data.achievements]);
for (const map of data.maps) publicText.add(map.world);
const achievements = new Set(data.achievements.map(a => a.id));
const allowed = new Map();
for (const suffix of [".json", "_content.json"]) {
  const english = JSON.parse(fs.readFileSync(path.join(source, "en" + suffix), "utf8"));
  allowed.set(suffix, new Set(Object.entries(english).filter(([key, value]) => {
    if (/^(secret_|hidden_|troll_|notice_)/.test(key)) return false;
    if (/^achiev_(name|desc)_/.test(key)) return achievements.has(key.replace(/^achiev_(name|desc)_/, ""));
    if (/^item_/.test(key)) return itemText.has(value);
    if (/^enemy_/.test(key)) return enemyText.has(value);
    if (/^zone_/.test(key)) return zoneText.has(value);
    return publicText.has(value) || /^(stat_|rarity_|item_type_)/.test(key);
  }).map(([key]) => key)));
}
for (const file of files) {
  const from = path.join(source, file);
  if (!fs.existsSync(from)) {
    console.error(`Missing source localization file: ${from}`);
    process.exit(1);
  }
  const translations = JSON.parse(fs.readFileSync(from, "utf8"));
  const keys = allowed.get(file.endsWith("_content.json") ? "_content.json" : ".json");
  const filtered = Object.fromEntries([...keys].map(key => {
    if (typeof translations[key] !== "string") throw new Error(`${file}: missing public translation ${key}`);
    return [key, translations[key]];
  }));
  fs.writeFileSync(path.join(destination, file), JSON.stringify(filtered, null, 2) + "\n");
}

const englishUi = JSON.parse(fs.readFileSync(path.join(destination, "en.json"), "utf8"));
const englishContent = JSON.parse(fs.readFileSync(path.join(destination, "en_content.json"), "utf8"));
const expectedUi = Object.keys(englishUi).sort();
const expectedContent = Object.keys(englishContent).sort();

for (const language of languages) {
  const ui = JSON.parse(fs.readFileSync(path.join(destination, `${language}.json`), "utf8"));
  const content = JSON.parse(fs.readFileSync(path.join(destination, `${language}_content.json`), "utf8"));
  if (JSON.stringify(Object.keys(ui).sort()) !== JSON.stringify(expectedUi)) {
    throw new Error(`${language}.json does not match the English UI key set`);
  }
  if (JSON.stringify(Object.keys(content).sort()) !== JSON.stringify(expectedContent)) {
    throw new Error(`${language}_content.json does not match the English content key set`);
  }
}

console.log(`Synchronized and validated ${files.length} localization files from ${source}.`);
