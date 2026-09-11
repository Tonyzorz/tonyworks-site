#!/usr/bin/env node
/**
 * build-upcoming.mjs — emit apps/infinite-loot-loop/data/upcoming.json
 *
 * ⛔ ONE LIST. Every name here is PARSED out of the Unity project's design doc
 *    Assets/Project Information/epoch4_wave1_cloud_and_circle.md
 * and never retyped. The Maze batch shipped 48 PNGs matching 1 of 124 enemy names because two
 * lists existed; the game repo already polices that doc with Tools/epoch4_blueprint/namecheck.js,
 * and this is simply the third consumer of the same tables.
 *
 * These regions are NOT AUTHORED — no assets, no art, no stats. So this file carries names,
 * structure and the PROJECTED level band only. It must never emit an HP/ATK/DEF number: the
 * balance pass owns those, and a fabricated stat on a public wiki is worse than a blank.
 *
 * Run:  node tools/build-upcoming.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

// maps.js is CommonJS (module.exports) and this file is ESM, so it needs an explicit require bridge.
const require = createRequire(import.meta.url);

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const DOC = path.resolve(ROOT, "../Infinite Loot-Loop/Assets/Project Information/epoch4_wave1_cloud_and_circle.md");
// MAP GEOMETRY HAS ITS OWN SOURCE OF TRUTH, and it is not the design doc:
// Tools/epoch4_blueprint/maps.js is "THE ONLY PLACE MAP GEOMETRY IS AUTHORED". buildall.js derives
// every door, zone rect and landing from it and verifies them against the real engine constants.
// We require() maps.js rather than parsing the emitted doc, and rather than requiring buildall.js,
// which would WRITE the prompt docs back into the game repo as a side effect of building a website.
const GEO = path.resolve(ROOT, "../Infinite Loot-Loop/Tools/epoch4_blueprint/maps.js");
const HUBSRC = path.resolve(ROOT, "../Infinite Loot-Loop/Tools/epoch4_blueprint/buildall.js");
const OUT = path.resolve(ROOT, "apps/infinite-loot-loop/data/upcoming.json");

if (!fs.existsSync(DOC)) {
  console.error("FATAL: design doc not found at\n  " + DOC +
    "\nThe Unity project must sit beside this repo as ../Infinite Loot-Loop.");
  process.exit(1);
}
const md = fs.readFileSync(DOC, "utf8");
const fail = (m) => { console.error("FATAL: " + m); process.exit(1); };
if (!fs.existsSync(GEO)) fail("map geometry not found at\n  " + GEO);
const { R: GEOM } = require(GEO);

/**
 * The door graph, derived exactly as buildall.js derives it (its `prev` rule): inside a region,
 * map 01 goes back to the hub and every other map goes back to its predecessor; the three "01"
 * maps carry the two extra ring doors that close the Stone / Egypt / Temple circle.
 *
 * The BOSS MAP HAS ONLY A BACK DOOR. maps.js gives ST08/EG08/BD08 one door each and no victory
 * portal, even though the design doc section 1 wiring table lists ST08_to_CL01_Victory. The
 * geometry is the half that is machine-verified (0 ERR / 0 WARN), so it wins here; the mismatch
 * belongs to the design doc to settle, and is reported at the end of this build.
 */
function doorsFor(id) {
  const m = GEOM[id]; if (!m) return [];
  const reg = id.slice(0, 2), n = Number(id.slice(2));
  const pad = (i) => reg + String(i).padStart(2, "0");
  const out = [];
  out.push(n === 1
    ? { to: "CL01", kind: "hub",  label: "back to the Cloud Plaza" }
    : { to: pad(n - 1), kind: "back", label: "back" });
  if (GEOM[pad(n + 1)]) out.push({ to: pad(n + 1), kind: "onward", label: "onward" });
  if (m.ringW) out.push({ to: m.ringW, kind: "ring", label: "ring door, west edge" });
  if (m.ringE) out.push({ to: m.ringE, kind: "ring", label: "ring door, east edge" });
  return out;
}

