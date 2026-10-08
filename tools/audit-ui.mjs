import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const site = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const data = JSON.parse(fs.readFileSync(path.join(site, "apps/infinite-loot-loop/data/data.json"), "utf8"));
for (const world of ["Mexico", "Candy", "SuperMarket"]) {
  const maps = data.maps.filter(m => m.world === world);
  assert(maps.length && maps.every(m => m.modes.includes("normal") && !m.modes.includes("hard")), `${world} remains Normal-only`);
}
const atrium = data.maps.find(m => m.id === "MU01");
for (const id of ["MH01", "MH02", "MH03", "MH04"]) {
  assert(atrium.doors.some(door => door.to === id && door.modes.includes("hard")), "Every Hard wing needs an Atrium connection");
  assert(data.maps.find(m => m.id === id).image, "Every Hard wing needs visible map art");
}
const source = fs.readFileSync(path.join(site,"assets/js/app.js"),"utf8");
const helpers = source.slice(source.indexOf("  function catalogCodes("),source.indexOf("  /* ---- Monsters ---- */"));
const api = vm.runInNewContext(helpers + "\n({catalogCodes,catalogAreaFilters,catalogNumeric});");
assert.deepEqual([{hp:100,name:"A"},{hp:2,name:"B"},{hp:10,name:"C"}].sort(api.catalogNumeric("hp")).map(x=>x.hp),[2,10,100],"Stats sort numerically");
const filters = api.catalogAreaFilters(data,api.catalogCodes);
const worldFilter = filters.find(f=>f.key==="world"), mapFilter = filters.find(f=>f.key==="area");
assert.equal(mapFilter.dependsOn,"world","Map choices follow region selection");
for (const world of ["Mexico","Candy","SuperMarket"]) {
  const matches=data.items.filter(i=>!i.isHardModeItem && worldFilter.get(i).includes(world));
  assert(matches.length>0, `${world} items reachable through the region filter`);
}
const monsterSource=source.slice(source.indexOf("  function monsterList(d) {"),source.indexOf("  function bossList(d)"));
const list=vm.runInNewContext(monsterSource+"\nmonsterList(data);",{data});
const routed=data.enemies.filter(e=>e.worlds?.length && !/^HM_T/.test(e.id));
assert.equal(list.length,routed.length,"Do not discard same-name monsters with different map stats");
console.log("UI audit passed: mode-specific maps, visible Museum wings, numeric sorts and reachable region filters.");
