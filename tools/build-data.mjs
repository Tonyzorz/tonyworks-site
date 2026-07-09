// Builds apps/infinite-loot-loop/data/data.json + sprite/map images directly
// from the Unity project's .asset YAML — no Unity required.
//
//   node tools/build-data.mjs
//   powershell -File tools/resize-images.ps1   # then shrink the sprites
//
// Assumes the Unity project sits next to this repo as ../Infinite Loot-Loop.
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SITE = path.resolve(__dirname, "..");
const GAME = path.resolve(SITE, "..", "Infinite Loot-Loop");
const SO   = path.join(GAME, "Assets/ScriptableObjects");
const SPR  = path.join(GAME, "Assets/Sprites");
const OUT  = path.join(SITE, "apps/infinite-loot-loop");
const DATA = path.join(OUT, "data");
const IMG  = path.join(OUT, "assets/img");

fs.mkdirSync(DATA, { recursive: true });
fs.mkdirSync(IMG, { recursive: true });

function walk(dir, filter, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, filter, out);
    else if (filter(p)) out.push(p);
  }
  return out;
}
const read = (p) => fs.readFileSync(p, "utf8");

const guidToAsset = new Map();
const guidToPng = new Map();
function metaGuid(metaPath) { const m = read(metaPath).match(/^guid:\s*([0-9a-f]+)/m); return m ? m[1] : null; }
for (const meta of walk(SO, (p) => p.endsWith(".asset.meta"))) { const g = metaGuid(meta); if (g) guidToAsset.set(g, path.basename(meta).replace(/\.asset\.meta$/, "")); }
for (const meta of walk(SPR, (p) => p.endsWith(".png.meta"))) { const g = metaGuid(meta); if (g) guidToPng.set(g, meta.replace(/\.meta$/, "")); }

// Unwrap YAML scalars: single-quoted ('a''b' -> a'b) and double-quoted. Unity single-quotes
// strings containing special chars (e.g. "[H]") and escapes an inner ' as ''.
function yamlStr(v) {
  v = v.trim();
  if (v.length >= 2 && v[0] === "'" && v[v.length - 1] === "'") return v.slice(1, -1).replace(/''/g, "'");
  if (v.length >= 2 && v[0] === '"' && v[v.length - 1] === '"') return v.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, "\\");
  return v;
}
const field = (t, k) => { const m = t.match(new RegExp("^  " + k + ":\\s?(.*)$", "m")); return m ? yamlStr(m[1].trim()) : ""; };
const num   = (t, k) => { const v = field(t, k); return v === "" ? 0 : Number(v); };
const bool  = (t, k) => field(t, k) === "1";
function guidOf(t, k) { const m = t.match(new RegExp("^  " + k + ":\\s*\\{[^}]*guid:\\s*([0-9a-f]+)", "m")); return m ? m[1] : null; }
const assetName = (guid) => guid ? (guidToAsset.get(guid) || "") : "";
const loadCategory = (sub) => walk(path.join(SO, sub), (p) => p.endsWith(".asset")).map((p) => ({ id: path.basename(p, ".asset"), text: read(p) }));

let imagesWritten = 0;
const safe = (s) => String(s).replace(/[^A-Za-z0-9_-]/g, "_");
function copySprite(guid, prefix, id) {
  if (!guid) return "";
  const src = guidToPng.get(guid);
  if (!src || !fs.existsSync(src)) return "";
  const file = `${prefix}_${safe(id)}.png`;
  const dest = path.join(IMG, file);
  // Skip if already present so we don't clobber resize-images.ps1 output. Delete
  // assets/img (or the file) to force a fresh copy, then re-run the resize script.
  if (!fs.existsSync(dest)) { fs.copyFileSync(src, dest); imagesWritten++; }
  return file;
}

