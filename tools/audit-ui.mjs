import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const site = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const data = JSON.parse(fs.readFileSync(path.join(site, "apps/infinite-loot-loop/data/data.json"), "utf8"));
const atlas = createRequire(import.meta.url)(path.join(site, "assets/js/atlas-layout.js"));
const normal = atlas.connections(data.maps, "normal", true);
const hard = atlas.connections(data.maps, "hard", true);
const links = (edges, a, b) => edges.some(e => [e.from, e.to].includes(a) && [e.from, e.to].includes(b));
for (const world of ["Mexico", "Candy", "SuperMarket"]) {
  assert(links(normal, "Cloud Plaza", world), `${world} must connect in Normal`);
  assert(!hard.some(e => e.from === world || e.to === world), `${world} must not appear in Hard`);
}
const museum = data.maps.filter(m => m.world === "Museum");
const wings = atlas.connections(museum, "hard", false);
assert.equal(wings.length, 4);
for (const id of ["MH01", "MH02", "MH03", "MH04"]) {
  assert(links(wings, "MU01", id), "Every Hard wing needs an Atrium connection");
  assert(data.maps.find(m => m.id === id).image, "Every Hard wing needs visible map art");
}
const a = {left:0,top:20,right:80,bottom:80};
const b = {left:240,top:20,right:320,bottom:80};
const obstacle = {left:115,top:0,right:205,bottom:100};
const route = atlas.orthogonalPath(a,b,[a,b,obstacle]);
assert(route && route.length >= 4, "Route around an intervening card");
for (let i = 1; i < route.length; i++) {
  assert(route[i].x === route[i-1].x || route[i].y === route[i-1].y, "Orthogonal segments only");
  assert(![a,b,obstacle].some(r => atlas.intersects(route[i-1],route[i],r)), "Connection crosses a card");
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
console.log("UI audit passed: complete mode-aware world/Museum links, visible wings, obstacle-free routing, numeric sorts and reachable region filters.");
