import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// ItemData's effect fields, including Null Hits (consumed by PlayerStats even
// though the game's AppendSpecialEffectStrings currently omits that line).
export const ITEM_EFFECT_FIELDS = [
  "bonusHP", "bonusATK", "bonusDEF", "bonusAGI", "bonusLUC",
  "bonusHPPercent", "bonusATKPercent", "bonusDEFPercent", "bonusAGIPercent", "bonusLUCPercent",
  "lifestealPct", "gaugeSlowPct", "encounterFreeGaugePct", "burnResistPct", "burnResistIsStress",
  "slowHealTurns", "bonusMoveSpdPct", "bonusGoldPct", "shopDiscountPct", "effectAlwaysOn", "bonusExpPct",
  "hasHPAbsorb", "hpAbsorbPercent", "hasAutoRevive", "hasBPBonus", "bpBonus",
  "bonusCritChancePct", "bonusDodgeChancePct", "bonusShieldStacks", "bonusGuardTierChance",
  "bonusReflectTierChance", "nullHitCharges", "affinityType", "affinityShred",
  "affinityDodgeMultiplier", "affinityPierceFactor", "affinityWeakenFactor"
];

const SUFFIXES = ["", "K", "M", "B", "T", "Q", "Qi", "Sx", "Sp", "Oc", "No", "Dc",
  "Ud", "Dd", "Td", "Qad", "Qid", "Sxd", "Spd", "Od", "Nd", "Vg",
  "Uvg", "Dvg", "Tvg", "Qavg", "Qivg", "Sxvg", "Spvg", "Ovg", "Nvg", "Tg"];

// Mirrors Core/NumberFormat.Abbreviate: floor rather than round across a tier.
export function effectNumber(n) {
  const v = Math.abs(Number(n) || 0);
  let s = String(Math.floor(v));
  if (v >= 1000) {
    let tier = Math.floor(Math.log10(v) / 3);
    if (tier >= SUFFIXES.length) s = v.toExponential(2).replace(/\.0+(?=e)/, "");
    else {
      let scale = Math.pow(1000, tier);
      if (v / scale < 1 && tier > 0) { tier--; scale /= 1000; }
      else if (v / scale >= 1000 && tier + 1 < SUFFIXES.length) { tier++; scale *= 1000; }
      s = String(Math.floor(v / scale * 10) / 10) + SUFFIXES[tier];
    }
  }
  return (n < 0 ? "-" : "") + s;
}

export function itemEffects(text, publishedStats) {
  const values = Object.fromEntries(ITEM_EFFECT_FIELDS.map(key => {
    const match = text.match(new RegExp("^  " + key + ":\\s*([^\\r\\n]+)", "m"));
    const value = match ? Number(match[1]) : 0;
    if (!Number.isFinite(value)) throw new Error("Invalid item effect: " + key);
    return [key, value];
  }));
  const fixed = (value, digits = 1) => String(Number(value.toFixed(digits)));
  const specialEffects = [];
  for (const stat of ["HP", "ATK", "DEF", "AGI", "LUC"]) {
    const value = values["bonus" + stat + "Percent"];
    if (value > 0) specialEffects.push(stat + " +" + Math.round(value) + "%");
  }
  const pct = (key, label, sign = "", digits = 1, note = "") => {
    if (values[key] > 0) specialEffects.push(label + " " + sign + fixed(values[key] * 100, digits) + "%" + note);
  };
  pct("lifestealPct", "Lifesteal", "", 1, " (does not stack)");
  pct("gaugeSlowPct", "Gauge Slow");
  pct("encounterFreeGaugePct", "Encounter-free gauge");
  pct("burnResistPct", values.burnResistIsStress ? "Stress Resist" : "Burn Resist", "", 2);
  if (values.slowHealTurns > 0) specialEffects.push("Slow Heal +" + values.slowHealTurns);
  pct("bonusMoveSpdPct", "Move Spd", "+");
  pct("bonusGoldPct", "Gold", "+");
  pct("shopDiscountPct", "Shop prices", "-");
  if (values.effectAlwaysOn) specialEffects.push("Effect works without equipping, once found");
  pct("bonusExpPct", "EXP", "+");
  if (values.hasHPAbsorb) specialEffects.push("Absorb " + effectNumber(values.hpAbsorbPercent) + "%");
  if (values.hasAutoRevive) specialEffects.push("Auto Revive");
  if (values.hasBPBonus) specialEffects.push("AP +" + effectNumber(values.bpBonus));
  pct("bonusCritChancePct", "Crit Chance", "+");
  pct("bonusDodgeChancePct", "Dodge", "+");
  if (values.bonusShieldStacks > 0) specialEffects.push("Shield Layers +" + values.bonusShieldStacks);
  pct("bonusGuardTierChance", "Guard Tier", "+");
  pct("bonusReflectTierChance", "Reflect Tier", "+");
  if (values.nullHitCharges > 0) specialEffects.push("Null Hits +" + values.nullHitCharges);
  if (values.affinityType) {
    const region = {1:"Stone", 2:"Egypt", 3:"The Temple", 4:"The Temple"}[values.affinityType];
    if (!region) throw new Error("Unknown item affinity type: " + values.affinityType);
    const reduction = value => value > 0 && value < 1 ? fixed((1 - value) * 100, 0) : "0";
    if (values.affinityShred > 1 || (values.affinityWeakenFactor > 0 && values.affinityWeakenFactor < 1)) {
      specialEffects.push(region + " monsters: their crit & combo resistance ÷" + fixed(Math.max(1, values.affinityShred)) +
        ", they sap " + reduction(values.affinityWeakenFactor) + "% less of your ATK. No effect elsewhere.");
    }
    if (values.affinityDodgeMultiplier > 1 || (values.affinityPierceFactor > 0 && values.affinityPierceFactor < 1)) {
      specialEffects.push(region + " monsters: you dodge ×" + fixed(Math.max(1, values.affinityDodgeMultiplier)) +
        " as often, they pierce " + reduction(values.affinityPierceFactor) + "% less of your DEF. No effect elsewhere.");
    }
  }
  const stats = publishedStats || values;
  const flatEffects = ["HP", "ATK", "DEF", "AGI", "LUC"].filter(stat => stats["bonus" + stat])
    .map(stat => stat + " +" + effectNumber(stats["bonus" + stat]));
  return { effects: flatEffects.concat(specialEffects), specialEffects };
}

export function itemAssetFiles(game) {
  const root = path.join(game, "Assets/ScriptableObjects/Items");
  return new Map(fs.readdirSync(root, { recursive: true }).filter(file => file.endsWith(".asset"))
    .map(file => [path.basename(file, ".asset"), path.join(root, file)]));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const site = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const files = itemAssetFiles(path.resolve(site, "../Infinite Loot-Loop"));
  const file = path.join(site, "apps/infinite-loot-loop/data/data.json");
  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  let changed = 0;
  // Only refresh effects of already-published items; never add private content
  // or pull unrelated current game balance changes into this display fix.
  for (const item of data.items) {
    if (!files.has(item.id)) throw new Error("Missing published item source: " + item.id);
    const effects = itemEffects(fs.readFileSync(files.get(item.id), "utf8"), item);
    if (JSON.stringify(effects.effects) !== JSON.stringify(item.effects)) changed++;
    Object.assign(item, effects);
  }
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
  console.log(`Refreshed all ${data.items.length} published items; corrected ${changed} effect lists.`);
}
