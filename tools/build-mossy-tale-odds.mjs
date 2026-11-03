// Builds mossy-tale-odds.html: the public odds page for Mossy Tale's chance-based (random) items, in English and Korean.
// Owner Q4831 (2026-11-01): Korea's Game Industry Promotion Act (from 2024-03-22) asks for the odds of paid random items in the game,
// on the game's website and a "contains random items" notice in advertising. Every number here comes from the game's own server
// files, so the page cannot drift from what the game rolls:
//   ../Infinite-Growth-RPG/Backend/src/box-catalog.json + boxes.mjs  (Festival Box prizes, grade rates, pity, 10-roll floor)
//   ../Infinite-Growth-RPG/Backend/src/odds-history.json               (newest Rune Stone odds record: grade-up chances, every line)
//   ../Infinite-Growth-RPG/Assets/Code/Core/Glyphs.cs                  (Glyph success chances, Mending, which Glyph drops and where; Q5051)
//   ../Infinite-Growth-RPG/Backend/src/glyphs.mjs                      (the server's Glyph rates and kinds, checked against Glyphs.cs)
// Q5051 (owner 2026-11-03): every chance is shown with exactly four decimals (10.0000%); a chance above zero that would read 0.0000% keeps its
// significant digits, as in the game (RuneOddsText.Percent).
// Usage (site root): node tools/build-mossy-tale-odds.mjs [path to the game repo]   -> writes mossy-tale-odds.html
// Re-run whenever the box season or the rune odds change (the game's odds-history test forces a new record then).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const site = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const game = path.resolve(process.argv[2] || path.join(site, "..", "Infinite-Growth-RPG"));
const src = path.join(game, "Backend", "src");
const { BOX_CATALOG: catalog, gradeRates, itemRates, PITY_LIMIT } = await import(pathToFileURL(path.join(src, "boxes.mjs")).href);
const history = JSON.parse(fs.readFileSync(path.join(src, "odds-history.json"), "utf8"));
const rune = history.entries.filter(e => e.kind === "rune").at(-1);
const boxRecord = history.entries.filter(e => e.kind === "box").at(-1);

const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const pct = v => {
  const p = v * 100, text = p.toFixed(4);
  return (p > 0 && text === "0.0000" ? p.toFixed(12).replace(/0+$/, "") : text) + "%";
};
// Display names follow the game (legal-fix Q4831: "Damage Skin" is shown as "Hit Numbers").
const shown = s => String(s).replace(/Damage Skin/g, "Hit Numbers").replace(/대미지 스킨/g, "타격 숫자");
const BOX_GRADES = [["Common", "일반"], ["Rare", "레어"], ["Epic", "에픽"], ["Legendary", "전설"]];
const AWAKEN = { 1: ["Rare", "레어"], 2: ["Epic", "에픽"], 3: ["Unique", "유니크"], 4: ["Legendary", "레전드리"] };
const RUNES = { Ember: ["Ember Rune (lutti)", "엠버 룬 (lutti)", "Re-awakens all 3 lines.", "3줄을 모두 다시 각성합니다."],
  Void: ["Void Rune (lutti)", "보이드 룬 (lutti)", "Re-awakens all 3 lines; you keep either the old or the new lines.", "3줄을 다시 각성하고, 이전 줄과 새 줄 중 하나를 고릅니다."],
  Moon: ["Moon Rune (lutti)", "문 룬 (lutti)", "Re-awakens the Bonus set (3 lines).", "보너스 각성(3줄)을 다시 각성합니다."],
  Crude: ["Crude Rune (Stone, earned in play)", "크루드 룬 (스톤, 게임 플레이로 획득)", "Re-awakens all 3 lines, up to Unique.", "3줄을 모두 다시 각성합니다 (최고 유니크)."] };
const SLOTS = { Weapon: ["Weapon", "무기"], Helmet: ["Helmet", "투구"], Armor: ["Armor", "갑옷"], Gloves: ["Gloves", "장갑"], Shoes: ["Shoes", "신발"],
  Cape: ["Cape", "망토"], Ring1: ["Ring 1", "반지 1"], Ring2: ["Ring 2", "반지 2"], Necklace: ["Necklace", "목걸이"], FaceAccessory: ["Face", "얼굴 장식"] };