const RARITY = ["Common","Uncommon","Rare","Epic","Legendary"];
const ITYPE  = ["Weapon","Armor","Helmet","Shoes","Accessory"];
const ATYPE  = ["TotalKills","BossKills","GoldEarned","RunsCompleted","LevelReached","TotalGoldSpent","UniqueBossesDefeated","HighestKillStreak","NoPenaltyRun","UntouchableWin","AllSlotsEquipped","ItemMaxUpgrade","SpeedClearBoss","ItemBankSize","AllRevivesUsed","RegionBossesCleared"];
const AMODE   = ["Any","Normal","Hard"];
const AREWARD = ["BonusATK","BonusHP","BonusDEF","BonusAGI","BonusLUC","UnlockCharacter"];
const nz = (n) => n && n !== 0;
const d1 = (n) => { const r = Math.round(n * 10) / 10; return Number.isInteger(r) ? r.toFixed(0) : r.toFixed(1); };

const itemById = new Map();
const items = loadCategory("Items").map((a) => {
  const t = a.text;
  const o = {
    id: a.id, name: field(t, "itemName") || a.id, description: field(t, "description"),
    image: copySprite(guidOf(t, "icon"), "item", a.id),
    rarity: RARITY[num(t, "rarity")] || "Common", type: ITYPE[num(t, "itemType")] || "Weapon",
    setName: field(t, "setName"), isUnique: bool(t, "isUnique"), shopUnavailable: bool(t, "shopUnavailable"),
    isHardModeItem: bool(t, "isHardModeItem"), isBossItem: bool(t, "isBossItem"),
    bonusHP: num(t, "bonusHP"), bonusATK: num(t, "bonusATK"), bonusDEF: num(t, "bonusDEF"), bonusAGI: num(t, "bonusAGI"), bonusLUC: num(t, "bonusLUC"),
    buyPrice: num(t, "buyPrice"), maxCopies: num(t, "maxCopies"), effects: []
  };
  const e = [];
  if (nz(o.bonusHP)) e.push("HP +" + o.bonusHP);
  if (nz(o.bonusATK)) e.push("ATK +" + o.bonusATK);
  if (nz(o.bonusDEF)) e.push("DEF +" + o.bonusDEF);
  if (nz(o.bonusAGI)) e.push("AGI +" + o.bonusAGI);
  if (nz(o.bonusLUC)) e.push("LUC +" + o.bonusLUC);
  const P = (k) => num(t, k);
  if (P("bonusHPPercent") > 0) e.push("HP +" + Math.round(P("bonusHPPercent")) + "%");
  if (P("bonusATKPercent") > 0) e.push("ATK +" + Math.round(P("bonusATKPercent")) + "%");
  if (P("bonusDEFPercent") > 0) e.push("DEF +" + Math.round(P("bonusDEFPercent")) + "%");
  if (P("bonusAGIPercent") > 0) e.push("AGI +" + Math.round(P("bonusAGIPercent")) + "%");
  if (P("bonusLUCPercent") > 0) e.push("LUC +" + Math.round(P("bonusLUCPercent")) + "%");
  if (P("lifestealPct") > 0) e.push("Lifesteal " + d1(P("lifestealPct") * 100) + "%");
  if (P("gaugeSlowPct") > 0) e.push("Gauge Slow " + d1(P("gaugeSlowPct") * 100) + "%");
  if (P("bonusMoveSpdPct") > 0) e.push("Move Spd +" + d1(P("bonusMoveSpdPct") * 100) + "%");
  if (P("bonusGoldPct") > 0) e.push("Gold +" + d1(P("bonusGoldPct") * 100) + "%");
  if (P("bonusExpPct") > 0) e.push("EXP +" + d1(P("bonusExpPct") * 100) + "%");
  if (bool(t, "hasHPAbsorb")) e.push("Absorb " + num(t, "hpAbsorbPercent") + "%");
  if (bool(t, "hasAutoRevive")) e.push("Auto Revive");
  if (bool(t, "hasBPBonus")) e.push("BP +" + num(t, "bpBonus"));
  o.effects = e; itemById.set(a.id, o); return o;
});
const itemName = (id) => itemById.has(id) ? itemById.get(id).name : id;

