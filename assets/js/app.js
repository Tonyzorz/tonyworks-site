/* TonyWorks — shared site logic. Loads data/data.json and renders pages. */
(function () {
  "use strict";

  var NAV = [
    { id: "home",         label: "Home",        href: "index.html" },
    { id: "monsters",     label: "Monsters",    href: "monsters.html" },
    { id: "bosses",       label: "Bosses",      href: "bosses.html" },
    { id: "items",        label: "Items",       href: "items.html" },
    { id: "maps",         label: "Maps",        href: "maps.html" },
    { id: "characters",   label: "Characters",  href: "characters.html" },
    { id: "achievements", label: "Achievements",href: "achievements.html" },
    { id: "guide",        label: "Guide",       href: "guide.html" },
    { id: "patch",        label: "Patch Notes", href: "patch.html" },
    { id: "faq",          label: "FAQ",         href: "faq.html" }
  ];

  var IMG_BASE = "assets/img/";
  var DATA_URL = "data/data.json";

  /* ---------- helpers ---------- */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function param(name) { return new URLSearchParams(location.search).get(name); }

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function fmt(n) {
    if (n == null || isNaN(n)) return "0";
    var neg = n < 0; n = Math.abs(Number(n));
    var out;
    if (n >= 1e12) out = (n / 1e12).toFixed(2).replace(/\.?0+$/, "") + "T";
    else if (n >= 1e9)  out = (n / 1e9).toFixed(2).replace(/\.?0+$/, "") + "B";
    else if (n >= 1e6)  out = (n / 1e6).toFixed(2).replace(/\.?0+$/, "") + "M";
    else if (n >= 1e3)  out = (n / 1e3).toFixed(1).replace(/\.?0+$/, "") + "K";
    else out = String(Math.round(n));
    return (neg ? "-" : "") + out;
  }

  function initials(name) {
    var w = String(name || "?").trim().split(/\s+/);
    return ((w[0] ? w[0][0] : "?") + (w[1] ? w[1][0] : "")).toUpperCase();
  }

  // <div class="thumb"> with image or a lettered placeholder that also
  // shows if the image 404s (before the first Unity export).
  function thumb(file, name) {
    if (file) {
      return '<div class="thumb"><img src="' + IMG_BASE + esc(file) + '" alt="' + esc(name) +
        '" loading="lazy" onerror="this.parentNode.innerHTML=\'<span class=&quot;ph&quot;>' +
        esc(initials(name)) + '</span>\'"></div>';
    }
    return '<div class="thumb"><span class="ph">' + esc(initials(name)) + "</span></div>";
  }

  function portrait(file, name) {
    if (file) {
      return '<div class="portrait"><img src="' + IMG_BASE + esc(file) + '" alt="' + esc(name) +
        '" onerror="this.parentNode.innerHTML=\'<span class=&quot;ph&quot; style=&quot;font-size:3rem&quot;>' +
        esc(initials(name)) + '</span>\'"></div>';
    }
    return '<div class="portrait"><span class="ph" style="font-size:3rem">' + esc(initials(name)) + "</span></div>";
  }

  var RAR_VAR = {
    Common: "--rar-common", Uncommon: "--rar-uncommon", Rare: "--rar-rare",
    Epic: "--rar-epic", Legendary: "--rar-legendary"
  };
  function rarColor(r) { return "var(" + (RAR_VAR[r] || "--border") + ")"; }

  function link(page, id, label) {
    return '<a href="' + page + '?id=' + encodeURIComponent(id) + '">' + esc(label) + "</a>";
  }

  /* ---------- chrome ---------- */
  function buildChrome(active) {
    var header = $("#site-header");
    if (header) {
      var links = NAV.map(function (n) {
        return '<a href="' + n.href + '"' + (n.id === active ? ' class="active"' : "") + ">" + n.label + "</a>";
      }).join("");
      header.innerHTML =
        '<div class="nav">' +
          '<a class="brand" href="index.html" style="color:inherit">' +
            '<span class="logo">TW</span>' +
            '<span>TonyWorks <small>· Infinite Loot-Loop</small></span>' +
          "</a>" +
          '<nav class="nav-links">' + links + "</nav>" +
        "</div>";
    }
    var footer = $("#site-footer");
    if (footer) {
      footer.innerHTML =
        'TonyWorks — companion wiki for <strong>Infinite Loot-Loop</strong>. ' +
        'Data exported from the game. · <a href="mailto:tonyzorz@naver.com">tonyzorz@naver.com</a>';
    }
  }

  /* ---------- data ---------- */
  var _data = null;
  function loadData() {
    if (_data) return Promise.resolve(_data);
    return fetch(DATA_URL, { cache: "no-cache" }).then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    }).then(function (d) {
      d.enemies = d.enemies || []; d.bosses = d.bosses || []; d.items = d.items || [];
      d.maps = d.maps || []; d.zones = d.zones || []; d.characters = d.characters || [];
      d.achievements = d.achievements || [];
      d._itemById = index(d.items); d._enemyById = index(d.enemies);
      d._bossById = index(d.bosses); d._charById = index(d.characters);
      d._mapById = index(d.maps);
      _data = d; return d;
    });
  }
  function index(arr) { var m = {}; (arr || []).forEach(function (x) { m[x.id] = x; }); return m; }

  function fail(app, err) {
    app.innerHTML =
      '<div class="notice"><strong>No data yet.</strong><br>' +
      'This page reads <code>data/data.json</code>. Run <strong>Dev → Export Site Data</strong> ' +
      'in the Unity editor, then commit &amp; push.<br><span style="color:var(--faint)">(' +
      esc(err && err.message ? err.message : err) + ")</span></div>";
  }

  /* ---------- filtering utility ---------- */
  function makeToolbar(opts) {
    // opts: { search:true, chips:[{group,label,value}], onchange }
    return opts;
  }

  /* ================= PAGE RENDERERS ================= */
  var PAGES = {};

  /* ---- Home ---- */
  PAGES.home = function (app, d) {
    var c = d.counts || {};
    var cards = [
      ["monsters.html", "👾", "Monsters", c.enemies, "Every enemy, stats & drops"],
      ["bosses.html", "☠️", "Bosses", c.bosses, "Boss stats, hard mode & rewards"],
      ["items.html", "⚔️", "Items", c.items, "Gear, effects & sets"],
      ["maps.html", "🗺️", "Maps", c.maps, "Zone layouts & routes"],
      ["characters.html", "🧑", "Characters", c.characters, "Roster & stat multipliers"],
      ["achievements.html", "🏆", "Achievements", c.achievements, "Goals & rewards"],
      ["guide.html", "📖", "Guide", null, "Tips & strategy"],
      ["patch.html", "📝", "Patch Notes", null, "What changed"],
      ["faq.html", "❓", "FAQ", null, "Common questions"]
    ];
    app.innerHTML =
      '<section class="hero">' +
        '<h1>Tony<span class="grad">Works</span></h1>' +
        "<p>The companion wiki for <strong>Infinite Loot-Loop</strong> — browse every monster, boss, item, map and character straight from the game data.</p>" +
      "</section>" +
      '<div class="stat-strip">' +
        stat(c.enemies, "Monsters") + stat(c.bosses, "Bosses") + stat(c.items, "Items") +
        stat(c.maps, "Maps") + stat(c.zones, "Zones") + stat(c.characters, "Characters") +
        stat(c.achievements, "Achievements") +
      "</div>" +
      '<div class="hub-grid">' + cards.map(function (x) {
        return '<a class="hub-card" href="' + x[0] + '">' +
          '<div class="ico">' + x[1] + "</div>" +
          "<h3>" + x[2] + "</h3>" +
          (x[3] != null ? '<div class="count">' + x[3] + " entries</div>" : "") +
          "<p>" + x[4] + "</p></a>";
      }).join("") + "</div>" +
      (d.generatedAt ? '<p style="text-align:center;color:var(--faint);margin-top:2rem;font-size:.85rem">Data exported ' +
        esc(d.generatedAt.replace("T", " ").replace("Z", " UTC")) + "</p>" : "");
    function stat(n, l) { return '<div class="stat"><div class="n">' + (n || 0) + '</div><div class="l">' + l + "</div></div>"; }
  };

  /* ---- Monsters ---- */
  PAGES.monsters = function (app, d) {
    var id = param("id");
    if (id) return monsterDetail(app, d, d._enemyById[id]);
    var list = d.enemies.slice().sort(function (a, b) { return a.minLevel - b.minLevel; });
    listView(app, d, {
      items: list, page: "monsters.html", title: "Monsters", subtitle: d.enemies.length + " enemies",
      search: function (e) { return e.name + " " + e.id; },
      card: function (e) {
        return cardShell("monsters.html", e.id, e.image, e.name,
          '<span class="badge">Lv ' + e.minLevel + "–" + e.maxLevel + "</span>" +
          (e.isBoss ? '<span class="badge" style="color:var(--bad)">Boss</span>' : "") +
          '<span class="meta">HP ' + fmt(e.baseHP) + " · ATK " + fmt(e.baseATK) + "</span>");
      }
    });
  };
  function monsterDetail(app, d, e) {
    if (!e) return notFound(app, "monsters.html", "Monsters");
    var drops = (e.drops || []).map(function (dr) {
      return "<tr><td>" + link("items.html", dr.itemId, dr.itemName || dr.itemId) +
        "</td><td>" + dr.chance + "%</td></tr>";
    }).join("");
    app.innerHTML = backLink("monsters.html", "Monsters") +
      '<div class="detail">' + portrait(e.image, e.name) +
      "<div><h1>" + esc(e.name) + "</h1>" +
      '<div class="tags"><span class="pill">Level ' + e.minLevel + "–" + e.maxLevel + "</span>" +
        (e.isBoss ? '<span class="pill" style="color:var(--bad)">Boss</span>' : "") +
        (e.permanentBPReward ? '<span class="pill">+' + e.permanentBPReward + " BP</span>" : "") + "</div>" +
      '<div class="statgrid">' +
        sb("Base HP", fmt(e.baseHP)) + sb("Base ATK", fmt(e.baseATK)) +
        sb("Base EXP", fmt(e.baseEXP)) + sb("Base Gold", fmt(e.baseGold)) +
      "</div>" +
      '<div class="section-title">Scaling per level</div>' +
      '<div class="statgrid">' +
        sb("HP", "+" + pct(e.hpScaling)) + sb("ATK", "+" + pct(e.atkScaling)) +
        sb("EXP", "+" + pct(e.expScaling)) + sb("Gold", "+" + pct(e.goldScaling)) +
      "</div>" +
      (drops ? '<div class="section-title">Drop table</div><table class="data"><tr><th>Item</th><th>Chance</th></tr>' +
        drops + "</table>" : '<p style="color:var(--faint)">No drop table.</p>') +
      "</div></div>";
  }

  /* ---- Bosses ---- */
  PAGES.bosses = function (app, d) {
    var id = param("id");
    if (id) return bossDetail(app, d, d._bossById[id]);
    var list = d.bosses.slice().sort(function (a, b) { return a.level - b.level; });
    listView(app, d, {
      items: list, page: "bosses.html", title: "Bosses", subtitle: d.bosses.length + " bosses",
      search: function (b) { return b.name + " " + b.id + " " + b.mapId; },
      card: function (b) {
        return cardShell("bosses.html", b.id, b.image, b.name,
          '<span class="badge">Lv ' + b.level + "</span>" +
          '<span class="meta">HP ' + fmt(b.hp) + " · ATK " + fmt(b.atk) + "</span>");
      }
    });
  };
  function bossDetail(app, d, b) {
    if (!b) return notFound(app, "bosses.html", "Bosses");
    var map = d._mapById[b.mapId];
    function itemLink(id) { var it = d._itemById[id]; return it ? link("items.html", id, it.name) : esc(id); }
    app.innerHTML = backLink("bosses.html", "Bosses") +
      '<div class="detail">' + portrait(b.image, b.name) +
      "<div><h1>" + esc(b.name) + "</h1>" +
      '<div class="tags"><span class="pill">Level ' + b.level + "</span>" +
        (b.mapId ? '<span class="pill">' + (map ? link("maps.html", b.mapId, b.mapId) : esc(b.mapId)) + "</span>" : "") +
        '<span class="pill">EXP ' + fmt(b.exp) + "</span></div>" +
      '<div class="section-title">Normal</div><div class="statgrid">' +
        sb("HP", fmt(b.hp)) + sb("ATK", fmt(b.atk)) + "</div>" +
      ((b.hardModeHp || b.hardModeAtk) ? '<div class="section-title">Hard Mode</div><div class="statgrid">' +
        sb("HP", fmt(b.hardModeHp)) + sb("ATK", fmt(b.hardModeAtk)) + "</div>" : "") +
      '<div class="section-title">Drops</div><table class="data">' +
        (b.dropItemId ? "<tr><td>Normal</td><td>" + itemLink(b.dropItemId) + "</td></tr>" : "") +
        (b.hardModeDropItemId ? "<tr><td>Hard Mode</td><td>" + itemLink(b.hardModeDropItemId) + "</td></tr>" : "") +
        (b.bonusDropItemId ? "<tr><td>Bonus</td><td>" + itemLink(b.bonusDropItemId) + "</td></tr>" : "") +
      "</table></div></div>";
  }

  /* ---- Items ---- */
  PAGES.items = function (app, d) {
    var id = param("id");
    if (id) return itemDetail(app, d, d._itemById[id]);
    var rarities = ["Common", "Uncommon", "Rare", "Epic", "Legendary"];
    var types = ["Weapon", "Armor", "Helmet", "Shoes", "Accessory"];
    listView(app, d, {
      items: d.items, page: "items.html", title: "Items", subtitle: d.items.length + " items",
      search: function (i) { return i.name + " " + i.id + " " + (i.setName || ""); },
      filters: [
        { key: "rarity", label: "Rarity", values: rarities, get: function (i) { return i.rarity; } },
        { key: "type", label: "Type", values: types, get: function (i) { return i.type; } }
      ],
      card: function (i) {
        var eff = (i.effects || []).slice(0, 2).join(" · ");
        return '<a class="card rar" href="items.html?id=' + encodeURIComponent(i.id) + '" style="border-top-color:' + rarColor(i.rarity) + '">' +
          thumb(i.image, i.name) + '<div class="body"><h4>' + esc(i.name) + "</h4>" +
          '<div class="meta"><span style="color:' + rarColor(i.rarity) + '">' + esc(i.rarity) + "</span> · " + esc(i.type) + "</div>" +
          (eff ? '<div class="meta" style="margin-top:.25rem">' + esc(eff) + "</div>" : "") + "</div></a>";
      }
    });
  };
  function itemDetail(app, d, i) {
    if (!i) return notFound(app, "items.html", "Items");
    var effects = (i.effects || []).map(function (f) { return '<span class="fx">' + esc(f) + "</span>"; }).join("");
    var setItems = "";
    if (i.setName) {
      var mates = d.items.filter(function (x) { return x.setName === i.setName; });
      setItems = '<div class="section-title">Set: ' + esc(i.setName) + "</div><div class=\"effect-list\">" +
        mates.map(function (x) { return '<span class="fx">' + link("items.html", x.id, x.name) + "</span>"; }).join("") + "</div>";
    }
    var droppedBy = d.enemies.filter(function (e) {
      return (e.drops || []).some(function (dr) { return dr.itemId === i.id; });
    });
    app.innerHTML = backLink("items.html", "Items") +
      '<div class="detail">' + portrait(i.image, i.name) +
      "<div><h1>" + esc(i.name) + "</h1>" +
      '<div class="tags"><span class="pill" style="color:' + rarColor(i.rarity) + '">' + esc(i.rarity) + "</span>" +
        '<span class="pill">' + esc(i.type) + "</span>" +
        (i.isUnique ? '<span class="pill">Unique</span>' : "") +
        (i.isBossItem ? '<span class="pill">Boss Item</span>' : "") +
        (i.isHardModeItem ? '<span class="pill">Hard Mode</span>' : "") + "</div>" +
      (i.description ? "<p>" + esc(i.description) + "</p>" : "") +
      (effects ? '<div class="section-title">Effects</div><div class="effect-list">' + effects + "</div>" : "") +
      '<div class="section-title">Details</div><div class="statgrid">' +
        (i.buyPrice > 0 && !i.shopUnavailable ? sb("Buy Price", fmt(i.buyPrice) + " g") : sb("Availability", i.shopUnavailable ? "Drop only" : "Shop")) +
        (i.maxCopies > 0 ? sb("Max Copies", i.maxCopies) : "") +
        (i.setName ? sb("Set", esc(i.setName)) : "") +
      "</div>" +
      setItems +
      (droppedBy.length ? '<div class="section-title">Dropped by</div><div class="effect-list">' +
        droppedBy.map(function (e) { return '<span class="fx">' + link("monsters.html", e.id, e.name) + "</span>"; }).join("") + "</div>" : "") +
      "</div></div>";
  }

  /* ---- Maps ---- */
  PAGES.maps = function (app, d) {
    var id = param("id");
    if (id) return mapDetail(app, d, d._mapById[id]);
    listView(app, d, {
      items: d.maps, page: "maps.html", title: "Maps", subtitle: d.maps.length + " maps",
      search: function (m) { return m.name; },
      card: function (m) {
        return cardShell("maps.html", m.id, m.image, m.name,
          '<span class="meta">' + m.gridWidth + "×" + m.gridHeight + " grid</span>");
      }
    });
  };
  function mapDetail(app, d, m) {
    if (!m) return notFound(app, "maps.html", "Maps");
    var bosses = d.bosses.filter(function (b) { return b.mapId === m.id; });
    app.innerHTML = backLink("maps.html", "Maps") +
      '<div class="detail">' + portrait(m.image, m.name) +
      "<div><h1>" + esc(m.name) + "</h1>" +
      '<div class="statgrid">' +
        sb("Grid", m.gridWidth + "×" + m.gridHeight) +
        sb("Walkable", fmt(m.walkableCells)) + sb("Blocked", fmt(m.blockedCells)) +
      "</div>" +
      (bosses.length ? '<div class="section-title">Bosses here</div><div class="effect-list">' +
        bosses.map(function (b) { return '<span class="fx">' + link("bosses.html", b.id, b.name) + "</span>"; }).join("") + "</div>" : "") +
      '<p style="color:var(--faint);margin-top:1rem">Tiles are colored by zone tier. Dark = impassable.</p>' +
      "</div></div>";
  }

  /* ---- Characters ---- */
  PAGES.characters = function (app, d) {
    var id = param("id");
    if (id) return charDetail(app, d, d._charById[id]);
    listView(app, d, {
      items: d.characters, page: "characters.html", title: "Characters", subtitle: d.characters.length + " characters",
      search: function (c) { return c.name + " " + c.id; },
      card: function (c) {
        return cardShell("characters.html", c.id, c.image, c.name,
          (c.isPremium ? '<span class="badge" style="color:var(--accent-2)">Premium</span>' :
            c.unlockedByDefault ? '<span class="badge">Starter</span>' :
            c.purchasePrice > 0 ? '<span class="badge">' + fmt(c.purchasePrice) + " g</span>" : '<span class="badge">Unlock</span>'));
      }
    });
  };
  function charDetail(app, d, c) {
    if (!c) return notFound(app, "characters.html", "Characters");
    function mult(v) { return "×" + Number(v).toFixed(2).replace(/\.?0+$/, ""); }
    var owned = [];
    if (c.ownedBonusHP)  owned.push("HP +" + fmt(c.ownedBonusHP));
    if (c.ownedBonusATK) owned.push("ATK +" + fmt(c.ownedBonusATK));
    if (c.ownedBonusDEF) owned.push("DEF +" + fmt(c.ownedBonusDEF));
    if (c.ownedBonusAGI) owned.push("AGI +" + fmt(c.ownedBonusAGI));
    if (c.ownedBonusLUC) owned.push("LUC +" + fmt(c.ownedBonusLUC));
    if (c.ownedBonusDropRatePct) owned.push("Drop +" + c.ownedBonusDropRatePct + "%");
    if (c.ownedBonusGoldPct) owned.push("Gold +" + c.ownedBonusGoldPct + "%");
    app.innerHTML = backLink("characters.html", "Characters") +
      '<div class="detail">' + portrait(c.image, c.name) +
      "<div><h1>" + esc(c.name) + "</h1>" +
      '<div class="tags">' +
        (c.isPremium ? '<span class="pill" style="color:var(--accent-2)">Premium (IAP)</span>' :
          c.unlockedByDefault ? '<span class="pill">Starter</span>' :
          c.purchasePrice > 0 ? '<span class="pill">' + fmt(c.purchasePrice) + " gold</span>" : '<span class="pill">Unlockable</span>') +
      "</div>" +
      (c.description ? "<p>" + esc(c.description) + "</p>" : "") +
      '<div class="section-title">Stat multipliers</div><div class="statgrid">' +
        sb("HP", mult(c.hpMultiplier)) + sb("ATK", mult(c.atkMultiplier)) + sb("DEF", mult(c.defMultiplier)) +
        sb("AGI", mult(c.agiMultiplier)) + sb("LUC", mult(c.lucMultiplier)) +
      "</div>" +
      (owned.length ? '<div class="section-title">Owned bonus (always active)</div><div class="effect-list">' +
        owned.map(function (o) { return '<span class="fx">' + esc(o) + "</span>"; }).join("") + "</div>" : "") +
      "</div></div>";
  }

  /* ---- Achievements ---- */
  PAGES.achievements = function (app, d) {
    var rows = d.achievements.map(function (a) {
      var reward = a.rewardType === "UnlockCharacter"
        ? (a.characterRewardId ? "Unlock " + (d._charById[a.characterRewardId] ? link("characters.html", a.characterRewardId, d._charById[a.characterRewardId].name) : esc(a.characterRewardId)) : "Unlock character")
        : esc(a.rewardType.replace("Bonus", "") + " +" + a.statBonus);
      return { name: a.name, desc: a.description, mode: a.modeRequirement,
        html: "<tr><td><strong>" + esc(a.name) + "</strong><br><span style=\"color:var(--muted);font-size:.85rem\">" + esc(a.description) + "</span></td>" +
          "<td>" + esc(a.modeRequirement) + "</td><td>" + reward + "</td></tr>" };
    });
    app.innerHTML =
      '<div class="page-head"><h1>Achievements</h1><p>' + d.achievements.length + " goals &amp; rewards</p></div>" +
      '<div class="toolbar"><input type="search" id="q" placeholder="Search achievements…"></div>' +
      '<table class="data" id="tbl"><tr><th>Achievement</th><th>Mode</th><th>Reward</th></tr>' +
      rows.map(function (r) { return r.html; }).join("") + "</table>";
    var q = $("#q"), tbl = $("#tbl");
    q.addEventListener("input", function () {
      var t = q.value.toLowerCase();
      var trs = tbl.querySelectorAll("tr");
      for (var k = 1; k < trs.length; k++) {
        trs[k].style.display = trs[k].textContent.toLowerCase().indexOf(t) >= 0 ? "" : "none";
      }
    });
  };

  /* ---------- shared list view ---------- */
  function sb(k, v) { return '<div class="statbox"><div class="k">' + k + '</div><div class="v">' + v + "</div></div>"; }
  function pct(f) { return Math.round((f || 0) * 100) + "%"; }
  function backLink(page, label) { return '<a class="back" href="' + page + '">← All ' + label + "</a>"; }
  function cardShell(page, id, image, name, metaHtml) {
    return '<a class="card" href="' + page + "?id=" + encodeURIComponent(id) + '">' +
      thumb(image, name) + '<div class="body"><h4>' + esc(name) + "</h4>" +
      '<div class="meta">' + metaHtml + "</div></div></a>";
  }
  function notFound(app, page, label) {
    app.innerHTML = backLink(page, label) + '<div class="empty">Not found.</div>';
  }

  function listView(app, d, cfg) {
    var active = {}; (cfg.filters || []).forEach(function (f) { active[f.key] = null; });
    var q = "";
    app.innerHTML =
      '<div class="page-head"><h1>' + esc(cfg.title) + "</h1><p>" + esc(cfg.subtitle) + "</p></div>" +
      '<div class="toolbar">' +
        (cfg.search ? '<input type="search" id="q" placeholder="Search…">' : "") +
        (cfg.filters || []).map(function (f) {
          return '<select data-key="' + f.key + '"><option value="">' + f.label + ': All</option>' +
            f.values.map(function (v) { return '<option value="' + esc(v) + '">' + esc(v) + "</option>"; }).join("") + "</select>";
        }).join("") +
        '<span class="result-count" id="rc"></span>' +
      "</div>" +
      '<div class="grid" id="grid"></div>';

    var grid = $("#grid", app), rc = $("#rc", app);
    function apply() {
      var out = cfg.items.filter(function (x) {
        if (q && cfg.search(x).toLowerCase().indexOf(q) < 0) return false;
        for (var key in active) if (active[key] && cfg.filters) {
          var f = cfg.filters.filter(function (ff) { return ff.key === key; })[0];
          if (f && f.get(x) !== active[key]) return false;
        }
        return true;
      });
      grid.innerHTML = out.length ? out.map(cfg.card).join("") : '<div class="empty" style="grid-column:1/-1">No matches.</div>';
      rc.textContent = out.length + " / " + cfg.items.length;
    }
    var qi = $("#q", app);
    if (qi) qi.addEventListener("input", function () { q = qi.value.toLowerCase(); apply(); });
    Array.prototype.forEach.call(app.querySelectorAll("select[data-key]"), function (sel) {
      sel.addEventListener("change", function () { active[sel.getAttribute("data-key")] = sel.value || null; apply(); });
    });
    apply();
  }

  /* ---------- boot ---------- */
  document.addEventListener("DOMContentLoaded", function () {
    var page = document.body.getAttribute("data-page") || "home";
    buildChrome(page);
    var app = $("#app");
    if (app && PAGES[page]) {
      loadData().then(function (d) { PAGES[page](app, d); }).catch(function (e) { fail(app, e); });
    }
  });
})();
