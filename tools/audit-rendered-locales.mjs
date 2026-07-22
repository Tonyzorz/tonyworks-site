import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const edge = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const baseUrl = process.argv[2] || "http://127.0.0.1:8765";
const defaultLanguages = ["ko", "ja", "zh-CN", "zh-TW", "de", "fr", "es", "pt-BR", "ru", "id"];
const defaultPages = [
  "/", "/about.html", "/privacy-policy.html", "/terms.html", "/deletion.html",
  "/apps/infinite-loot-loop/", "/apps/infinite-loot-loop/guide.html",
  "/apps/infinite-loot-loop/game-data.html", "/apps/infinite-loot-loop/faq.html",
  "/apps/infinite-loot-loop/patch.html", "/apps/infinite-loot-loop/monsters.html",
  "/apps/infinite-loot-loop/bosses.html", "/apps/infinite-loot-loop/items.html",
  "/apps/infinite-loot-loop/sets.html", "/apps/infinite-loot-loop/maps.html",
  "/apps/infinite-loot-loop/characters.html", "/apps/infinite-loot-loop/achievements.html"
];
const languages = process.env.TW_AUDIT_LANGS ? process.env.TW_AUDIT_LANGS.split(",") : defaultLanguages;
const pages = process.env.TW_AUDIT_PAGES ? process.env.TW_AUDIT_PAGES.split(",") : defaultPages;

if (!fs.existsSync(edge)) throw new Error(`Microsoft Edge not found: ${edge}`);

function decodeEntities(value) {
  const named = { amp: "&", apos: "'", quot: '"', lt: "<", gt: ">", nbsp: " ", middot: "·", rarr: "→", ndash: "–", mdash: "—", hellip: "…" };
  return value.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (match, entity) => {
    if (entity[0] === "#") {
      const hex = entity[1].toLowerCase() === "x";
      return String.fromCodePoint(Number.parseInt(entity.slice(hex ? 2 : 1), hex ? 16 : 10));
    }
    return Object.hasOwn(named, entity.toLowerCase()) ? named[entity.toLowerCase()] : match;
  });
}

function textNodes(html) {
  const clean = html.replace(/<(script|style|code|pre)\b[\s\S]*?<\/\1>/gi, " <tw-ignore></tw-ignore> ");
  return new Set(clean.split(/<[^>]+>/g).map(value => decodeEntities(value).replace(/\s+/g, " ").trim()).filter(Boolean));
}

function dumpDom(url, index) {
  const profile = path.join(os.tmpdir(), `tw-render-${process.pid}-${index}`);
  return new Promise((resolve, reject) => {
    const child = spawn(edge, [
      "--headless=new", "--disable-gpu", "--disable-gpu-compositing", "--disable-software-rasterizer",
      "--disable-dev-shm-usage", "--no-sandbox", "--no-first-run", "--no-default-browser-check",
      "--disable-background-networking", "--virtual-time-budget=1800", `--user-data-dir=${profile}`,
      "--dump-dom", url
    ], { windowsHide: true });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", chunk => { stdout += chunk; });
    child.stderr.on("data", chunk => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", code => {
      try { fs.rmSync(profile, { recursive: true, force: true }); } catch {}
      if (code !== 0 || !stdout.includes("<html")) reject(new Error(`Edge failed (${code}): ${stderr.slice(-300)}`));
      else resolve(stdout);
    });
  });
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

const jobs = languages.flatMap(language => pages.map(page => ({ language, page })));
const errors = [];
let completed = 0;

await mapConcurrent(jobs, 4, async (job, index) => {
  const dictionary = JSON.parse(fs.readFileSync(path.join(root, "assets", "i18n", "site-content", `${job.language}.json`), "utf8"));
  const url = `${baseUrl}${job.page}${job.page.includes("?") ? "&" : "?"}lang=${encodeURIComponent(job.language)}`;
  const html = await dumpDom(url, index);
  if (process.env.TW_AUDIT_DUMP_DIR) {
    fs.mkdirSync(process.env.TW_AUDIT_DUMP_DIR, { recursive: true });
    fs.writeFileSync(path.join(process.env.TW_AUDIT_DUMP_DIR, `${job.language}-${index}.html`), html, "utf8");
  }
  const nodes = textNodes(html);
  if (!new RegExp(`<html[^>]+lang=["']${job.language}["']`, "i").test(html)) errors.push(`${job.language} ${job.page}: incorrect html lang`);
  if (!html.includes('id="languagePicker"')) errors.push(`${job.language} ${job.page}: missing language picker`);
  if (/currently shown in English|detailed article is currently shown in English/i.test(html)) errors.push(`${job.language} ${job.page}: obsolete English-only notice`);

  const leaks = Object.entries(dictionary)
    .filter(([source, target]) => source !== target && /[A-Za-z]/.test(source) && nodes.has(source))
    .filter(([source]) => !(source === "Guide" && (job.language === "de" || job.language === "fr")))
    .filter(([source]) => !(source === "or" && job.language === "fr")) // French game currency: gold = or.
    .map(([source]) => source);
  if (leaks.length) errors.push(`${job.language} ${job.page}: ${leaks.length} untranslated node(s): ${leaks.slice(0, 3).join(" | ")}`);
  completed++;
  if (completed % pages.length === 0) console.log(`Rendered ${completed}/${jobs.length} localized pages.`);
});

if (errors.length) {
  console.error(`Rendered locale audit failed with ${errors.length} issue(s):`);
  errors.forEach(error => console.error(`- ${error}`));
  process.exit(1);
}
console.log(`Rendered locale audit passed: ${jobs.length} pages across ${languages.length} non-English locales.`);