const STATS = { atkPct: ["ATK", "공격력"], atkSpeed: ["Attack speed", "공격 속도"], basicDmg: ["Basic damage", "기본 공격 피해"], monsterDmg: ["Monster dmg", "몬스터 피해"],
  skillDmg: ["Skill damage", "스킬 피해"], atkFlat: ["ATK (flat)", "공격력 (고정)"], bossDmg: ["Boss damage", "보스 피해"], pierce: ["Ignore DEF", "방어율 무시"],
  stunOnHit: ["On hit: stun 1s", "공격 시 1초 기절"], hpFlat: ["HP (flat)", "HP (고정)"], defFlat: ["DEF (flat)", "방어력 (고정)"], mpFlat: ["MP (flat)", "MP (고정)"],
  maxMp: ["Max MP", "최대 MP"], hpRegen: ["HP regen", "HP 회복"], mpRegen: ["MP regen", "MP 회복"], hpPct: ["HP", "HP"], defPctMain: ["DEF", "방어력"],
  tenacity: ["Tenacity", "강인함"], antidote: ["Antidote", "해독"], ward: ["Ward", "결계"], mpCost: ["MP cost -", "MP 소모 감소"], cooldown: ["Cooldown -", "재사용 대기 감소"],
  invulnAfterHit: ["Protection after hit", "피격 후 보호"], cooldownSec: ["Cooldown (seconds) -", "쿨타임 감소"], dmgReduction: ["Dmg taken -", "받는 피해 감소"],
  guardChance: ["Block 40% on hit", "피격 시 40% 방어"], agi: ["AGI", "AGI"], critChance: ["Crit chance", "치명타 확률"], healOnAttack: ["On hit: heal 2% HP", "공격 시 HP 2% 회복"],
  critDmg: ["Crit damage", "치명타 피해"], moveSpeed: ["Move speed", "이동 속도"], dodge: ["Dodge", "회피"], lukFlat: ["LUK", "LUK"],
  atkPerLevel: ["ATK / 10 levels (max 200)", "10레벨당 공격력 (최대 200)"], hpPerLevel: ["HP / 10 levels (max 200)", "10레벨당 HP (최대 200)"],
  gpGain: ["GP gain", "GP 획득"], dropRate: ["Drop rate", "드롭률"], allPct: ["ATK/HP/DEF", "공격력/HP/방어력"],
  // Q4968 / Q4976 lines (the game's names: stat.str / stat.dex / stat.int, GearSecondText "accuracy")
  str: ["STR", "힘"], dex: ["DEX", "재주"], int: ["INT", "지능"], accuracy: ["Accuracy", "명중치"] };
const stat = id => STATS[id] || [id, id];

// ---- Festival Box
const box = "STYLE";
const items = catalog.items.filter(i => i.boxId === box);
const base = itemRates(box, { sinceLegendary: 0, featuredGuaranteed: false }, false, catalog);
const floor = itemRates(box, { sinceLegendary: 0, featuredGuaranteed: false }, true, catalog);
const grades = gradeRates(box, 0), floorGrades = gradeRates(box, 0, true);
const prizeRows = items.slice().sort((a, b) => b.grade - a.grade).map(i => {
  const p = base.find(r => r.itemId === i.id)?.probability ?? 0, f = floor.find(r => r.itemId === i.id)?.probability ?? 0;
  return `<tr><td>${esc(shown(i.nameEn))}<br><span class="ko">${esc(shown(i.nameKo))}</span></td><td>${BOX_GRADES[i.grade][0]}<br><span class="ko">${BOX_GRADES[i.grade][1]}</span></td><td>${pct(p)}</td><td>${pct(f)}</td></tr>`;
}).join("\n");
const gradeRows = BOX_GRADES.map((g, i) => `<tr><td>${g[0]} <span class="ko">${g[1]}</span></td><td>${items.filter(x => x.grade === i).length}</td><td>${pct(grades[i])}</td><td>${pct(floorGrades[i])}</td></tr>`).join("\n");
const ex = catalog.exchange;

