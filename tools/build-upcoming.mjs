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

// True when this region's real EnemyData assets are on disk, i.e. the content is built and the
// live data export now supplies it. Reads the assets rather than a flag so it cannot go stale.
const ENEMY_DIR = path.resolve(ROOT, "../Infinite Loot-Loop/Assets/ScriptableObjects/Enemies");
const _regionBuilt = new Map();
function regionAssetsExist(code) {
  if (_regionBuilt.has(code)) return _regionBuilt.get(code);
  let built = false;
  try {
    built = fs.readdirSync(ENEMY_DIR).some((f) => f.startsWith(code) && f.endsWith(".asset"));
  } catch { built = false; }
  _regionBuilt.set(code, built);
  return built;
}

// The other half of "has this region shipped": its MapData assets. Kept separate from the enemy
// test because the two genuinely diverge — Stone/Egypt/Temple had monsters and no maps, and the
// Museum is the exact inverse. Reading the disk for both is what lets a region move between this
// file and the live export without anyone remembering to flip anything.
const MAP_DIR = path.resolve(ROOT, "../Infinite Loot-Loop/Assets/ScriptableObjects/Maps");
const _regionMaps = new Map();
function regionMapsExist(code) {
  if (_regionMaps.has(code)) return _regionMaps.get(code);
  let built = false;
  try {
    built = fs.readdirSync(MAP_DIR).some((f) => f.startsWith(code) && f.endsWith(".asset"));
  } catch { built = false; }
  _regionMaps.set(code, built);
  return built;
}

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
  // ⛔★★★ A REGION THAT HAS FULLY SHIPPED LEAVES THIS FILE — the rule tools/README.md already
  // states ("drop it from the design doc parse list here and let build-data.mjs pick it up from the
  // real assets instead — do not leave both sources live"), now actually implemented.
  //
  // ★ WHY IT HAD TO BE: this loop HARD-FAILS on a region whose tables it cannot parse, and on
  // 2026-09-23 the whole generator died with "ST: boss block not found" — Stone, Egypt and The
  // Temple had shipped, the design doc had been rewritten around them (commit 9988524a1, "6.0.0
  // /7.0.0 replanned"), and a parser still being pointed at a doc it no longer owns took the file
  // down with it. The planned copies were already inert anyway: `mergeUpcoming` skips any map
  // data.json already has, and all three are published there.
  //
  // ⚠ DERIVED, NOT A HAND-FLIPPED SWITCH — same discipline as regionAssetsExist(). "Fully shipped"
  // means BOTH halves exist: the monsters AND the MapData. A region with monsters but no maps (what
  // ST/EG/BD were a week ago) still belongs here, for its maps alone.
  if (regionAssetsExist(code) && regionMapsExist(code)) continue;
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
    pitch,
    maps,
    // ⛔ ONCE THE REAL ASSETS EXIST, STOP PUBLISHING THE PLANNED COPIES.
    // app.js's mergeUpcoming() PUSHES without deduping, so every planned creature/gear/boss that
    // also exists for real would be listed TWICE on the wiki. Worse, the ids do not match — the
    // plan calls a monster ST_LichenCrawler while the asset is ST01_Z0 — so an id-based dedupe in
    // app.js could not have caught the creatures or the boss, only the gear.
    // Owner ruled 2026-09-16: publish Epoch 4, but MAPS stay "Upcoming". That is exactly what
    // falls out of asking the disk: the monsters/items/bosses are built, the MapData assets are
    // not (zero exist for ST/EG/BD), so maps keep their planned entry and nothing else does.
    // ⚠ DERIVED, never a hand-flipped switch — the day the maps are authored they leave this file
    // by themselves, the same way these creatures just did.
    creatures: regionAssetsExist(code) ? [] : creatures,
    gear:      regionAssetsExist(code) ? [] : gear,
    boss:      regionAssetsExist(code) ? null : boss
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

// ── THE MUSEUM (6.0.0) ────────────────────────────────────────────────────────────────────────
// ★ ADDED 2026-09-23 (owner: "update tonyworks site, the maps first").
//
// ⛔ IT IS THE MIRROR IMAGE OF STONE/EGYPT/TEMPLE, AND THAT IS WHY THE DERIVED RULE ABOVE DOES NOT
// FIT IT. Those three have real monsters/items/bosses and no MapData, so `regionAssetsExist()`
// publishes their planned MAPS and nothing else. The Museum has 25 real MapData assets and ZERO
// enemies, items, zones or bosses. Asking the disk would therefore publish everything EXCEPT the
// maps — the exact opposite of what is true, because the deciding question for the Museum is not
// "does an asset exist" but "has the region been RELEASED". It has not: `ShopManager.MuseumReleased
// => false`, and `build-data.mjs` holds all 26 of its assets for that reason.
//
// ⇒ While the flag is false the whole region is announced from the blueprint. When it flips, this
// block stops emitting and `build-data.mjs` picks up whatever is authored — the README's one rule
// holds either way: a region lives in ONE source, never both.
//
// ⛔ ONE LIST, SAME AS EVERYTHING ELSE HERE. Every name is require()'d out of
// `Tools/epoch4_blueprint/r_mu.js`, the authored blueprint the Unity setup tools and the art-prompt
// docs are both generated from. Nothing below is retyped.
//
// ★ FOUR WINGS = FOUR "WORLDS", because `mergeUpcoming()` in app.js takes exactly ONE boss per
// world and the Museum has four. Splitting on the wing is not a workaround — it is the building's
// own structure, and it is already how `parts` label themselves ("Museum · Stone Age").
const MU_BLUEPRINT = path.resolve(ROOT, "../Infinite Loot-Loop/Tools/epoch4_blueprint/r_mu.js");
const MU_SHOPMGR   = path.resolve(ROOT, "../Infinite Loot-Loop/Assets/Scripts/Core/ShopManager.cs");
const museumReleased = fs.existsSync(MU_SHOPMGR)
  && /MuseumReleased\s*=>\s*true\s*;/.test(fs.readFileSync(MU_SHOPMGR, "utf8"));
