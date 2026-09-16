// ★ THE DOOR GRAPH, READ OUT OF THE SHIPPED SCENE.
//
// ⛔ WHY THIS EXISTS. The wiki showed map connections only while Epoch 4 was UPCOMING: the planned
// data in upcoming.json carried 56 doors over 25 maps, and `mergeUpcoming` handed them to the page.
// Publishing the REAL assets replaced those records with ones built from the .asset YAML — which
// exports no doors at all — so the Connections table vanished. Before: 25 maps with doors. After:
// **0 of 139**. Succeeding removed information, exactly like the Upcoming badge did.
//
// And it was never only an Epoch 4 problem: no released map has EVER carried its doors, so the
// Graveyard, the Maze and the main route have all been unlinked on the wiki the whole time.
//
// ★ THE SCENE IS THE HONEST SOURCE. `MapTransitionTrigger` components hold `activeOnlyInMap` (the
// map you are standing on) and `targetMap` (where the door goes), both as asset GUIDs. That is what
// SHIPS — better than any blueprint, which only describes what was intended and only covers one
// wave. Resolving guid -> MapData name needs nothing but the .meta files.
import fs from 'fs';
import path from 'path';

/** guid -> MapData asset name, from Assets/ScriptableObjects/Maps/*.asset.meta */
function mapGuids(GAME) {
  const dir = path.join(GAME, 'Assets/ScriptableObjects/Maps');
  const out = new Map();
  if (!fs.existsSync(dir)) return out;
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith('.asset.meta')) continue;
    const m = fs.readFileSync(path.join(dir, f), 'utf8').match(/^guid:\s*([0-9a-f]{32})/m);
    if (m) out.set(m[1], f.replace(/\.asset\.meta$/, ''));
  }
  return out;
}

/**
 * Every door in the scene as { from, to, name }, by MapData asset name.
 * A trigger with no `activeOnlyInMap` is skipped: the game itself refuses to fire those
 * ("Disabled unguarded transition"), so they are not real routes.
 */
export function doorGraph(GAME) {
  const scene = path.join(GAME, 'Assets/Scenes/SampleScene.unity');
  if (!fs.existsSync(scene)) return [];
  const guids = mapGuids(GAME);
  const text = fs.readFileSync(scene, 'utf8');

  // GameObject fileID -> m_Name, so a door can be reported by the name the setup tools gave it.
  const names = new Map();
  for (const doc of text.split(/^--- !u!/m)) {
    const id = doc.match(/^\d+\s+&(\d+)/);
    const nm = doc.match(/^\s*m_Name:\s*(.+)$/m);
    if (id && nm && /^1\s/.test(doc)) names.set(id[1], nm[1].trim());
  }

  const doors = [];
  for (const doc of text.split(/^--- !u!/m)) {
    if (!/m_EditorClassIdentifier:.*MapTransitionTrigger/.test(doc)) continue;
    const go = doc.match(/m_GameObject:\s*\{fileID:\s*(\d+)\}/);
    const tgt = doc.match(/^\s*targetMap:\s*\{fileID:\s*\d+,\s*guid:\s*([0-9a-f]{32})/m);
    const host = doc.match(/^\s*activeOnlyInMap:\s*\{fileID:\s*\d+,\s*guid:\s*([0-9a-f]{32})/m);
    if (!tgt || !host) continue;                       // unguarded or dead-ended: not a real route
    const from = guids.get(host[1]), to = guids.get(tgt[1]);
    if (!from || !to) continue;
    doors.push({ from, to, name: go ? (names.get(go[1]) || '') : '' });
  }
  return doors;
}