// ---- Rune Stones
const runeUp = rune.odds.runes.map(r => {
  const [en, ko, aboutEn, aboutKo] = RUNES[r.rune] || [r.rune, r.rune, "", ""];
  const steps = r.gradeUp.filter(s => s.from < r.highestGrade).map(s =>
    `<tr><td>${AWAKEN[s.from][0]} → ${AWAKEN[s.from + 1][0]}<br><span class="ko">${AWAKEN[s.from][1]} → ${AWAKEN[s.from + 1][1]}</span></td><td>${pct(s.chance)}</td><td>${s.guaranteedAfter > 0 ? `${s.guaranteedAfter} uses / ${s.guaranteedAfter}회` : "- (none / 없음)"}</td></tr>`).join("\n");
  return `<h3>${esc(en)} <span class="ko">/ ${esc(ko)}</span></h3><p>${esc(aboutEn)}<br><span class="ko">${esc(aboutKo)}</span></p>
<table><thead><tr><th>Grade-up / 등급 상승</th><th>Chance / 확률</th><th>Guaranteed after / 확정</th></tr></thead><tbody>
${steps}
</tbody></table>`;
}).join("\n");
const same = pct(rune.odds.sameGradeLineChance);
const lineTables = Object.keys(SLOTS).map(slot => {
  const blocks = [false, true].map(bonus => [1, 2, 3, 4].map(g => {
    const t = rune.odds.lines.find(l => l.slot === slot && l.bonus === bonus && l.grade === g);
    if (!t) return "";
    const rows = t.chances.map(([id, first, other]) => `<tr><td>${esc(stat(id)[0])} <span class="ko">${esc(stat(id)[1])}</span></td><td>${pct(first)}</td><td>${pct(other)}</td></tr>`).join("");
    return `<h4>${bonus ? "Bonus set (Moon Rune) / 보너스 (문 룬)" : "Main lines / 기본 줄"} - ${AWAKEN[g][0]} item / ${AWAKEN[g][1]} 아이템</h4>
<table><thead><tr><th>Stat / 능력치</th><th>Line 1 / 1번째 줄</th><th>Each of lines 2-3 / 2·3번째 줄 각각</th></tr></thead><tbody>${rows}</tbody></table>`;
  }).join("\n")).join("\n");
  return `<details><summary>${SLOTS[slot][0]} / ${SLOTS[slot][1]}</summary>\n${blocks}\n</details>`;
}).join("\n");

// ---- Glyphs (Q5051): read from the game's own rules file, Glyphs.cs. Every pattern must match exactly once, or the build stops
// (a changed file means this reader needs a look, never a silent guess). The server's glyphs.mjs must agree on rates and kinds.
const glyphFile = fs.readFileSync(path.join(game, "Assets", "Code", "Core", "Glyphs.cs"), "utf8");
const one = (re, what) => { const all = [...glyphFile.matchAll(new RegExp(re.source, "g"))];
  if (all.length !== 1) throw new Error(`Glyphs.cs: expected one ${what}, found ${all.length}`); return all[0]; };