const museumWorlds = [];
if (!museumReleased && fs.existsSync(MU_BLUEPRINT)) {
  const mu = require(MU_BLUEPRINT);
  const mapById = new Map(mu.maps.map((m) => [m.id, m]));
  const bossByMap = new Map((mu.bosses || []).map((b) => [b.map, b]));
  // Wing ranges are authored as "MU02–MU05" with an EN DASH, not a hyphen. Splitting on /-/ here
  // returns the whole string and every map lands in wing one; match the digits instead.
  const wingRange = (s) => {
    const m = String(s).match(/MU(\d+)\D+MU(\d+)/);
    return m ? [Number(m[1]), Number(m[2])] : null;
  };
  const num = (id) => Number(String(id).replace(/^MU/, ""));
  const gearByMap = new Map((mu.gear || []).map((g) => [g.map, g.items || []]));

  const wingWorld = (wing) => {
    const range = wingRange(wing.maps);
    if (!range) return null;
    const ids = mu.maps.filter((m) => num(m.id) >= range[0] && num(m.id) <= range[1]).map((m) => m.id);
    // ⛔ EVERY WING IS NAMED "Museum", AND THAT IS LOAD-BEARING — it is not a lost opportunity to
    // label them. `mergeUpcoming` copies `w.name` onto each map as its `world`, and the atlas draws
    // a world with a HAND-WRITTEN `wnode(d, "<name>")` cell in app.js whose maps are found by
    // `m.world === w`. Five worlds called "Museum · <wing>" therefore rendered NOWHERE: the data was
    // correct, the merge was correct, and the atlas had no cell for any of those names.
    // ⇒ One name, one atlas cell, 25 maps found. The wing survives where it belongs — on each map's
    // note ("Stone Age wing") — and splitting the record four ways is still what gives each wing its
    // own boss, because `mergeUpcoming` takes exactly one per world.
    // ⚠ Same family as [[site_nav_is_js_built_from_one_array]]: anything the site builds from a
    // hard-coded list must be ADDED to that list; publishing the data is not enough.
    const name = "Museum";
    const maps = ids.map((id) => {
      const m = mapById.get(id);
      return {
        id, name: m.name, zoneCount: (m.zones || []).length,
        // ⛔ NO LEVEL. The v6 chain is the balance pass's to own and nothing is baked yet; a
        // projected band printed here reads back later as if it had been authored.
        bandStart: null,
        note: wing.n + " wing" + (bossByMap.has(id) ? " — boss room" : ""),
        width: m.W, height: m.H, orient: m.orient || null, axis: m.orient || null,
        isBossMap: bossByMap.has(id), zoneNames: m.zones || [], doors: []
      };
    });
    const creatures = (mu.creatures || [])
      .map((c) => ({
        id: "MU_" + String(c.n).replace(/[^A-Za-z0-9]+/g, ""), name: c.n,
        areas: String(c.maps).split(",").map((s) => s.trim()).filter(Boolean)
      }))
      .filter((c) => c.areas.some((a) => ids.includes(a)));
    const gear = [];
    for (const id of ids) {
      (gearByMap.get(id) || []).forEach((entry, i) => {
        if (i >= SLOTS.length) return;
        gear.push({ id: id + "_" + SLOTS[i], name: String(entry).split("|")[0].trim(),
                    type: SLOTS[i], tier: id, tierIndex: num(id) });
      });
    }
    const b = ids.map((id) => bossByMap.get(id)).find(Boolean);
    const boss = b ? {
      id: b.map + "_Boss", mapId: b.map, name: b.n,
      // ⛔ NO LEVEL AND NO RELIC BONUS. `r_mu.js` authors the relic's NAME and nothing numeric, and
      // app.js renders a relic as "HP / ATK / DEF <bonus> (planned)" — handing it an empty bonus
      // publishes a blank stat line, which is worse than no relic entry at all. The name is carried
      // in the blurb instead, where it cannot be mistaken for an authored number.
      level: null,
      blurb: String(b.pitch || "").replace(/\s+/g, " ").trim()
             + (b.relic ? "  Relic: " + b.relic + "." : ""),
      relic: null
    } : null;
    return {
      code: "MU", name, kind: "region", leg: wing.leg ?? null, anchor: "Cloud Plaza",
      levelFrom: null, levelTo: null,
      zoneCount: maps.reduce((a, m) => a + m.zoneCount, 0),
      pitch: String(wing.note || mu.pitch || "").replace(/\s+/g, " ").trim(),
      maps, creatures, gear, boss
    };
  };

  // MU01 is a MONSTERLESS HUB (the Cloud Plaza pattern), so it is its own world with no boss and
  // no pool — listing it inside a wing would attribute the wing's monsters to the atrium.
  const atrium = mapById.get("MU01");
  if (atrium) museumWorlds.push({
    code: "MU", name: "Museum", kind: "hub", leg: null, anchor: "Cloud Plaza",
    levelFrom: null, levelTo: null, zoneCount: (atrium.zones || []).length,
    pitch: String(mu.pitch || "").replace(/\s+/g, " ").trim(),
    maps: [{ id: "MU01", name: atrium.name, zoneCount: (atrium.zones || []).length, bandStart: null,
             note: "hub — no encounters", width: atrium.W, height: atrium.H,
             orient: atrium.orient || null, axis: atrium.orient || null,
             isBossMap: false, zoneNames: atrium.zones || [], doors: [] }],
    creatures: [], gear: [], boss: null
  });
  for (const wing of mu.wings || []) {
    const w = wingWorld(wing);
    if (w) museumWorlds.push(w);
  }
}

