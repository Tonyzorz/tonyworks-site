import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const siteRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const defaultSource = path.resolve(siteRoot, "..", "Infinite Loot-Loop", "Assets", "Resources", "Localization");
const source = path.resolve(process.argv[2] || defaultSource);
const destination = path.join(siteRoot, "apps", "infinite-loot-loop", "data", "localization");
const languages = ["en", "ko", "ja", "zh-CN", "zh-TW", "de", "fr", "es", "pt-BR", "ru", "id"];
const files = languages.flatMap(language => [`${language}.json`, `${language}_content.json`]);

if (!fs.existsSync(source)) {
  console.error(`Localization source not found: ${source}`);
  process.exit(1);
}

fs.mkdirSync(destination, { recursive: true });
for (const file of files) {
  const from = path.join(source, file);
  if (!fs.existsSync(from)) {
    console.error(`Missing source localization file: ${from}`);
    process.exit(1);
  }
  JSON.parse(fs.readFileSync(from, "utf8"));
  fs.copyFileSync(from, path.join(destination, file));
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