const glyphRates = one(/static readonly int\[\] Rates=\{([\d,\s]+)\};/, "Rates")[1].split(",").map(Number);
const mendLine = one(/MendMax=(\d+), MendRatePercent=(\d+);/, "MendMax / MendRatePercent");
const mendMax = Number(mendLine[1]), mendRate = Number(mendLine[2]) / 100;
const tableBlock = one(/static readonly \(string slot,string stat,GlyphGain\[\] gains\)\[\] Table=\s*\{([\s\S]*?)\n\s*\};/, "gains table")[1];
const glyphKinds = [...tableBlock.matchAll(/\("(\w+)","(\w+)",new\[\]\{/g)].map(m => ({ slot: m[1], stat: m[2] }));
const monster = one(/MonsterChance=(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?), EliteChance=MonsterChance\*(\d+(?:\.\d+)?);/, "MonsterChance / EliteChance");
const named = { MonsterChance: Number(monster[1]) / Number(monster[2]) }; named.EliteChance = named.MonsterChance * Number(monster[3]);
const sources = [...glyphFile.matchAll(/case GlyphSource\.(\w+):return \(([\w.]+),(\d+),new\[\]\{([\d.,]+)\},([\d.]+)\);/g)].map(m => ({
  id: m[1], chance: m[2] in named ? named[m[2]] : Number(m[2]), count: Number(m[3]), mix: m[4].split(",").map(n => Number(n) / 100), mend: Number(m[5]) }));
const sourceEnum = one(/public enum GlyphSource \{([^}]*)\}/, "GlyphSource")[1].split(",").map(x => x.trim());
const kindBands = [...glyphFile.matchAll(/if\(u<(\.\d+)\)return "(\w+)";/g)].map(m => ({ upTo: Number(m[1]), key: m[2] }));
const others = one(/var others=new\[\]\{([^}]*)\};/, "RandomKind slots")[1].split(",").map(x => x.trim().replace(/"/g, ""));
if (kindBands.length !== 2 || sources.length !== sourceEnum.length || sources.some((x, i) => x.id !== sourceEnum[i]) || sources.some(x => Number.isNaN(x.chance)
  || Math.abs(x.mix.reduce((a, b) => a + b, 0) - 1) > 1e-9) || !glyphKinds.length || !(mendRate > 0) || glyphRates.join() !== "100,60,10")
  throw new Error("Glyphs.cs: the Glyph rules changed shape; update this reader");
{
  const { GLYPH_RATES, GLYPH_SLOTS } = await import(pathToFileURL(path.join(src, "glyphs.mjs")).href);
  const serverKinds = Object.entries(GLYPH_SLOTS).flatMap(([slot, stats]) => stats.map(stat => slot + "_" + stat)).sort().join();
  if (GLYPH_RATES.join() !== glyphRates.join() || serverKinds !== glyphKinds.map(k => k.slot + "_" + k.stat).sort().join())
    throw new Error("Glyphs.cs and Backend/src/glyphs.mjs disagree on Glyph rates or kinds");
}
// Which Glyph a drop is (GlyphDrops.RandomKind): the first kinds by their bands; the other slots share the rest evenly; a slot with several kinds splits its share.
const kindChance = new Map();
{
  let from = 0;
  for (const b of kindBands) { kindChance.set(b.key, b.upTo - from); from = b.upTo; }
  for (const slot of others) { const ks = glyphKinds.filter(k => k.slot === slot); if (!ks.length) throw new Error("Glyphs.cs: no kinds for " + slot);
    for (const k of ks) kindChance.set(k.slot + "_" + k.stat, (1 - from) / others.length / ks.length); }
  if (glyphKinds.some(k => !kindChance.has(k.slot + "_" + k.stat)) || Math.abs([...kindChance.values()].reduce((a, b) => a + b, 0) - 1) > 1e-9)
    throw new Error("Glyphs.cs: Glyph kind chances do not cover every kind");
}
const GLYPH_SLOTS_SHOWN = { WEAPON: ["Weapon", "무기"], GLOVES: ["Gloves", "장갑"], HELMET: ["Helmet", "투구"], ARMOR: ["Armor", "갑옷"], CAPE: ["Cape", "망토"],
  SHOES: ["Shoes", "신발"], RING: ["Ring", "반지"], NECKLACE: ["Necklace", "목걸이"], FACE: ["Face", "얼굴"] };
const GLYPH_STATS_SHOWN = Object.fromEntries(["ATK", "DEF", "HP", "MP", "AGI", "LUK", "DEX", "INT"].map(k => [k, [k, k]]));   // as the game names Glyphs in every language (GlyphText.Stat)
const SOURCES_SHOWN = { Monster: ["Monster (journeys and hunting grounds), each defeat", "몬스터 (여정·사냥터), 처치마다"], Elite: ["Elite monster, each defeat", "엘리트 몬스터, 처치마다"],
  JourneyBoss: ["Journey boss, each defeat", "여정 보스, 처치마다"], FieldBossHourly: ["Field boss (hourly), each defeat", "필드 보스 (매시), 처치마다"],
  FieldBoss3h: ["Field boss (every 3 hours), each defeat", "필드 보스 (3시간마다), 처치마다"], FieldBossDaily: ["Field boss (daily), each defeat", "필드 보스 (매일), 처치마다"],
  PqNormal: ["Party quest Normal, each clear reward", "파티 퀘스트 노멀, 클리어 보상마다"], PqHard: ["Party quest Hard, each clear reward", "파티 퀘스트 하드, 클리어 보상마다"],
  PqInsane: ["Party quest Insane, each clear reward", "파티 퀘스트 인세인, 클리어 보상마다"], WeeklyQuest: ["Weekly town quest (also gives a 60% Glyph of your pick)", "마을 주간 퀘스트 (60% 선택 문양도 지급)"] };
for (const x of sources) if (!SOURCES_SHOWN[x.id]) throw new Error("No label for Glyph source " + x.id);
const kindName = k => [`${GLYPH_SLOTS_SHOWN[k.slot][0]} Glyph: ${GLYPH_STATS_SHOWN[k.stat][0]}`, `${GLYPH_SLOTS_SHOWN[k.slot][1]} 문양: ${GLYPH_STATS_SHOWN[k.stat][1]}`];
const glyphSuccessRows = glyphRates.map(r => `<tr><td>${r}% Glyph<br><span class="ko">${r}% 문양</span></td><td>${pct(r / 100)}</td><td>${pct(1 - r / 100)}</td></tr>`).join("\n")
  + `\n<tr><td>Mending Glyph<br><span class="ko">복원 문양</span></td><td>${pct(mendRate)}</td><td>${pct(1 - mendRate)}</td></tr>`;
const glyphSourceRows = sources.map(x => `<tr><td>${esc(SOURCES_SHOWN[x.id][0])}<br><span class="ko">${esc(SOURCES_SHOWN[x.id][1])}</span></td><td>${x.count > 0 ? pct(x.chance) + (x.count > 1 ? ` (x${x.count})` : "") : "-"}</td>`
  + x.mix.map(m => `<td>${x.count > 0 ? pct(m) : "-"}</td>`).join("") + `<td>${pct(x.mend)}</td></tr>`).join("\n");
const glyphKindRows = glyphKinds.map(k => { const [en, ko] = kindName(k); return `<tr><td>${esc(en)}<br><span class="ko">${esc(ko)}</span></td><td>${pct(kindChance.get(k.slot + "_" + k.stat))}</td></tr>`; }).join("\n");

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="index,follow">
<link rel="canonical" href="https://tonyworks.co.kr/mossy-tale-odds.html">
<link rel="icon" href="/apps/infinite-loot-loop/assets/img/app_icon.png">
<title>Mossy Tale - Random item odds / 모시 테일 확률형 아이템 확률 정보</title>
<style>
  *, *::before, *::after { box-sizing: border-box; }
  body { font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif;
         line-height: 1.55; color: #1a1a1a; max-width: 860px; margin: 0 auto; padding: 24px; overflow-wrap: anywhere; }
  h1 { font-size: 1.6rem; } h2 { font-size: 1.25rem; margin-top: 2rem; } h3 { margin-top: 1.4rem; } h4 { margin: 1rem 0 .3rem; font-size: .95rem; }
  a { color: #1558d6; } .muted { color: #666; font-size: .9rem; } .ko { color: #444; }
  .notice { padding: 12px 14px; border: 1px solid #e3c36b; border-radius: 10px; background: #fff8e1; }
  table { border-collapse: collapse; width: 100%; margin: .4rem 0 1rem; font-size: .92rem; }
  th, td { border: 1px solid #ddd; padding: 5px 8px; text-align: left; vertical-align: top; } th { background: #f4f4f4; }
  td:nth-child(n+2) { white-space: nowrap; } details { margin: .4rem 0; } summary { cursor: pointer; font-weight: 600; }
</style>
</head>
<body>
<h1>Mossy Tale - random item odds<br><span class="ko">모시 테일 - 확률형 아이템 확률 정보</span></h1>
<p class="muted">Generated from the game server's odds files on ${new Date().toISOString().slice(0, 10)}. Festival Box odds in effect since ${esc(catalog.oddsChangedAt)} (catalog ${esc(catalog.revision)}${boxRecord ? ", record " + esc(boxRecord.digest.slice(0, 12)) : ""}); Rune Stone odds in effect since ${esc(rune.effectiveFrom)} (record ${esc(rune.digest.slice(0, 12))}).</p>
<div class="notice">
<p><strong>Mossy Tale contains random (chance-based) items</strong>: the Festival Box and Rune Stones. Buying one does not mean you will get a specific item. The same odds are shown in the game before you buy (Store &rarr; Boxes &rarr; Rates, and Store &rarr; Runes &rarr; All odds). When odds change, the game and this page show the new date, and the server keeps the earlier odds for at least 180 days.</p>
<p class="ko"><strong>확률형 아이템 포함</strong>: 모시 테일에는 축제 상자와 룬 스톤이라는 확률형 아이템이 있습니다. 구매하더라도 특정 아이템을 얻는다는 뜻은 아닙니다. 같은 확률이 구매 전에 게임 안(상점 &rarr; 상자 &rarr; 확률, 상점 &rarr; 룬 &rarr; 전체 확률)에도 표시됩니다. 확률이 바뀌면 게임과 이 페이지에 변경일이 표시되며, 서버는 이전 확률을 180일 이상 보관합니다.</p>
</div>

<h2>Festival Box (season ${esc(catalog.seasonNumber)}) <span class="ko">/ 축제 상자 (시즌 ${esc(catalog.seasonNumber)})</span></h2>
<ul>
<li>Price: ${esc(catalog.singlePrice)} lutti for 1 roll, ${esc(catalog.tenPrice)} lutti for 10 rolls. Sold until ${esc(catalog.seasonLastDay)} (server day; it closes on the next day at 09:00 KST).<br><span class="ko">가격: 1회 ${esc(catalog.singlePrice)} lutti, 10회 ${esc(catalog.tenPrice)} lutti. ${esc(catalog.seasonLastDay)}(서버 기준일)까지 판매하며 다음 날 오전 9시(KST)에 종료됩니다.</span></li>
<li>Legendary is guaranteed on roll ${PITY_LIMIT} if none of the previous ${PITY_LIMIT - 1} rolls gave one (the count carries over to the next season). There is no other pity.<br><span class="ko">직전 ${PITY_LIMIT - 1}회 동안 전설이 나오지 않으면 ${PITY_LIMIT}회째에 전설이 확정됩니다(횟수는 다음 시즌으로 이월). 그 외의 천장은 없습니다.</span></li>
<li>A 10-roll gives at least one Epic or better: if the first 9 rolls of a 10-roll gave no Epic or Legendary, the 10th roll uses the "10th roll" column below.<br><span class="ko">10회 뽑기는 에픽 이상 1개를 보장합니다. 10회 뽑기의 처음 9회에서 에픽·전설이 없으면 10번째는 아래 "10번째" 열의 확률을 씁니다.</span></li>
<li>A prize you already own gives Festival Points instead (${ex.duplicatePoints.map((p, i) => BOX_GRADES[i][0] + " " + p).join(", ")}). Points buy any prize of the season in the Exchange (${ex.prices.map((p, i) => BOX_GRADES[i][0] + " " + p).join(", ")} points) or ${ex.gpPerPoint} GP per point.<br><span class="ko">이미 가진 상품은 축제 포인트로 바뀝니다(${ex.duplicatePoints.map((p, i) => BOX_GRADES[i][1] + " " + p).join(", ")}). 포인트로 교환소에서 이번 시즌 상품(${ex.prices.map((p, i) => BOX_GRADES[i][1] + " " + p).join(", ")} 포인트)이나 포인트당 GP ${ex.gpPerPoint}를 얻을 수 있습니다.</span></li>
</ul>
<table><thead><tr><th>Grade / 등급</th><th>Prizes / 상품 수</th><th>Each roll / 1회</th><th>10th roll without Epic / 에픽 없는 10번째</th></tr></thead><tbody>
${gradeRows}
</tbody></table>
<p>Every prize (each prize of a grade is equally likely) / 전체 상품 (같은 등급의 상품은 확률이 같습니다):</p>
<table><thead><tr><th>Prize / 상품</th><th>Grade / 등급</th><th>Each roll / 1회</th><th>10th roll without Epic / 에픽 없는 10번째</th></tr></thead><tbody>
${prizeRows}
</tbody></table>

<h2>Rune Stones <span class="ko">/ 룬 스톤</span></h2>
<p>A rune re-awakens an item: it rolls new lines and may raise the item's awakening grade. Line 1 is always at the item's grade; lines 2 and 3 are at the item's grade ${same} of the time, otherwise one grade lower (Rare at least). Each line is drawn separately, so a stat can appear on more than one line. Lutti runes are not sold on the Belgian and Brazilian storefronts.<br>
<span class="ko">룬은 아이템을 다시 각성시켜 새 줄을 뽑고, 각성 등급이 오를 수 있습니다. 1번째 줄은 항상 아이템 등급이며, 2·3번째 줄은 ${same} 확률로 아이템 등급, 그 외에는 한 등급 아래(최소 레어)입니다. 각 줄은 따로 뽑히므로 같은 능력치가 여러 줄에 나올 수 있습니다.</span></p>
${runeUp}
<h3>Line odds by slot and item grade <span class="ko">/ 부위·아이템 등급별 줄 확률</span></h3>
${lineTables}

<h2>Glyphs <span class="ko">/ 문양</span></h2>
<p>Glyphs upgrade a permanent item. They are earned in play, and the Glyph shop sells 100% Glyphs for Stone; they are not sold for lutti. Each use takes one upgrade slot whether it succeeds or fails, and the item is never destroyed. A Mending Glyph gives back one failed slot (at most ${mendMax} per item); a failed Mending Glyph only uses the Glyph.<br>
<span class="ko">문양은 영구 장비를 강화합니다. 게임 플레이로 얻으며, 문양 상점은 100% 문양만 스톤으로 판매합니다(lutti로는 판매하지 않습니다). 성공·실패와 관계없이 사용할 때마다 강화 슬롯 1개를 쓰며, 아이템이 파괴되지는 않습니다. 복원 문양은 실패한 슬롯 1개를 되돌립니다(아이템당 최대 ${mendMax}회). 복원 문양이 실패하면 문양만 소모됩니다.</span></p>
<table><thead><tr><th>Glyph / 문양</th><th>Success / 성공</th><th>Fail / 실패</th></tr></thead><tbody>
${glyphSuccessRows}
</tbody></table>
<h3>Where Glyphs drop <span class="ko">/ 문양 획득처</span></h3>
<table><thead><tr><th>Source / 획득처</th><th>Glyph / 문양</th><th>100%</th><th>60%</th><th>10%</th><th>Mending Glyph / 복원 문양</th></tr></thead><tbody>
${glyphSourceRows}
</tbody></table>
<p class="muted">The 100% / 60% / 10% columns are the chance of each Glyph's rate when one drops. A Mending Glyph is rolled separately.<br><span class="ko">100% / 60% / 10% 열은 문양이 나왔을 때 그 성공률일 확률입니다. 복원 문양은 따로 판정합니다.</span></p>
<h3>Which Glyph drops <span class="ko">/ 나오는 문양 종류</span></h3>
<table><thead><tr><th>Glyph / 문양</th><th>Chance / 확률</th></tr></thead><tbody>
${glyphKindRows}
</tbody></table>

<p class="muted">Tony Works &middot; <a href="terms.html#mossy-tale">Terms</a> &middot; <a href="privacy-policy.html#mossy-tale">Privacy Policy</a> &middot; <a href="contact.html">Contact</a> &middot; tonyzorz@naver.com</p>
</body>
</html>
`;
fs.writeFileSync(path.join(site, "mossy-tale-odds.html"), html);
console.log("wrote mossy-tale-odds.html", html.length, "chars;", items.length, "box prizes;", rune.odds.lines.length, "line tables");