const ordered = regions.slice().sort((a, b) => a.leg - b.leg);
const out = {
  generatedAt: new Date().toISOString().replace(/\.\d+Z$/, "Z"),
  source: "Assets/Project Information/epoch4_wave1_cloud_and_circle.md"
          + (museumWorlds.length ? " + Tools/epoch4_blueprint/r_mu.js (Museum, 6.0.0)" : ""),
  epoch: 4, wave: 1,
  note: "Planned content. Nothing here is built: no assets, no art and NO STATS exist yet. "
        + "Level bands are projections owned by the balance pass, not authored values."
        + (museumWorlds.length
           ? " The Museum's 25 maps ARE authored in Unity, but the region is unreleased "
             + "(ShopManager.MuseumReleased is false) so it is announced here rather than published "
             + "as live data; it carries no levels and no stats at all."
           : ""),
  route: ordered.map((r) => ({ leg: r.leg, code: r.code, name: r.name, anchor: r.anchor })),
  worlds: [hub, ...ordered, ...museumWorlds],
  counts: {
    // Museum wings count as regions here — they are what this file is announcing now that
    // Stone/Egypt/Temple have shipped out of it. A "regions: 0" line while 25 maps are listed
    // reads as a broken build.
    regions: regions.length + museumWorlds.filter((w) => w.kind === "region").length,
    maps: regions.reduce((a, r) => a + r.maps.length, 0) + hub.maps.length
          + museumWorlds.reduce((a, w) => a + w.maps.length, 0),
    creatures: regions.reduce((a, r) => a + r.creatures.length, 0)
               + museumWorlds.reduce((a, w) => a + w.creatures.length, 0),
    gear: regions.reduce((a, r) => a + r.gear.length, 0)
          + museumWorlds.reduce((a, w) => a + w.gear.length, 0),
    bosses: regions.filter((r) => r.boss).length + museumWorlds.filter((w) => w.boss).length,
    relics: regions.filter((r) => r.boss).length
  }
};
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(out, null, 1) + "\n");
console.log("Wrote " + path.relative(ROOT, OUT).replace(/\\/g, "/"), out.counts);
const allMaps = out.worlds.flatMap((w) => w.maps);
const ids = new Set(allMaps.map((m) => m.id));
// A door pointing at a map nobody defined is the failure worth catching. CV01 (the live World
// Gate) and CL02 (a wave-2 plaza) are the two legitimate references outside this wave.
//
// ★ AND SO IS ANY MAP THAT HAS SHIPPED. The Cloud Plaza's doors lead to Stone, Egypt and The
// Temple; the day those three left this file for data.json, `CL01 -> ST01` started reading as
// dangling and took the build down — a door that had become MORE correct, not less. Resolve the
// target against the live export as well as this file, so "shipped" and "planned" are one
// namespace. ⚠ If data.json is missing the check simply narrows to this file rather than passing
// vacuously: a typo'd door must still fail.
let shippedIds = new Set();
try {
  const live = JSON.parse(fs.readFileSync(path.resolve(ROOT, "apps/infinite-loot-loop/data/data.json"), "utf8"));
  shippedIds = new Set((live.maps || []).map((m) => m.id));
} catch { /* no live export yet — fall back to this file's own ids */ }
const dangling = allMaps.flatMap((m) => m.doors
  .filter((dr) => !ids.has(dr.to) && !shippedIds.has(dr.to) && dr.to !== "CV01" && dr.to !== "CL02")
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
    r.gear.length + " gear · " + (r.boss ? "boss " + r.boss.name + " (lv " + r.boss.level.toLocaleString("en-US") + ")" : "boss/creatures/gear now BUILT — published from real assets, maps stay Upcoming"));
}
