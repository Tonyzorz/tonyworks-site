(function(root) {
  "use strict";
  function available(record, mode) { return !record.modes || record.modes.indexOf(mode) >= 0; }
  function connections(maps, mode, worldLevel) {
    var byId = {}, pairs = {};
    maps.forEach(function(m) { if (available(m, mode)) byId[m.id] = m; });
    Object.keys(byId).forEach(function(id) {
      var m = byId[id];
      (m.doors || []).forEach(function(door) {
        var target = byId[door.to];
        if (!target || !available(door, mode)) return;
        var from = worldLevel ? m.world : m.id, to = worldLevel ? target.world : target.id;
        if (from === to) return;
        var key = [from, to].sort().join("|");
        if (!pairs[key]) pairs[key] = {from:from, to:to, oneWay:true};
        else if (pairs[key].from === to) pairs[key].oneWay = false;
      });
    });
    return Object.keys(pairs).sort().map(function(key) { return pairs[key]; });
  }
  function ports(r) {
    var cx = (r.left+r.right)/2, cy = (r.top+r.bottom)/2, gap = 20;
    return [
      [{x:cx,y:r.top},{x:cx,y:r.top-gap}],
      [{x:r.right,y:cy},{x:r.right+gap,y:cy}],
      [{x:cx,y:r.bottom},{x:cx,y:r.bottom+gap}],
      [{x:r.left,y:cy},{x:r.left-gap,y:cy}]
    ];
  }
  function simplify(points) {
    var out = [];
    points.forEach(function(p) {
      var last = out[out.length-1];
      if (last && last.x === p.x && last.y === p.y) return;
      var before = out[out.length-2];
      if (before && ((before.x === last.x && last.x === p.x) || (before.y === last.y && last.y === p.y))) out.pop();
      out.push(p);
    });
    return out;
  }
  function intersects(a, b, r) {
    var inset = .1;
    if (a.x === b.x) return a.x > r.left+inset && a.x < r.right-inset && Math.max(a.y,b.y) > r.top+inset && Math.min(a.y,b.y) < r.bottom-inset;
    return a.y > r.top+inset && a.y < r.bottom-inset && Math.max(a.x,b.x) > r.left+inset && Math.min(a.x,b.x) < r.right-inset;
  }
  // Route along card edges and clear gutters; never draw a line through another card.
  function orthogonalPath(from, to, boxes) {
    var best = null, bestScore = Infinity, xs = [], ys = [];
    boxes.forEach(function(r) { xs.push(r.left-20,r.right+20); ys.push(r.top-20,r.bottom+20); });
    function consider(points) {
      points = simplify(points);
      var length = 0;
      for (var i=1;i<points.length;i++) {
        if (boxes.some(function(r) { return intersects(points[i-1],points[i],r); })) return;
        length += Math.abs(points[i].x-points[i-1].x)+Math.abs(points[i].y-points[i-1].y);
      }
      var score = length + (points.length-2)*12;
      if (score < bestScore) { best = points; bestScore = score; }
    }
    ports(from).forEach(function(a) { ports(to).forEach(function(b) {
      consider([a[0],a[1],{x:b[1].x,y:a[1].y},b[1],b[0]]);
      consider([a[0],a[1],{x:a[1].x,y:b[1].y},b[1],b[0]]);
      xs.forEach(function(x) { consider([a[0],a[1],{x:x,y:a[1].y},{x:x,y:b[1].y},b[1],b[0]]); });
      ys.forEach(function(y) { consider([a[0],a[1],{x:a[1].x,y:y},{x:b[1].x,y:y},b[1],b[0]]); });
    }); });
    return best;
  }
  var observers = {};
  function draw(container, selector, attribute, edges, key) {
    if (!container) return;
    var svg = container.querySelector("svg"), ns = "http://www.w3.org/2000/svg";
    if (!svg) return;
    function paint() {
      if (!container.isConnected || !container.clientWidth) return;
      var origin = container.getBoundingClientRect(), boxes = [], byId = {};
      Array.prototype.forEach.call(container.querySelectorAll(selector), function(el) {
        var r = el.getBoundingClientRect();
        var box = {left:r.left-origin.left,top:r.top-origin.top,right:r.right-origin.left,bottom:r.bottom-origin.top};
        boxes.push(box); byId[el.getAttribute(attribute)] = box;
      });
      svg.setAttribute("viewBox", "0 0 " + container.scrollWidth + " " + container.scrollHeight);
      svg.style.width = container.scrollWidth + "px"; svg.style.height = container.scrollHeight + "px";
      svg.innerHTML = '<defs><marker id="'+key+'-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M1 1 L7 4 L1 7" fill="none" stroke="currentColor" stroke-width="1.5"/></marker></defs>';
      edges.forEach(function(edge) {
        if (!byId[edge.from] || !byId[edge.to]) return;
        var points = orthogonalPath(byId[edge.from],byId[edge.to],boxes);
        if (!points) { console.warn("No clear atlas connection", edge.from, edge.to); return; }
        var line = document.createElementNS(ns,"path");
        line.setAttribute("d",points.map(function(p,i) { return (i ? "L" : "M")+p.x+" "+p.y; }).join(" "));
        line.setAttribute("data-from",edge.from); line.setAttribute("data-to",edge.to);
        if (edge.oneWay) line.setAttribute("marker-end","url(#"+key+"-arrow)");
        svg.appendChild(line);
      });
    }
    if (observers[key]) observers[key].disconnect();
    if (typeof ResizeObserver !== "undefined") {
      observers[key] = new ResizeObserver(function() { requestAnimationFrame(paint); });
      observers[key].observe(container);
      container.querySelectorAll(selector).forEach(function(el) { observers[key].observe(el); });
    }
    requestAnimationFrame(paint);
    if (document.fonts) document.fonts.ready.then(paint);
  }
  var api = {
    connections:connections, orthogonalPath:orthogonalPath, intersects:intersects,
    drawWorld:function(app,data,mode) { draw(app.querySelector(".wm-grid"),"[data-world]","data-world",connections(data.maps,mode,true),"world"); },
    drawMaps:function(app,maps,mode) { draw(app.querySelector(".mchain"),"[data-mid]","data-mid",connections(maps,mode,false),"route"); }
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.TWAtlas = api;
})(typeof window !== "undefined" ? window : this);
