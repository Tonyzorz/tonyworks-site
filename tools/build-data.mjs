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

const field = (t, k) => { const m = t.match(new RegExp("^  " + k + ":\\s?(.*)$", "m")); return m ? m[1].trim() : ""; };
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
  fs.copyFileSync(src, path.join(IMG, file)); imagesWritten++;
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

const enemyById = new Map();
const enemies = loadCategory("Enemies").map((a) => {
  const t = a.text; const drops = [];
  const re = /- item: \{fileID: \d+, guid: ([0-9a-f]+), type: \d+\}\s*\n\s*dropChance:\s*([\d.]+)/g;
  let m; while ((m = re.exec(t))) { const iid = assetName(m[1]); drops.push({ itemId: iid, itemName: itemName(iid), chance: Number(m[2]) }); }
  const o = {
    id: a.id, name: field(t, "enemyName") || a.id, image: copySprite(guidOf(t, "enemySprite"), "enemy", a.id),
    isBoss: bool(t, "isBoss"), minLevel: num(t, "minLevel"), maxLevel: num(t, "maxLevel"),
    baseHP: num(t, "baseHP"), baseATK: num(t, "baseATK"), baseEXP: num(t, "baseEXP"), baseGold: num(t, "baseGold"),
    hpScaling: num(t, "hpScaling"), atkScaling: num(t, "atkScaling"), expScaling: num(t, "expScaling"), goldScaling: num(t, "goldScaling"),
    permanentBPReward: num(t, "permanentBPReward"), drops
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

const ZONE_PALETTE = [[92,184,92],[158,192,77],[217,199,71],[230,148,61],[209,82,71],[158,87,184],[87,128,209],[77,184,189]];
function crc32(buf) { let c = ~0; for (let i = 0; i < buf.length; i++) { c ^= buf[i]; for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xEDB88320 & -(c & 1)); } return (~c) >>> 0; }
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const t = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, crc]);
}
function writePng(file, w, h, rgb) {
  const sig = Buffer.from([137,80,78,71,13,10,26,10]);
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  const stride = w * 3, raw = Buffer.alloc((stride + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (stride + 1)] = 0; rgb.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride); }
  fs.writeFileSync(file, Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw, { level: 9 })), chunk("IEND", Buffer.alloc(0))]));
}
const maps = loadCategory("Maps").map((a) => {
  const t = a.text; const gw = num(t, "gridWidth"), gh = num(t, "gridHeight"); const hex = field(t, "cells");
  let walkable = 0, blocked = 0, image = "";
  if (hex && hex.length === gw * gh * 2) {
    const cells = new Uint8Array(gw * gh);
    for (let i = 0; i < cells.length; i++) cells[i] = parseInt(hex.substr(i * 2, 2), 16);
    for (const v of cells) { if (v === 0) blocked++; else walkable++; }
    const scale = 5, W = gw * scale, H = gh * scale, rgb = Buffer.alloc(W * H * 3);
    for (let cy = 0; cy < gh; cy++) for (let cx = 0; cx < gw; cx++) {
      const v = cells[cy * gw + cx];
      const col = v === 0 ? [20,23,28] : v === 255 ? [71,77,87] : ZONE_PALETTE[(v - 1) % ZONE_PALETTE.length];
      const iy = gh - 1 - cy;
      for (let sy = 0; sy < scale; sy++) for (let sx = 0; sx < scale; sx++) {
        const px = ((iy * scale + sy) * W + (cx * scale + sx)) * 3; rgb[px] = col[0]; rgb[px + 1] = col[1]; rgb[px + 2] = col[2];
      }
    }
    image = `map_${safe(a.id)}.png`; writePng(path.join(IMG, image), W, H, rgb); imagesWritten++;
  }
  return { id: a.id, name: a.id, image, gridWidth: gw, gridHeight: gh, dataVersion: num(t, "dataVersion"), walkableCells: walkable, blockedCells: blocked };
});

enemies.sort((a, b) => a.minLevel - b.minLevel);
bosses.sort((a, b) => a.level - b.level);
const root = {
  generatedAt: new Date().toISOString().replace(/\.\d+Z$/, "Z"), game: "Infinite Loot-Loop",
  counts: { enemies: enemies.length, bosses: bosses.length, items: items.length, maps: maps.length, zones: zones.length, characters: characters.length, achievements: achievements.length },
  enemies, bosses, items, maps, zones, characters, achievements
};
fs.writeFileSync(path.join(DATA, "data.json"), JSON.stringify(root, null, 2));
console.log("Wrote data.json", root.counts, "images:", imagesWritten);
