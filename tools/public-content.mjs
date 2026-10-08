import fs from "node:fs";
import path from "node:path";

export function walkFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e =>
    e.isDirectory() ? walkFiles(path.join(dir, e.name)) : [path.join(dir, e.name)]);
}

// Publication is stricter than in-game discovery. Release switches must never reveal secrets.
// Derive exclusions from the authoring sources, without shipping a list of secret names or IDs.
export function publicationPolicy(game) {
  const so = path.join(game, "Assets/ScriptableObjects");
  const assets = walkFiles(so).filter(p => p.endsWith(".asset")).map(p => ({
    id: path.basename(p, ".asset"), file: p, text: fs.readFileSync(p, "utf8")
  }));
  const byGuid = new Map(assets.map(a => {
    const meta = fs.readFileSync(a.file + ".meta", "utf8");
    return [meta.match(/^guid:\s*(\w+)/m)?.[1], a.id];
  }));
  const privateIds = new Set();
  // The special arena and its entrance remain an in-game discovery.
  const atlas = fs.readFileSync(path.join(game, "Assets/Scripts/Core/MapsAtlas.cs"), "utf8");
  const arena = atlas.match(/const string VoidMapId\s*=\s*"([^"]+)"/)?.[1];
  if (!arena) throw new Error("Cannot read special arena ID; refusing export");
  const arenaPrefix = arena.replace(/_Map$/, "");
  const privateAchievements = new Set();
  const withheldMapArt = new Set();
  const secretSource = fs.readFileSync(path.join(game, "Assets/Scripts/Core/EasterEggs.cs"), "utf8");
  const members = secretSource.match(/string\[\] All\s*=\s*\{([\s\S]*?)\}/)?.[1];
  if (!members) throw new Error("Cannot read secret achievement registry; refusing export");
  for (const m of secretSource.matchAll(/const string (\w+)\s*=\s*"([^"]+)"/g)) {
    if (new RegExp("\\b" + m[1] + "\\b").test(members)) privateAchievements.add(m[2]);
  }
  const v7 = fs.readFileSync(path.join(game, "Assets/Scripts/Editor/V7ContentTable.cs"), "utf8");
  for (const m of v7.matchAll(/new SecretRow\s*\{\s*Map\s*=\s*"([^"]+)"/g)) withheldMapArt.add(m[1]);
  if (!withheldMapArt.size) throw new Error("Cannot read hidden map registry; refusing map art export");
  for (const a of assets) {
    if (a.id === arena || a.id.startsWith(arenaPrefix + "_")) privateIds.add(a.id);
    const secretBoss = /^  secretTwist:[ \t]*[^ \t\r\n]/m.test(a.text.replace(/\r/g, ""));
    if (/[/\\]Secrets[/\\]|_Hidden_/i.test(a.file) || /^  (?:isTrollItem|hiddenFromCollection): 1\s*$/m.test(a.text) || secretBoss) {
      privateIds.add(a.id);
    }
    if (secretBoss) {
      for (const m of a.text.matchAll(/^  (?:dropItem|hardModeDropItem|bonusDropItem|hardModeBonusDropItem|extraDropItem|keyDropItem):.*guid:\s*(\w+)/gm)) {
        if (byGuid.has(m[1])) privateIds.add(byGuid.get(m[1]));
      }
    }
    if (privateAchievements.has(a.id)) privateIds.add(a.id);
  }
  return { privateIds, privateAchievements, withheldMapArt, assets };
}

export function modesForMap(id) {
  if (/^MH\d/.test(id)) return ["hard"];
  if (/^(MX|CY|SM)\d/.test(id) || (/^MU\d/.test(id) && id !== "MU01")) return ["normal"];
  return ["normal", "hard"];
}
