import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = path.join(root, "assets", "i18n", "site-content");
const pages = [
  "index.html", "about.html", "privacy-policy.html", "terms.html", "deletion.html",
  "apps/infinite-loot-loop/index.html", "apps/infinite-loot-loop/guide.html",
  "apps/infinite-loot-loop/game-data.html", "apps/infinite-loot-loop/faq.html",
  "apps/infinite-loot-loop/patch.html", "apps/infinite-loot-loop/monsters.html",
  "apps/infinite-loot-loop/bosses.html", "apps/infinite-loot-loop/items.html",
  "apps/infinite-loot-loop/sets.html", "apps/infinite-loot-loop/maps.html",
  "apps/infinite-loot-loop/characters.html", "apps/infinite-loot-loop/achievements.html"
];
const targets = {
  ko: "ko", ja: "ja", "zh-CN": "zh-CN", "zh-TW": "zh-TW", de: "de",
  fr: "fr", es: "es", "pt-BR": "pt", ru: "ru", id: "id"
};
const glossaryOverrides = {
  boss: ["보스", "ボス", "首领", "首領", "Boss", "boss", "jefe", "chefe", "босс", "bos"],
  item: ["아이템", "アイテム", "道具", "道具", "Gegenstand", "objet", "objeto", "item", "предмет", "item"],
  shop: ["상점", "ショップ", "商店", "商店", "Shop", "boutique", "tienda", "loja", "магазин", "toko"]
};
const localeOrder = ["ko", "ja", "zh-CN", "zh-TW", "de", "fr", "es", "pt-BR", "ru", "id"];
const extraStrings = [
  "This page is available in your language. Game-specific names are synchronized with the current localization files.",
  "This translation is provided for convenience. If it differs from the English version, the English version controls."
];

function decodeEntities(value) {
  const named = {
    amp: "&", apos: "'", quot: '"', lt: "<", gt: ">", nbsp: " ",
    middot: "·", rarr: "→", ndash: "–", mdash: "—", hellip: "…", copy: "©"
  };
  return value.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (match, entity) => {
    if (entity[0] === "#") {
      const hex = entity[1].toLowerCase() === "x";
      const number = Number.parseInt(entity.slice(hex ? 2 : 1), hex ? 16 : 10);
      return Number.isFinite(number) ? String.fromCodePoint(number) : match;
    }
    return Object.hasOwn(named, entity.toLowerCase()) ? named[entity.toLowerCase()] : match;
  });
}

function normalize(value) {
  return decodeEntities(value).replace(/\s+/g, " ").trim();
}