// Enemy stat at a level: base * (1 + scaling * levelsAboveMin) — matches EnemyData.GetHP/ATK/EXP/Gold.
// Hard-mode enemies (_H) have scaling 0, so min == max (fixed stats).
const atLevel = (base, scaling, level, minLevel) =>
  Math.round(base * (1 + scaling * Math.max(0, level - minLevel)));
const enemyById = new Map();
const enemies = loadCategory("Enemies").map((a) => {
  const t = a.text;
  const minLv = num(t, "minLevel"), maxLv = num(t, "maxLevel");
  const bHP = num(t, "baseHP"), bATK = num(t, "baseATK"), bEXP = num(t, "baseEXP"), bGold = num(t, "baseGold");
  const sHP = num(t, "hpScaling"), sATK = num(t, "atkScaling"), sEXP = num(t, "expScaling"), sGold = num(t, "goldScaling");
  const drops = [];
  const re = /- item: \{fileID: \d+, guid: ([0-9a-f]+), type: \d+\}\s*\n\s*dropChance:\s*([\d.]+)/g;
  let m; while ((m = re.exec(t))) { const iid = assetName(m[1]); drops.push({ itemId: iid, itemName: itemName(iid), chance: Number(m[2]) }); }
  const o = {
    id: a.id, name: field(t, "enemyName") || a.id, image: copySprite(guidOf(t, "enemySprite"), "enemy", a.id),
    isBoss: bool(t, "isBoss"), minLevel: minLv, maxLevel: maxLv,
    hpMin:  atLevel(bHP,  sHP,  minLv, minLv), hpMax:  atLevel(bHP,  sHP,  maxLv, minLv),
    atkMin: atLevel(bATK, sATK, minLv, minLv), atkMax: atLevel(bATK, sATK, maxLv, minLv),
    expMin: atLevel(bEXP, sEXP, minLv, minLv), expMax: atLevel(bEXP, sEXP, maxLv, minLv),
    goldMin: atLevel(bGold, sGold, minLv, minLv), goldMax: atLevel(bGold, sGold, maxLv, minLv),
    permanentBPReward: num(t, "permanentBPReward"), drops,
    worlds: [], zoneNames: []   // filled after zones are parsed
  };
  enemyById.set(a.id, o); return o;
});
const enemyName = (id) => enemyById.has(id) ? enemyById.get(id).name : id;

const bosses = loadCategory("Bosses").map((a) => {
  const t = a.text; const lv = num(t, "level");
  return {
    id: a.id, name: field(t, "bossName") || a.id, image: copySprite(guidOf(t, "bossSprite"), "boss", a.id),
    mapId: assetName(guidOf(t, "activeInMap")), level: lv, hp: num(t, "hp"), atk: num(t, "atk"),
    hardModeHp: num(t, "hardModeHp"), hardModeAtk: num(t, "hardModeAtk"), exp: lv * lv * 10 + lv * 100,
    dropItemId: assetName(guidOf(t, "dropItem")), dropItemName: itemName(assetName(guidOf(t, "dropItem"))),
    hardModeDropItemId: assetName(guidOf(t, "hardModeDropItem")), bonusDropItemId: assetName(guidOf(t, "bonusDropItem"))
  };
});

// Boss drops are always accessories in-game (a few have weapon/armor-sounding names but are
// intended as accessories). Normalize their item type so the site categorizes them correctly.
{
  const bossDropIds = new Set();
  bosses.forEach((b) => [b.dropItemId, b.hardModeDropItemId, b.bonusDropItemId]
    .forEach((id) => { if (id) bossDropIds.add(id); }));
  items.forEach((it) => { if (bossDropIds.has(it.id)) it.type = "Accessory"; });
}