// CL01 doors live in buildall.js HUBS, not in maps.js. Read them out of the source instead of
// retyping them. The character classes below dodge quote characters on purpose.
function hubDoors() {
  const src = fs.readFileSync(HUBSRC, "utf8");
  const blk = src.match(/id:\s*.CL01.[\s\S]*?doors:\s*\[([\s\S]*?)\],\s*\n\s*layout:/);
  if (!blk) fail("could not read the CL01 door list out of buildall.js");
  const doors = [...blk[1].matchAll(/\[.([A-Z]+).,\s*.([A-Z0-9]+).,\s*.([^,\]]*?).\]/g)]
    .map((dr) => ({
      edge: dr[1], to: dr[2],
      label: dr[3].replace(/[\u27f5\u27f6\u27f7]/g, "").trim()
    }));
  if (doors.length < 4) fail("CL01 parsed only " + doors.length + " doors; expected at least 4");
  return doors;
}

const SLOTS = ["Weapon", "Armor", "Helmet", "Shoes", "Accessory"];
// Display label for each region code. The doc titles them; this only maps code -> world name.
const WORLD_NAME = { ST: "Stone", EG: "Egypt", BD: "The Temple", CL: "Cloud Plaza" };

/** Slice the doc between a heading and the next heading of the same or higher level. */
function section(startRe) {
  const m = md.match(startRe);
  if (!m) return null;
  const rest = md.slice(m.index + m[0].length);
  const end = rest.search(/\n### |\n## /);
  return { head: m[0], body: end < 0 ? rest : rest.slice(0, end) };
}

/** Rows of the FIRST markdown table appearing after `afterRe` inside `body`. */
function tableRows(body, afterRe) {
  const at = body.search(afterRe);
  if (at < 0) return [];
  const rows = [];
  let started = false;
  for (const ln of body.slice(at).split("\n")) {
    const t = ln.trim();
    if (!t.startsWith("|")) { if (started) break; continue; }
    if (/^\|[\s:|-]+\|$/.test(t)) { started = true; continue; }  // the |---|---| separator
    if (!started) continue;                                       // header row
    rows.push(t.replace(/^\||\|$/g, "").split("|").map((c) => c.trim()));
  }
  return rows;
}
const clean = (s) => String(s == null ? "" : s).replace(/\*\*/g, "").replace(/`/g, "").trim();
const num = (s) => Number(String(s).replace(/[^0-9]/g, "")) || null;

const ZONE_DRIFT = [];
const regions = [];
for (const [idx, code] of [["3.1", "ST"], ["3.2", "EG"], ["3.3", "BD"]]) {
  const sec = section(new RegExp("^### " + idx.replace(".", "\\.") + " .*$", "m"));
  if (!sec) fail("section " + idx + " (" + code + ") not found in the design doc");
  const { head, body } = sec;

  // "### 3.1 STONE — `ST` · **leg 3** (after Korea-hard) · lv 32,800,000 → boss ~45,590,000"
  const leg = num((head.match(/leg\s*\**\s*(\d+)/i) || [])[1]);
  const lvs = head.match(/lv\s*([\d,]+)\s*→\s*boss\s*~?([\d,]+)/i);
  if (!leg || !lvs) fail(code + ": could not read leg / level band from its heading:\n  " + head);
  const anchor = (head.match(/\(after ([^)]+?)(?:,[^)]*)?\)/) || [])[1] || null;
  const pitch = clean((body.match(/\*\*Pitch:\*\*\s*([\s\S]*?)\n\n/) || [])[1]).replace(/\s+/g, " ");

  // maps: | ST01 | **Standing Circle** | 6 | 32,800,000 | note |
  const maps = tableRows(body, /\| map \| name \| zones \|/i)
    .filter((r) => new RegExp("^" + code + "\\d\\d$").test(clean(r[0])))
    .map((r) => {
      const id = clean(r[0]);
      const g = GEOM[id];
      if (!g) fail(id + " is in the design doc but not in maps.js (the geometry source of truth)");
      // The design doc zone table and the geometry have drifted on a few maps. Do NOT fail the
      // build on it: maps.js is the machine-verified half (0 ERR / 0 WARN) so it wins, and the doc
      // is what a human has to correct. Collect every mismatch and print them all at the end.
      if (g.zones.length !== Number(clean(r[2])))
        ZONE_DRIFT.push(id + ": design doc " + clean(r[2]) + " zones, maps.js " + g.zones.length);
      return {
        id, name: clean(r[1]), zoneCount: g.zones.length,
        bandStart: num(r[3]), note: clean(r[4]),
        width: g.W, height: g.H, orient: g.orient,
        // V = entered from the SOUTH edge, exits NORTH. H = entered from the WEST, exits EAST.
        axis: g.orient === "V" ? "south to north" : "west to east",
        isBossMap: !!g.boss, zoneNames: g.zones.slice(), doors: doorsFor(id)
      };
    });
  if (maps.length !== 8) fail(code + ": expected 8 maps, parsed " + maps.length);

  // creature pool: | 1 | **Lichen Crawler** | ST01, ST05 |
  const creatures = tableRows(body, /\| #\s*\| base creature \| maps \|/i)
    .filter((r) => /^\d+$/.test(clean(r[0])))
    .map((r) => ({
      id: code + "_" + clean(r[1]).replace(/[^A-Za-z0-9]+/g, ""),
      name: clean(r[1]),
      areas: clean(r[2]).split(",").map((s) => s.trim()).filter(Boolean)
    }));
  if (creatures.length !== 12) fail(code + ": expected a 12-creature pool, parsed " + creatures.length);

  // gear: | ST01 | weapon | armour | helmet | shoes | accessory |
  const gear = [];
  for (const r of tableRows(body, /\| tier \| weapon \| armour \|/i)) {
    const tier = clean(r[0]);
    if (!new RegExp("^" + code + "\\d\\d$").test(tier)) continue;
    SLOTS.forEach((slot, i) => gear.push({
      id: tier + "_" + slot, name: clean(r[i + 1]), type: slot,
      tier, tierIndex: Number(tier.slice(2))
    }));
  }
  if (gear.length !== 40) fail(code + ": expected 40 gear items (8 tiers x 5 slots), parsed " + gear.length);

  // boss: **Boss — `ST08` · THE UNMOVED** (lv ~45,590,000) ... **Relic: X** — 20 / 20 / 20 %, cap 3.
  const bm = body.match(/\*\*Boss\s*—\s*`([A-Z]{2}\d\d)`\s*·\s*([^*]+?)\*\*\s*\(lv\s*~?([\d,]+)\)([\s\S]*?)\n\n/);
  if (!bm) fail(code + ": boss block not found");
  const relic = body.match(/\*\*Relic:\s*([^*]+?)\*\*\s*—\s*([\d\s/]+)%,\s*cap\s*(\d+)/);
  if (!relic) fail(code + ": boss relic line not found");
  const boss = {
    id: clean(bm[1]) + "_Boss", mapId: clean(bm[1]),
    name: clean(bm[2]).replace(/\s+/g, " "),
    level: num(bm[3]),
    // Strip the Relic sentence BEFORE clean() — clean() removes the ** markers, so a regex looking
    // for "**Relic:" afterwards can never match and the relic line leaks into the fight blurb.
    blurb: clean(String(bm[4]).replace(/\*\*Relic:[\s\S]*$/, "")).replace(/\s+/g, " ").trim(),
    relic: {
      id: clean(bm[1]) + "_BossRelic", name: clean(relic[1]),
      bonus: relic[2].replace(/\s+/g, " ").trim() + "%", cap: Number(relic[3])
    }
  };

  regions.push({
    code, name: WORLD_NAME[code], kind: "region", leg, anchor,
    levelFrom: num(lvs[1]), levelTo: num(lvs[2]),
    zoneCount: maps.reduce((a, m) => a + (m.zoneCount || 0), 0),
    pitch, maps, creatures, gear, boss
  });
}

// ── the hub ───────────────────────────────────────────────────────────────────────────────────
// CL01 is a town: no monsters, no drops, no gear tier of its own (design doc §1, decision 1).
const hub = {
  code: "CL", name: WORLD_NAME.CL, kind: "hub", leg: null, anchor: null,
  levelFrom: null, levelTo: null, zoneCount: 1,
  pitch: "A second World Gate, reached by the stair on the WEST side of the hub. Shop, save and " +
         "four exits: one each to Stone, Egypt and The Temple, and one back down to the World Gate.",
  maps: [{
    id: "CL01", name: "Cloud Plaza", zoneCount: 1, bandStart: null,
    note: "hub town — no encounters", width: 24, height: 24, orient: null, axis: null,
    isBossMap: false, zoneNames: ["The Plaza"],
    doors: hubDoors().map((dr) => ({
      to: dr.to, edge: dr.edge, label: dr.label,
      // From the plaza these lead OUT to a region; "hub" is the kind used by a region map for
      // its door back IN, so labelling both the same made CL01 read "to the hub" about itself.
      kind: dr.to === "CV01" ? "worldgate" : dr.to === "CL02" ? "wave2" : "region"
    }))
  }],
  creatures: [], gear: [], boss: null
};

const ordered = regions.slice().sort((a, b) => a.leg - b.leg);
const out = {
  generatedAt: new Date().toISOString().replace(/\.\d+Z$/, "Z"),
  source: "Assets/Project Information/epoch4_wave1_cloud_and_circle.md",
  epoch: 4, wave: 1,
  note: "Planned content. Nothing here is built: no assets, no art and NO STATS exist yet. " +
        "Level bands are projections owned by the balance pass, not authored values.",
  route: ordered.map((r) => ({ leg: r.leg, code: r.code, name: r.name, anchor: r.anchor })),
  worlds: [hub, ...ordered],
  counts: {
    regions: regions.length,
    maps: regions.reduce((a, r) => a + r.maps.length, 0) + hub.maps.length,
    creatures: regions.reduce((a, r) => a + r.creatures.length, 0),
    gear: regions.reduce((a, r) => a + r.gear.length, 0),
    bosses: regions.length, relics: regions.length
  }
};
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(out, null, 1) + "\n");
console.log("Wrote " + path.relative(ROOT, OUT).replace(/\\/g, "/"), out.counts);
const allMaps = out.worlds.flatMap((w) => w.maps);
const ids = new Set(allMaps.map((m) => m.id));
// A door pointing at a map nobody defined is the failure worth catching. CV01 (the live World
// Gate) and CL02 (a wave-2 plaza) are the two legitimate references outside this wave.
const dangling = allMaps.flatMap((m) => m.doors
  .filter((dr) => !ids.has(dr.to) && dr.to !== "CV01" && dr.to !== "CL02")
  .map((dr) => m.id + " -> " + dr.to));
if (dangling.length) fail("doors point at maps that do not exist: " + dangling.join(", "));
const doorCount = allMaps.reduce((a, m) => a + m.doors.length, 0);
if (ZONE_DRIFT.length) {
  console.log("  ⚠ ZONE COUNT DRIFT (geometry used, design doc needs fixing):");
  for (const z of ZONE_DRIFT) console.log("      " + z);
}
console.log("  graph: " + doorCount + " doors over " + allMaps.length + " maps, 0 dangling");
const noExit = allMaps.filter((m) => m.isBossMap && m.doors.length === 1).map((m) => m.id);
if (noExit.length) console.log("  note: boss maps with only a back door (no victory portal in",
  "maps.js, though the design doc lists one): " + noExit.join(", "));
for (const r of ordered) {
  console.log("  leg " + r.leg + "  " + r.code + " " + r.name.padEnd(11) +
    r.maps.length + " maps · " + r.zoneCount + " zones · " + r.creatures.length + " creatures · " +
    r.gear.length + " gear · boss " + r.boss.name + " (lv " + r.boss.level.toLocaleString("en-US") + ")");
}