function extractStrings(html) {
  const strings = [];
  const withoutIgnored = html
    .replace(/<!--[\s\S]*?-->/g, " ")
    // Keep synthetic tag boundaries where ignored elements sat. Replacing an
    // inline <code> block with plain whitespace would incorrectly merge the two
    // browser text nodes on either side into one unmatchable translation key.
    .replace(/<(script|style|code|pre)\b[\s\S]*?<\/\1>/gi, " <tw-ignore></tw-ignore> ");

  for (const part of withoutIgnored.split(/<[^>]+>/g)) {
    const value = normalize(part);
    if (/[A-Za-z]/.test(value)) strings.push(value);
  }
  for (const match of withoutIgnored.matchAll(/\b(?:placeholder|aria-label|title)=["']([^"']+)["']/gi)) {
    const value = normalize(match[1]);
    if (/[A-Za-z]/.test(value)) strings.push(value);
  }
  for (const match of html.matchAll(/<meta\b[^>]*(?:property=["']og:title["']|name=["']twitter:title["'])[^>]*content=["']([^"']+)["'][^>]*>/gi)) {
    const value = normalize(match[1]);
    if (/[A-Za-z]/.test(value)) strings.push(value);
  }
  return strings;
}

export function sourceStrings() {
  const strings = new Set(extraStrings);
  for (const page of pages) {
    const html = fs.readFileSync(path.join(root, page), "utf8");
    extractStrings(html).forEach(value => strings.add(value));
  }
  return [...strings].sort((a, b) => a.localeCompare(b, "en"));
}

const protectedTerms = [
  "Infinite Loot-Loop", "Infinite Loot Loop", "Tony Works", "Show Me the Saju",
  "Amazon Web Services", "Apple App Store", "Firebase Crashlytics", "Firebase Analytics",
  "Google Analytics", "Google AdMob", "Google Play", "Game Center", "Android", "Unity", "iOS", "AWS"
].sort((a, b) => b.length - a.length);

function protect(source) {
  const values = [];
  let text = source.replace(/https?:\/\/[^\s)]+|[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, value => {
    const token = `__TWPH_${values.length}__`;
    values.push(value);
    return token;
  });
  for (const term of protectedTerms) {
    if (!text.includes(term)) continue;
    const token = `__TWPH_${values.length}__`;
    values.push(term);
    text = text.split(term).join(token);
  }
  return { text, values };
}

function restore(text, values) {
  let restored = text;
  values.forEach((value, index) => {
    // Some target-language models shorten TWPH to TPH; both forms are reserved
    // exclusively for this generator and map back to the same protected value.
    const pattern = new RegExp(`__\\s*T(?:W)?PH\\s*_?\\s*${index}\\s*__`, "gi");
    restored = restored.replace(pattern, value);
  });
  return restored.replace(/\s+([,.;:!?])/g, "$1").trim();
}

const delay = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

async function translateOne(source, target, attempt = 0) {
  const { text, values } = protect(source);
  const url = "https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=" +
    encodeURIComponent(target) + "&dt=t&q=" + encodeURIComponent(text);
  try {
    const response = await fetch(url, { headers: { "user-agent": "TonyWorksLocalization/1.0" } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    const translated = (data[0] || []).map(part => part[0] || "").join("");
    // Languages without articles can correctly translate an isolated text-node
    // fragment such as "The" to nothing. Keep an invisible word joiner so the
    // dictionary records the intentional removal instead of falling back to English.
    if (!translated.trim() && /^(?:a|an|the)$/i.test(source)) return "\u2060";
    if (!translated.trim()) throw new Error("empty translation");
    const restored = restore(translated, values);
    if (values.some(value => !restored.includes(value))) throw new Error("protected term was lost");
    return restored;
  } catch (error) {
    if (attempt >= 4) throw new Error(`${target}: ${error.message} for ${source.slice(0, 80)}`);
    await delay(500 * (2 ** attempt));
    return translateOne(source, target, attempt + 1);
  }
}

function makeBatches(sources) {
  const batches = [];
  let current = [];
  let length = 0;
  for (const source of sources) {
    if (current.length && (current.length >= 18 || length + source.length > 2400)) {
      batches.push(current);
      current = [];
      length = 0;
    }
    current.push(source);
    length += source.length + 24;
  }
  if (current.length) batches.push(current);
  return batches;
}

async function translateBatch(sources, target, attempt = 0) {
  if (sources.length === 1) return [await translateOne(sources[0], target, attempt)];
  const protectedSources = sources.map(protect);
  const markers = sources.slice(1).map((_, index) => `[[[TWSEP_${String(index + 1).padStart(3, "0")}]]]`);
  const joined = protectedSources.map((entry, index) => index ? markers[index - 1] + "\n" + entry.text : entry.text).join("\n");
  const url = "https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=" +
    encodeURIComponent(target) + "&dt=t&q=" + encodeURIComponent(joined);
  try {
    const response = await fetch(url, { headers: { "user-agent": "TonyWorksLocalization/1.0" } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    let translated = (data[0] || []).map(part => part[0] || "").join("");
    const parts = [];
    for (const marker of markers) {
      const index = translated.indexOf(marker);
      if (index < 0) throw new Error(`separator ${marker} was lost`);
      parts.push(translated.slice(0, index));
      translated = translated.slice(index + marker.length);
    }
    parts.push(translated);
    if (parts.length !== sources.length) throw new Error("translation batch length mismatch");
    return parts.map((part, index) => {
      const restored = restore(part, protectedSources[index].values);
      if (!restored) throw new Error("empty batch translation");
      if (protectedSources[index].values.some(value => !restored.includes(value))) throw new Error("protected term was lost");
      return restored;
    });
  } catch (error) {
    if (attempt >= 3) {
      // A provider can occasionally rewrite a separator. Fall back to individual
      // requests so one difficult paragraph cannot corrupt neighboring entries.
      return mapConcurrent(sources, 4, source => translateOne(source, target));
    }
    await delay(600 * (2 ** attempt));
    return translateBatch(sources, target, attempt + 1);
  }
}

async function mapConcurrent(values, concurrency, mapper) {
  const results = new Array(values.length);
  let next = 0;
  async function worker() {
    while (next < values.length) {
      const index = next++;
      results[index] = await mapper(values[index], index);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));
  return results;
}

async function main() {
  const sources = sourceStrings();
  fs.mkdirSync(outputDir, { recursive: true });
  const english = Object.fromEntries(sources.map(source => [source, source]));
  fs.writeFileSync(path.join(outputDir, "en.json"), JSON.stringify(english, null, 2) + "\n", "utf8");
  console.log(`Extracted ${sources.length} unique static-site strings.`);

  for (const [locale, target] of Object.entries(targets)) {
    const file = path.join(outputDir, `${locale}.json`);
    let existing = {};
    if (fs.existsSync(file)) {
      try { existing = JSON.parse(fs.readFileSync(file, "utf8")); } catch {}
    }
    const missing = sources.filter(source => typeof existing[source] !== "string" || !existing[source].trim());
    console.log(`${locale}: translating ${missing.length} missing strings...`);
    const batches = makeBatches(missing);
    const translatedBatches = await mapConcurrent(batches, 4, batch => translateBatch(batch, target));
    batches.forEach((batch, batchIndex) => {
      batch.forEach((source, sourceIndex) => { existing[source] = translatedBatches[batchIndex][sourceIndex]; });
    });
    const localeIndex = localeOrder.indexOf(locale);
    for (const [source, translations] of Object.entries(glossaryOverrides)) {
      if (Object.hasOwn(existing, source)) existing[source] = translations[localeIndex];
    }
    const ordered = Object.fromEntries(sources.map(source => [source, existing[source]]));
    fs.writeFileSync(file, JSON.stringify(ordered, null, 2) + "\n", "utf8");
    console.log(`${locale}: complete.`);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error); process.exit(1); });
}
