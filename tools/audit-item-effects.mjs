import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { ITEM_EFFECT_FIELDS, itemEffects, itemAssetFiles } from "./item-effects.mjs";

const site = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const game = path.resolve(site, "../Infinite Loot-Loop");
const data = JSON.parse(fs.readFileSync(path.join(site, "apps/infinite-loot-loop/data/data.json"), "utf8"));
const itemData = fs.readFileSync(path.join(game, "Assets/Scripts/Items/ItemData.cs"), "utf8");
const effectDeclarations = itemData.slice(0, itemData.indexOf('[Header("Upgrade System")]'));
for (const match of effectDeclarations.matchAll(/public\s+(?:float|double|int|bool|MonsterResists\.MonsterType)\s+(\w+)\s*=/g)) {
  if (match[1] === "isUnique") continue;
  assert(ITEM_EFFECT_FIELDS.includes(match[1]), "New game effect needs an exporter: " + match[1]);
}

const yaml = values => Object.entries(values).map(([key, value]) => "  " + key + ": " + value).join("\n");
assert.deepEqual(itemEffects(yaml({
  bonusHP: 1234, bonusHPPercent: 10, lifestealPct: 0.03, gaugeSlowPct: 0.2,
  encounterFreeGaugePct: 0.25, burnResistPct: 0.083333336, slowHealTurns: 2,
  bonusMoveSpdPct: 0.3, bonusGoldPct: 0.3, shopDiscountPct: 0.1, effectAlwaysOn: 1,
  bonusExpPct: 0.15, hasHPAbsorb: 1, hpAbsorbPercent: 10, hasAutoRevive: 1,
  hasBPBonus: 1, bpBonus: 3, bonusCritChancePct: 0.03, bonusDodgeChancePct: 0.02,
  bonusShieldStacks: 4, bonusGuardTierChance: 0.5, bonusReflectTierChance: 0.1, nullHitCharges: 2
})).effects, [
  "HP +1.2K", "HP +10%", "Lifesteal 3% (does not stack)", "Gauge Slow 20%",
  "Encounter-free gauge 25%", "Burn Resist 8.33%", "Slow Heal +2", "Move Spd +30%",
  "Gold +30%", "Shop prices -10%", "Effect works without equipping, once found", "EXP +15%",
  "Absorb 10%", "Auto Revive", "AP +3", "Crit Chance +3%", "Dodge +2%", "Shield Layers +4",
  "Guard Tier +50%", "Reflect Tier +10%", "Null Hits +2"
], "All effect types, flags and percentage units render correctly");
assert.deepEqual(itemEffects(yaml({burnResistPct:0.16666667,burnResistIsStress:1})).effects,
  ["Stress Resist 16.67%"], "Stress gear must not claim Burn resistance");
assert.deepEqual(itemEffects(yaml({burnResistIsStress:1,hpAbsorbPercent:10,bpBonus:3})).effects,
  [], "Inactive flags do not grant effects");
assert.deepEqual(itemEffects(yaml({affinityType:1,affinityShred:8.2,affinityWeakenFactor:0.7})).effects,
  ["Stone monsters: their crit & combo resistance ÷8.2, they sap 30% less of your ATK. No effect elsewhere."]);
assert.deepEqual(itemEffects(yaml({affinityType:2,affinityDodgeMultiplier:2.5,affinityPierceFactor:0.606})).effects,
  ["Egypt monsters: you dodge ×2.5 as often, they pierce 39% less of your DEF. No effect elsewhere."]);

const files = itemAssetFiles(game);
for (const item of data.items) {
  assert(files.has(item.id), "Published item must have a game source");
  const expected = itemEffects(fs.readFileSync(files.get(item.id), "utf8"), item);
  assert.deepEqual(item.effects, expected.effects, item.id + " complete effects");
  assert.deepEqual(item.specialEffects, expected.specialEffects, item.id + " non-flat effects");
}
const required = {
  MU25_BossAccessory: ["HP +15%", "Burn Resist 8.33%", "Slow Heal +1", "Shield Layers +4"],
  MU25_BossRelic: ["Crit Chance +3%"],
  MH01_BossRelic_H: ["Guard Tier +50%"],
  MH02_BossRelic_H: ["Encounter-free gauge 25%"],
  MH04_BossRelic_H: ["Crit Chance +3%", "Null Hits +2"],
  MX03_BossRelic: ["Lifesteal 3% (does not stack)", "Stress Resist 16.67%"],
  CY03_BossRelic: ["Move Spd +30%", "Stress Resist 16.67%"],
  SM03_BossRelic: ["Gold +30%", "Slow Heal +2"]
};

// Exercise the actual catalog renderers so truncation cannot silently return.
const source = fs.readFileSync(path.join(site, "assets/js/app.js"), "utf8");
const itemsSource = source.slice(source.indexOf("  /* ---- Items ---- */"), source.indexOf("  /* ---- Shop ---- */"));
const escape = value => String(value).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
let catalog;
const context = {
  PAGES:{}, param:()=>null, itemList:d=>d.items, live:items=>items, listView:(app,d,cfg)=>{catalog=cfg;},
  catalogAreaFilters:()=>[], catalogCodes:()=>[], catalogRouteCompare:()=>()=>0, catalogNumeric:()=>()=>0,
  itemStatCompare:()=>()=>0, esc:escape, fmt:String, rarColor:()=>"gold", thumb:()=>"",
  itemPrimaryLabel:()=>"HP", itemPrimaryStat:item=>item.bonusHP
};
vm.runInNewContext(itemsSource, context);
context.PAGES.items({},data);
for (const [id, effects] of Object.entries(required)) {
  const item = data.items.find(item=>item.id===id);
  assert(item, "Missing public boss item: " + id);
  for (const effect of effects) assert(item.specialEffects.includes(effect), id + " missing " + effect);
  const card = catalog.card(item);
  const cell = catalog.columns.find(column=>column.label==="Effects").render(item);
  for (const effect of item.effects) assert(card.includes("<li>"+escape(effect)+"</li>"), id+" card hides "+effect);
  for (const effect of item.specialEffects) assert(cell.includes("<li>"+escape(effect)+"</li>"), id+" table hides "+effect);
}
console.log(`Item effects audit passed: all ${data.items.length} public items match the game, all effect fields covered, complete boss effects in cards and tables.`);