const characters = loadCategory("Characters").map((a) => {
  const t = a.text;
  return {
    id: field(t, "characterID") || a.id, name: field(t, "characterName") || a.id, description: field(t, "description"),
    image: copySprite(guidOf(t, "icon"), "char", a.id), iapProductId: field(t, "iapProductId"), unlockAchievementID: field(t, "unlockAchievementID"),
    hpMultiplier: num(t, "hpMultiplier"), atkMultiplier: num(t, "atkMultiplier"), defMultiplier: num(t, "defMultiplier"),
    agiMultiplier: num(t, "agiMultiplier"), lucMultiplier: num(t, "lucMultiplier"),
    ownedBonusDropRatePct: num(t, "ownedBonusDropRatePct"), ownedBonusGoldPct: num(t, "ownedBonusGoldPct"), purchasePrice: num(t, "purchasePrice"),
    ownedBonusHP: num(t, "ownedBonusHP"), ownedBonusATK: num(t, "ownedBonusATK"), ownedBonusDEF: num(t, "ownedBonusDEF"),
    ownedBonusAGI: num(t, "ownedBonusAGI"), ownedBonusLUC: num(t, "ownedBonusLUC"),
    isPremium: bool(t, "isPremium"), unlockedByDefault: bool(t, "unlockedByDefault")
  };
});

const achievements = loadCategory("Achievements").map((a) => {
  const t = a.text;
  return {
    id: field(t, "achievementID") || a.id, name: field(t, "displayName") || a.id, description: field(t, "description"),
    type: ATYPE[num(t, "type")] || "TotalKills", modeRequirement: AMODE[num(t, "modeRequirement")] || "Any",
    rewardType: AREWARD[num(t, "rewardType")] || "BonusATK", characterRewardId: assetName(guidOf(t, "characterReward")),
    targetValue: num(t, "targetValue"), statBonus: num(t, "statBonus")
  };
});

function block(t, key, endKeys) {
  const start = t.indexOf("\n  " + key + ":"); if (start < 0) return "";
  const rest = t.slice(start + 1); let end = rest.length;
  for (const k of endKeys) { const i = rest.indexOf("\n  " + k + ":"); if (i >= 0 && i < end) end = i; }
  return rest.slice(0, end);
}
const zones = loadCategory("Zones").map((a) => {
  const t = a.text;
  const col = t.match(/zoneColor: \{r:\s*([\d.]+),\s*g:\s*([\d.]+),\s*b:\s*([\d.]+)/);
  const toHex = (f) => Math.max(0, Math.min(255, Math.round(f * 255))).toString(16).padStart(2, "0");
  const color = col ? "#" + toHex(+col[1]) + toHex(+col[2]) + toHex(+col[3]) : "#5cb85c";
  const ens = []; let m;
  const er = /- enemy: \{fileID: \d+, guid: ([0-9a-f]+), type: \d+\}\s*\n\s*spawnWeight:\s*([\d.]+)/g;
  const eb = block(t, "enemies", ["bossEnemy", "shopItems", "goldMultiplier"]);
  while ((m = er.exec(eb))) { const eid = assetName(m[1]); ens.push({ enemyId: eid, enemyName: enemyName(eid), spawnWeight: Number(m[2]) }); }
  const shop = []; const sb = block(t, "shopItems", ["goldMultiplier"]);
  const sr = /guid: ([0-9a-f]+), type: 2\}/g;
  while ((m = sr.exec(sb))) shop.push(assetName(m[1]));
  return {
    id: a.id, name: field(t, "zoneName") || a.id, color, bossEnemyId: assetName(guidOf(t, "bossEnemy")),
    zoneTier: num(t, "zoneTier"), minEnemyLevel: num(t, "minEnemyLevel"), maxEnemyLevel: num(t, "maxEnemyLevel"),
    goldMultiplier: num(t, "goldMultiplier"), enemies: ens, shopItems: shop
  };
});

