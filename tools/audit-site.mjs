import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

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

if (errors.length) {
  console.error(`Site audit failed with ${errors.length} issue(s):`);
  errors.forEach(error => console.error(`- ${error}`));
  process.exit(1);
}

console.log(`Site audit passed: ${substantivePages.size} substantive pages, controlled ads, valid local links, and complete sitemap coverage.`);
