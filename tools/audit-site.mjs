import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sourceStrings } from "./build-site-translations.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const allowedAdPages = new Set(["apps/infinite-loot-loop/guide.html"]);
const substantivePages = new Set([
  "index.html",
  "about.html",
  "apps/infinite-loot-loop/index.html",
  "apps/infinite-loot-loop/guide.html",
  "apps/infinite-loot-loop/game-data.html",
  "apps/infinite-loot-loop/faq.html",
  "apps/infinite-loot-loop/patch.html",
  "apps/infinite-loot-loop/monsters.html",
  "apps/infinite-loot-loop/bosses.html",
  "apps/infinite-loot-loop/items.html",
  "apps/infinite-loot-loop/sets.html",
  "apps/infinite-loot-loop/maps.html",
  "apps/infinite-loot-loop/characters.html",
  "apps/infinite-loot-loop/achievements.html"
]);

const errors = [];
const normalize = value => value.split(path.sep).join("/");
const languages = ["en", "ko", "ja", "zh-CN", "zh-TW", "de", "fr", "es", "pt-BR", "ru", "id"];
const localizationDir = path.join(root, "apps", "infinite-loot-loop", "data", "localization");
const siteContentDir = path.join(root, "assets", "i18n", "site-content");

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return entry.name.endsWith(".html") ? [full] : [];
  });
}