// Map asset id -> in-game visual sprite base name. Most transform cleanly from
// camelCase; these six differ from the plain transform (verified vs the setup tools).
const MAP_VISUAL = {
  AshenForest_Map: "Ashen Forest Pass", DeepForest_Map: "Deep Dark Forest",
  Grassland_Map: "Grassland Plains", LavaCore_Map: "Lava Core Boss Chamber",
  SunBuriedCave_Map: "Sun-Buried Cave", WorldGate_Map: "World Gate Entrance"
};
const mapDisplayName = (id) => MAP_VISUAL[id] || id.replace(/_Map$/, "").replace(/([a-z0-9])([A-Z])/g, "$1 $2");
function copyMapVisual(id) {
  const src = path.join(SPR, "Map", "visual", mapDisplayName(id) + " visual.png");
  if (!fs.existsSync(src)) return "";
  const file = "map_" + safe(id) + ".png";
  const dest = path.join(IMG, file);
  if (!fs.existsSync(dest)) { fs.copyFileSync(src, dest); imagesWritten++; }
  return file;
}
// Group each map asset into its player-facing world (for the route graph on the Maps page).
function mapWorld(id) {
  if (/^Grassland/.test(id))                      return "Grassland";
  if (/WorldGate/.test(id))                       return "World Gate";
  if (/Void/.test(id))                            return "Void Hunt";
  if (/Forest/.test(id))                          return "Forest";
  if (/Volcanic|Lava/.test(id))                   return "Volcanic";
  if (/Desert|Sandstone|Burial|SunBuriedCave/.test(id)) return "Desert";
  if (/Coral|Trench|Temple|Clam|Underwater/.test(id))   return "Underwater";
  return "Other";
}
const maps = loadCategory("Maps").map((a) => {
  const t = a.text; const gw = num(t, "gridWidth"), gh = num(t, "gridHeight"); const hex = field(t, "cells");
  let walkable = 0, blocked = 0;
  if (hex && hex.length === gw * gh * 2) {
    for (let i = 0; i < gw * gh; i++) { const v = parseInt(hex.substr(i * 2, 2), 16); if (v === 0) blocked++; else walkable++; }
  }
  return { id: a.id, name: mapDisplayName(a.id), world: mapWorld(a.id), image: copyMapVisual(a.id), gridWidth: gw, gridHeight: gh, dataVersion: num(t, "dataVersion"), walkableCells: walkable, blockedCells: blocked };
});

// Attach spawn worlds + zone names to each enemy (LIVE zones only: GL/FR/VO/DS/UW normal
// {WORLD}##_Zone# + hard {WORLD}##_HM_Z#, plus VoidHunt). Legacy/duplicate zones are ignored.
const WORLD = { GL: "Grassland", FR: "Forest", VO: "Volcanic", DS: "Desert", UW: "Underwater" };
function zoneWorld(zid) {
  const m = zid.match(/^(GL|FR|VO|DS|UW)\d+_(?:Zone|HM_Z)\d+/);
  if (m) return WORLD[m[1]];
  if (/^VoidHunt/.test(zid)) return "Void Hunt";
  return null;
}
for (const z of zones) {
  const w = zoneWorld(z.id);
  if (!w) continue;
  for (const en of (z.enemies || [])) {
    const e = enemyById.get(en.enemyId);
    if (!e) continue;
    if (!e.worlds.includes(w)) e.worlds.push(w);
    if (z.name && !e.zoneNames.includes(z.name)) e.zoneNames.push(z.name);
  }
}

enemies.sort((a, b) => a.minLevel - b.minLevel);
bosses.sort((a, b) => a.level - b.level);
const root = {
  generatedAt: new Date().toISOString().replace(/\.\d+Z$/, "Z"), game: "Infinite Loot-Loop",
  counts: { enemies: enemies.length, bosses: bosses.length, items: items.length, maps: maps.length, zones: zones.length, characters: characters.length, achievements: achievements.length },
  enemies, bosses, items, maps, zones, characters, achievements
};
fs.writeFileSync(path.join(DATA, "data.json"), JSON.stringify(root, null, 2));
console.log("Wrote data.json", root.counts, "images:", imagesWritten);