function bodyText(html) {
  const body = (html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i) || ["", ""])[1];
  return body
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&(?:[a-z]+|#\d+|#x[\da-f]+);/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function resolveInternalHref(page, href) {
  if (!href || /^(?:[a-z]+:|#|\/\/)/i.test(href)) return null;
  const clean = href.split(/[?#]/)[0];
  if (!clean) return null;
  if (clean.startsWith("/")) return path.join(root, clean.slice(1));
  return path.resolve(path.dirname(page), clean);
}

for (const page of walk(root)) {
  const rel = normalize(path.relative(root, page));
  const html = fs.readFileSync(page, "utf8");
  const hasAds = /pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js/i.test(html);

  if (hasAds && !allowedAdPages.has(rel)) errors.push(`${rel}: AdSense loader is not allowed on this page`);
  if (!hasAds && allowedAdPages.has(rel)) errors.push(`${rel}: expected the reviewed editorial ad loader`);

  if (substantivePages.has(rel)) {
    const words = bodyText(html).split(/\s+/).filter(Boolean).length;
    if (words < 150) errors.push(`${rel}: only ${words} static words; expected at least 150 for this site audit`);
    if (!/<h1\b/i.test(html)) errors.push(`${rel}: missing a static H1`);
    if (!/<link\s+rel=["']canonical["']/i.test(html)) errors.push(`${rel}: missing canonical URL`);
  }

  if (/<main\b[^>]*\bid=["'](?:app|portal)["'][^>]*>\s*<\/main>/i.test(html)) {
    errors.push(`${rel}: ships an empty main content shell`);
  }

  for (const match of html.matchAll(/<script\s+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try { JSON.parse(match[1]); }
    catch (error) { errors.push(`${rel}: invalid JSON-LD (${error.message})`); }
  }

  for (const match of html.matchAll(/\bhref=["']([^"']+)["']/gi)) {
    const target = resolveInternalHref(page, match[1]);
    if (target && !fs.existsSync(target)) errors.push(`${rel}: broken internal link ${match[1]}`);
  }
}

const sitemap = fs.readFileSync(path.join(root, "sitemap.xml"), "utf8");
for (const rel of substantivePages) {
  const url = rel === "index.html" ? "https://tonyworks.co.kr/" : `https://tonyworks.co.kr/${rel}`;
  if (!sitemap.includes(`<loc>${url}</loc>`)) errors.push(`sitemap.xml: missing ${url}`);
}

function readLocale(file) {
  try { return JSON.parse(fs.readFileSync(path.join(localizationDir, file), "utf8")); }
  catch (error) {
    errors.push(`localization/${file}: ${error.message}`);
    return {};
  }
}

function placeholderSignature(value) {
  return (String(value).match(/\{\d+(?::[^}]*)?\}/g) || []).sort().join("|");
}

const englishUi = readLocale("en.json");
const englishContent = readLocale("en_content.json");
for (const language of languages) {
  for (const suffix of ["", "_content"]) {
    const file = `${language}${suffix}.json`;
    const reference = suffix ? englishContent : englishUi;
    const locale = readLocale(file);
    const expected = Object.keys(reference).sort();
    const actual = Object.keys(locale).sort();
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      const missing = expected.filter(key => !Object.hasOwn(locale, key));
      const extra = actual.filter(key => !Object.hasOwn(reference, key));
      errors.push(`localization/${file}: key mismatch (${missing.length} missing, ${extra.length} extra)`);
    }
    for (const key of expected) {
      if (typeof locale[key] !== "string" || !locale[key].trim()) {
        errors.push(`localization/${file}: empty or non-string value for ${key}`);
      } else if (placeholderSignature(locale[key]) !== placeholderSignature(reference[key])) {
        errors.push(`localization/${file}: placeholder mismatch for ${key}`);
      }
    }
  }
}

const expectedSiteStrings = sourceStrings();
for (const language of languages) {
  const file = path.join(siteContentDir, `${language}.json`);
  let locale = {};
  try { locale = JSON.parse(fs.readFileSync(file, "utf8")); }
  catch (error) {
    errors.push(`site-content/${language}.json: ${error.message}`);
    continue;
  }
  const expected = expectedSiteStrings.slice().sort();
  const actual = Object.keys(locale).sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    const missing = expected.filter(key => !Object.hasOwn(locale, key));
    const extra = actual.filter(key => !expected.includes(key));
    errors.push(`site-content/${language}.json: key mismatch (${missing.length} missing, ${extra.length} extra)`);
  }
  for (const source of expected) {
    const translated = locale[source];
    if (typeof translated !== "string" || !translated.trim()) {
      errors.push(`site-content/${language}.json: empty value for ${source}`);
    } else if (/__\s*T(?:W)?PH|TWSEP/i.test(translated)) {
      errors.push(`site-content/${language}.json: leaked generator token for ${source}`);
    } else if (language !== "en" && source.length > 30 && translated === source && /[A-Za-z]{4}/.test(source) &&
        !/https?:|@/.test(source) && !/^Infinite Loot-Loop(?: FAQ)? — Tony Works$/.test(source)) {
      errors.push(`site-content/${language}.json: untranslated long-form text for ${source}`);
    }
  }
}

const i18nSource = fs.readFileSync(path.join(root, "assets", "js", "i18n.js"), "utf8");
const phraseMatch = i18nSource.match(/var PHRASES = (\{[\s\S]*?\});\s*function canonicalLanguage/);
if (!phraseMatch) {
  errors.push("assets/js/i18n.js: PHRASES dictionary not found");
} else {
  try {
    const phrases = JSON.parse(phraseMatch[1]);
    for (const [english, translations] of Object.entries(phrases)) {
      if (!Array.isArray(translations) || translations.length !== languages.length - 1 || translations.some(value => typeof value !== "string" || !value.trim())) {
        errors.push(`assets/js/i18n.js: incomplete PHRASES entry for ${english}`);
      }
    }
  } catch (error) {
    errors.push(`assets/js/i18n.js: invalid PHRASES dictionary (${error.message})`);
  }
}

if (errors.length) {
  console.error(`Site audit failed with ${errors.length} issue(s):`);
  errors.forEach(error => console.error(`- ${error}`));
  process.exit(1);
}

console.log(`Site audit passed: ${substantivePages.size} substantive pages, ${languages.length} complete locales, controlled ads, valid local links, and complete sitemap coverage.`);
