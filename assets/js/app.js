/* TonyWorks &#8212; shared site logic. Loads data/data.json and renders pages. */
(function () {
  "use strict";

  var NAV = [
    { id: "home",         label: "Home",        href: "index.html" },
    { id: "monsters",     label: "Monsters",    href: "monsters.html" },
    { id: "bosses",       label: "Bosses",      href: "bosses.html" },
    { id: "items",        label: "Items",       href: "items.html" },
    { id: "sets",         label: "Sets",        href: "sets.html" },
    { id: "maps",         label: "Maps",        href: "maps.html" },
    { id: "characters",   label: "Characters",  href: "characters.html" },
    { id: "achievements", label: "Achievements",href: "achievements.html" },
    { id: "guide",        label: "Guide",       href: "guide.html" },
    { id: "patch",        label: "Patch Notes", href: "patch.html" },
    { id: "faq",          label: "FAQ",         href: "faq.html" }
  ];

  var IMG_BASE = "assets/img/";
  var DATA_URL = "data/data.json";
  var WIKI_VERSION = "24";

  /* ---------- helpers ---------- */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function param(name) { return new URLSearchParams(location.search).get(name); }
  // True only when the page was reached via the browser Back/Forward button (so we restore
  // scroll then, but start at the top on a fresh navigation / tab click).
  function isBackNav() {
    try {
      var e = performance.getEntriesByType && performance.getEntriesByType("navigation")[0];
      if (e) return e.type === "back_forward";
      if (performance.navigation) return performance.navigation.type === 2;
    } catch (_) {}
    return false;
  }

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

  // "A" if equal, else "A–B" — for level/stat ranges across an enemy's level band.
  function rng(a, b) { return a === b ? fmt(a) : fmt(a) + "&#8211;" + fmt(b); }

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

  /* ---------- tier badge ---------- */
  var WORLD_TIER = { "Grassland": 0, "Forest": 1, "Volcanic": 2, "Desert": 3, "Underwater": 4 };
  function tierOf(worlds) {
    var t = null;
    (worlds || []).forEach(function (w) { if (WORLD_TIER[w] != null) t = (t == null) ? WORLD_TIER[w] : Math.min(t, WORLD_TIER[w]); });
    return t;
  }
  function tierBadge(worlds) { var t = tierOf(worlds); return t == null ? "" : '<span class="badge tier">T' + t + "</span>"; }

  /* ---------- canonical ordered lists (shared by list + detail prev/next) ---------- */
  function monsterList(d) {
    var seen = {};
    // Only real, in-game monsters: spawn in a live zone (have a world) and not an HM_T* tier
    // stat-template (the real hard monsters are the "_H" mirrors). Drops legacy/orphan junk too.
    return d.enemies.filter(function (e) { return e.worlds && e.worlds.length && !/^HM_T/.test(e.id); })
      .sort(function (a, b) { return (a.minLevel - b.minLevel) || String(a.name).localeCompare(String(b.name)); })
      .filter(function (e) { var k = e.name; if (seen[k]) return false; seen[k] = 1; return true; });
  }
  function bossList(d) { return d.bosses.slice().sort(function (a, b) { return a.level - b.level; }); }
  function itemList(d) {
    var rank = { Common: 0, Uncommon: 1, Rare: 2, Epic: 3, Legendary: 4 };
    return d.items.slice().sort(function (a, b) {
      var ra = rank[a.rarity] == null ? 9 : rank[a.rarity], rb = rank[b.rarity] == null ? 9 : rank[b.rarity];
      if (ra !== rb) return ra - rb;
      var pa = a.buyPrice || 0, pb = b.buyPrice || 0; if (pa !== pb) return pa - pb;
      return String(a.name).localeCompare(String(b.name));
    });
  }
  function charList(d) {
    function rank(c) { if (c.isPremium) return 3e18; if (c.unlockedByDefault) return -1; if (c.purchasePrice > 0) return c.purchasePrice; return 2.9e18; }
    return d.characters.slice().sort(function (a, b) { var ra = rank(a), rb = rank(b); return ra !== rb ? ra - rb : String(a.name).localeCompare(String(b.name)); });
  }

  /* ---------- detail header: breadcrumb + back + prev/next ---------- */
  function detailHead(page, cat, list, cur) {
    var idx = -1, i;
    for (i = 0; i < list.length; i++) { if (list[i].id === cur.id) { idx = i; break; } }
    var prev = idx > 0 ? list[idx - 1] : null;
    var next = (idx >= 0 && idx < list.length - 1) ? list[idx + 1] : null;
    function pn(it, label) {
      return it ? '<a href="' + page + '?id=' + encodeURIComponent(it.id) + '" title="' + esc(it.name) + '">' + label + "</a>"
                : '<span class="pn-off">' + label + "</span>";
    }
    return '<div class="crumb"><a href="index.html">Home</a> &#8250; <a href="' + page + '">' + esc(cat) +
        "</a> &#8250; <span>" + esc(cur.name) + "</span></div>" +
      '<div class="detail-nav"><a class="back" href="' + page + '">&#8592; All ' + esc(cat) + "</a>" +
        '<span class="pn">' + pn(prev, "&#8592; Prev") + pn(next, "Next &#8594;") + "</span></div>";
  }

  /* ---------- chrome ---------- */
  function buildChrome(active) {
    var header = $("#site-header");
    if (header) {
      var links = NAV.map(function (n) {
        return '<a href="' + n.href + '"' + (n.id === active ? ' class="active" aria-current="page"' : "") + ">" + n.label + "</a>";
      }).join("");
      header.innerHTML =
        '<div class="nav">' +
          '<a class="portal-back" href="../../index.html">&#9666; Tony Works</a>' +
          '<a class="brand" href="index.html" style="color:inherit">' +
            '<span class="logo">IL</span>' +
            '<span>Infinite Loot-Loop</span>' +
          "</a>" +
          '<button class="nav-toggle" id="navToggle" type="button" aria-label="Open navigation menu" aria-controls="navLinks" aria-expanded="false">&#9776;</button>' +
          '<nav class="nav-links" id="navLinks">' + links + "</nav>" +
        "</div>";
      var tgl = $("#navToggle", header), nl = $("#navLinks", header);
      if (tgl && nl) {
        tgl.addEventListener("click", function () {
          var open = nl.classList.toggle("open");
          tgl.setAttribute("aria-expanded", open ? "true" : "false");
        });
        nl.addEventListener("click", function (e) { if (e.target.tagName === "A") nl.classList.remove("open"); });
      }
    }
    var footer = $("#site-footer");
    if (footer) {
      footer.innerHTML =
        'Tony Works &#8212; companion wiki for <strong>Infinite Loot-Loop</strong>. ' +
        '<a href="/privacy-policy.html">Privacy</a> &#183; <a href="/terms.html">Terms</a> &#183; ' +
        '<a href="mailto:tonyzorz@naver.com">tonyzorz@naver.com</a>';
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
      'This page reads <code>data/data.json</code>. Run <strong>Dev &#8594; Export Site Data</strong> ' +
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
      ["monsters.html", "&#128126;", "Monsters", c.enemies, "Every enemy — stats, spawn & drops"],
      ["bosses.html", "&#9760;&#65039;", "Bosses", c.bosses, "Boss stats, hard mode & rewards"],
      ["items.html", "&#9876;&#65039;", "Items", c.items, "Gear, effects & sets"],
      ["maps.html", "&#128506;&#65039;", "Maps", c.maps, "Zone layouts & routes"],
      ["characters.html", "&#129489;", "Characters", c.characters, "Roster & stat multipliers"],
      ["achievements.html", "&#127942;", "Achievements", c.achievements, "Goals & rewards"],
      ["guide.html", "&#128214;", "Guide", null, "Tips & strategy"],
      ["patch.html", "&#128221;", "Patch Notes", null, "What changed"],
      ["faq.html", "&#10067;", "FAQ", null, "Common questions"]
    ];
    app.innerHTML =
      '<section class="hero game-hero">' +
        '<div class="hero-copy"><span class="hero-kicker">Official companion wiki</span>' +
        '<h1>Infinite <span class="grad">Loot-Loop</span></h1>' +
        "<p>Find drops, explore routes, compare gear and plan your next run with data exported directly from the game.</p></div>" +
      "</section>" +
      '<div class="home-search"><label for="gsearch">Search the wiki</label><input type="search" id="gsearch" autocomplete="off" placeholder="Monster, boss, item or character name&#8230;"><div class="g-results" id="gresults" aria-live="polite"></div></div>' +
      '<aside class="freshness" aria-label="Wiki data status"><div><span class="fresh-label">Game build</span><strong>' + esc(d.gameVersion || "Development") + '</strong></div>' +
        '<div><span class="fresh-label">Wiki data</span><strong>v' + WIKI_VERSION + '</strong></div>' +
        '<div><span class="fresh-label">Last updated</span><strong>' + esc(formatDate(d.generatedAt)) + '</strong></div>' +
        '<a href="patch.html">Latest patch notes &#8594;</a></aside>' +
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
      "";
    function stat(n, l) { return '<div class="stat"><div class="n">' + (n || 0) + '</div><div class="l">' + l + "</div></div>"; }
    function formatDate(value) {
      if (!value) return "Not available";
      try { return new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "numeric" }).format(new Date(value)); }
      catch (_) { return value; }
    }
    // Global search across the main catalogs.
    var gi = $("#gsearch"), gr = $("#gresults");
    if (gi && gr) {
      var mon = monsterList(d), bos = bossList(d), itm = itemList(d), chr = charList(d);
      gi.addEventListener("input", function () {
        var t = gi.value.trim().toLowerCase();
        if (t.length < 2) { gr.innerHTML = ""; return; }
        function match(arr) { return arr.filter(function (x) { return String(x.name).toLowerCase().indexOf(t) >= 0; }).slice(0, 8); }
        function grp(label, page, arr) {
          return arr.length ? '<div class="g-grp"><h4>' + label + "</h4>" +
            arr.map(function (x) { return '<a href="' + page + "?id=" + encodeURIComponent(x.id) + '">' + esc(x.name) + "</a>"; }).join("") + "</div>" : "";
        }
        var html = grp("Monsters", "monsters.html", match(mon)) + grp("Bosses", "bosses.html", match(bos)) +
          grp("Items", "items.html", match(itm)) + grp("Characters", "characters.html", match(chr));
        gr.innerHTML = html || '<div class="g-empty">No matches.</div>';
      });
    }
  };

  /* ---- Monsters ---- */
  PAGES.monsters = function (app, d) {
    var id = param("id");
    if (id) return monsterDetail(app, d, d._enemyById[id]);
    // Only real, in-game monsters: those that spawn in a live zone (have a world) plus hard
    // mirrors (_H). Drops the legacy/duplicate & template orphan assets. Then dedupe by name.
    var list = monsterList(d);
    listView(app, d, {
      items: list, page: "monsters.html", title: "Monsters", subtitle: list.length + " monsters (Normal + Hard)",
      tabs: [
        { label: "Normal", test: function (e) { return !/_H$/.test(e.id); } },
        { label: "Hard", test: function (e) { return /_H$/.test(e.id); } }
      ],
      search: function (e) { return e.name + " " + e.id + " " + (e.worlds || []).join(" "); },
      card: function (e) {
        return cardShell("monsters.html", e.id, e.image, e.name,
          tierBadge(e.worlds) +
          '<span class="badge">Lv ' + rng(e.minLevel, e.maxLevel) + "</span>" +
          ((e.worlds && e.worlds.length) ? '<span class="badge">' + esc(e.worlds.join(", ")) + "</span>" : "") +
          '<span class="meta">HP ' + rng(e.hpMin, e.hpMax) + " &#183; ATK " + rng(e.atkMin, e.atkMax) + "</span>");
      }
    });
  };
  function monsterDetail(app, d, e) {
    if (!e) return notFound(app, "monsters.html", "Monsters");
    var worlds = e.worlds || [], zones = e.zoneNames || [], drops = e.drops || [];
    var lvLabel = e.minLevel === e.maxLevel ? ("Lv " + e.minLevel) : ("Lv " + e.minLevel + "&#8211;" + e.maxLevel);
    app.innerHTML = detailHead("monsters.html", "Monsters", monsterList(d), e) +
      '<div class="detail">' + portrait(e.image, e.name) +
      "<div><h1>" + esc(e.name) + "</h1>" +
      '<div class="tags"><span class="pill">Level ' + rng(e.minLevel, e.maxLevel) + "</span>" +
        (e.isBoss ? '<span class="pill" style="color:var(--bad)">Boss</span>' : "") +
        (e.permanentBPReward ? '<span class="pill">+' + e.permanentBPReward + " BP</span>" : "") + "</div>" +
      '<div class="section-title">Stats (' + lvLabel + ")</div>" +
      '<div class="statgrid">' +
        sb("HP", rng(e.hpMin, e.hpMax)) + sb("ATK", rng(e.atkMin, e.atkMax)) +
        sb("EXP", rng(e.expMin, e.expMax)) + sb("Gold", rng(e.goldMin, e.goldMax)) +
      "</div>" +
      (worlds.length
        ? '<div class="section-title">Appears in</div><div class="effect-list">' +
            worlds.map(function (w) { return '<a class="fx region-link" data-region="' + esc(w) + '" href="maps.html?world=' + encodeURIComponent(w) + '">' + esc(w) + "</a>"; }).join("") + "</div>" +
            (zones.length ? '<p style="color:var(--faint);font-size:.85rem;margin-top:.5rem">' + esc(zones.join(" · ")) + "</p>" : "")
        : "") +
      (drops.length ? '<div class="section-title">Drops</div><table class="data"><tr><th>Item</th><th>Chance</th></tr>' +
        drops.map(function (x) { return "<tr><td>" + link("items.html", x.itemId, x.itemName || x.itemId) + "</td><td>" + x.chance + "%</td></tr>"; }).join("") + "</table>" : "") +
      "</div></div>";
  }

  /* ---- Bosses ---- */
  PAGES.bosses = function (app, d) {
    var id = param("id");
    if (id) return bossDetail(app, d, d._bossById[id]);
    var list = bossList(d);
    listView(app, d, {
      items: list, page: "bosses.html", title: "Bosses", subtitle: d.bosses.length + " bosses",
      tabs: [ { label: "Normal", mode: "normal" }, { label: "Hard", mode: "hard" } ],
      search: function (b) { return b.name + " " + b.id + " " + b.mapId; },
      card: function (b, tab) {
        var hard = tab && tab.mode === "hard";
        var hp = hard && b.hardModeHp ? b.hardModeHp : b.hp;
        var atk = hard && b.hardModeAtk ? b.hardModeAtk : b.atk;
        var mw = d._mapById[b.mapId] ? d._mapById[b.mapId].world : null;
        return cardShell("bosses.html", b.id, b.image, b.name,
          tierBadge(mw ? [mw] : []) +
          '<span class="badge">Lv ' + b.level + "</span>" +
          (hard ? '<span class="badge" style="color:var(--bad)">Hard</span>' : "") +
          '<span class="meta">HP ' + fmt(hp) + " &#183; ATK " + fmt(atk) + "</span>");
      }
    });
  };
  function bossDetail(app, d, b) {
    if (!b) return notFound(app, "bosses.html", "Bosses");
    var map = d._mapById[b.mapId];
    function itemLink(id) { var it = d._itemById[id]; return it ? link("items.html", id, it.name) : esc(id); }
    var hasHard = b.hardModeHp || b.hardModeAtk || b.hardModeDropItemId;
    function stats(mode) {
      var hard = mode === "hard";
      var hp = hard && b.hardModeHp ? b.hardModeHp : b.hp;
      var atk = hard && b.hardModeAtk ? b.hardModeAtk : b.atk;
      var dropId = (hard && b.hardModeDropItemId) ? b.hardModeDropItemId : b.dropItemId;
      return '<div class="statgrid">' + sb("HP", fmt(hp)) + sb("ATK", fmt(atk)) + "</div>" +
        '<div class="section-title">Drop</div><table class="data">' +
          (dropId ? "<tr><td>" + (hard ? "Hard" : "Normal") + "</td><td>" + itemLink(dropId) + "</td></tr>" : "") +
          (b.bonusDropItemId ? "<tr><td>Bonus</td><td>" + itemLink(b.bonusDropItemId) + "</td></tr>" : "") +
        "</table>";
    }
    app.innerHTML = detailHead("bosses.html", "Bosses", bossList(d), b) +
      '<div class="detail">' + portrait(b.image, b.name) +
      "<div><h1>" + esc(b.name) + "</h1>" +
      '<div class="tags"><span class="pill">Level ' + b.level + "</span>" +
        (b.mapId ? '<span class="pill">' + (map ? link("maps.html", b.mapId, map.name) : esc(b.mapId)) + "</span>" : "") +
        '<span class="pill">EXP ' + fmt(b.exp) + "</span></div>" +
      (hasHard ? '<div class="tabs" id="btabs"><button class="tab active" data-m="normal">Normal</button><button class="tab" data-m="hard">Hard</button></div>' : "") +
      '<div id="bstats">' + stats("normal") + "</div>" +
      "</div></div>";
    if (hasHard) Array.prototype.forEach.call(app.querySelectorAll("#btabs .tab"), function (btn) {
      btn.addEventListener("click", function () {
        Array.prototype.forEach.call(app.querySelectorAll("#btabs .tab"), function (x) { x.classList.remove("active"); });
        btn.classList.add("active");
        $("#bstats", app).innerHTML = stats(btn.getAttribute("data-m"));
      });
    });
  }

  /* ---- Items ---- */
  PAGES.items = function (app, d) {
    var id = param("id");
    if (id) return itemDetail(app, d, d._itemById[id]);
    var rarities = ["Common", "Uncommon", "Rare", "Epic", "Legendary"];
    var types = ["Weapon", "Armor", "Helmet", "Shoes", "Accessory"];
    var sorted = itemList(d);
    listView(app, d, {
      items: sorted, page: "items.html", title: "Items", subtitle: d.items.length + " items (Normal + Hard)",
      tabs: types.map(function (tp) { return { label: tp, test: function (i) { return i.type === tp; } }; }),
      search: function (i) { return i.name + " " + i.id + " " + (i.setName || ""); },
      filters: [
        { key: "mode",   label: "Mode",   values: ["Normal", "Hard"], get: function (i) { return i.isHardModeItem ? "Hard" : "Normal"; } },
        { key: "rarity", label: "Rarity", values: rarities,           get: function (i) { return i.rarity; } }
      ],
      card: function (i) {
        var eff = (i.effects || []).slice(0, 2).join(" · ");
        return '<a class="card rar" href="items.html?id=' + encodeURIComponent(i.id) + '" style="border-top-color:' + rarColor(i.rarity) + '">' +
          thumb(i.image, i.name) + '<div class="body"><h4>' + esc(i.name) + "</h4>" +
          '<div class="meta"><span style="color:' + rarColor(i.rarity) + '">' + esc(i.rarity) + "</span> &#183; " + esc(i.type) + "</div>" +
          (eff ? '<div class="meta" style="margin-top:.25rem">' + esc(eff) + "</div>" : "") + "</div></a>";
      }
    });
  };
  // Permanent collection bonus by copies owned (1..20), with milestone jumps at 10 (50%) and 20
  // (100%) — mirrors PermanentProgressManager.ItemPermRateByCopy.
  var PERM_RATES = [2, 5, 8, 11, 14, 18, 22, 26, 30, 50, 53, 56, 59, 62, 65, 68, 72, 76, 80, 100];
  function permRate(c) { if (c <= 0) return 0; return PERM_RATES[Math.min(c, 20) - 1] / 100; }
  // Copy-count tier colors (mirror the in-game item border): green 1-4, blue 5-9, red 10-14,
  // purple 15-19, rainbow at 20.
  function permBand(c) { if (c >= 20) return "rainbow"; if (c >= 15) return "purple"; if (c >= 10) return "red"; if (c >= 5) return "blue"; return "green"; }
  function itemPermTable(i) {
    var flats = [["HP", i.bonusHP], ["ATK", i.bonusATK], ["DEF", i.bonusDEF], ["AGI", i.bonusAGI], ["LUC", i.bonusLUC]]
      .filter(function (x) { return x[1] > 0; });
    if (!flats.length)
      return '<div class="section-title">Permanent Collection Bonus</div>' +
        '<p style="color:var(--muted);font-size:.85rem">Percentage / utility effects only (see Effects) — no flat stats to bank, so this item earns no permanent collection bonus.</p>';
    var maxC = i.type === "Accessory" ? 3 : 20;   // accessories cap at 3 copies, everything else at 20
    var head = "<tr><th>Copies</th><th>Permanent</th>" + flats.map(function (f) { return "<th>" + f[0] + "</th>"; }).join("") + "</tr>";
    var rows = "";
    for (var c = 1; c <= maxC; c++) {
      var r = permRate(c);
      rows += '<tr class="pb-' + permBand(c) + '"><td>' + c + "</td><td>+" + Math.round(r * 100) + "%</td>" +
        flats.map(function (f) { return "<td>+" + fmt(Math.round(f[1] * r)) + "</td>"; }).join("") + "</tr>";
    }
    var table = '<div class="perm-body" style="overflow-x:auto"><table class="data">' + head + rows + "</table></div>";
    // Desktop: rendered open (summary hidden via CSS) = full table. Mobile: collapsed dropdown.
    var wide = typeof window !== "undefined" && window.innerWidth >= 700;
    var cap = "+" + Math.round(permRate(maxC) * 100) + "% at " + maxC + " owned";
    return '<div class="section-title">Permanent Collection Bonus</div>' +
      '<p style="color:var(--muted);font-size:.85rem;margin:.2rem 0 .5rem">Owning copies grants a permanent, every-run bonus of this item’s stats — +2% at 1 copy, up to ' + cap + '.</p>' +
      '<details class="perm-details"' + (wide ? " open" : "") + '><summary>Show all ' + maxC + ' levels</summary>' + table + '</details>';
  }
  function itemDetail(app, d, i) {
    if (!i) return notFound(app, "items.html", "Items");
    var effects = (i.effects || []).map(function (f) { return '<span class="fx">' + esc(f) + "</span>"; }).join("");
    var setItems = "";
    if (i.setName) {
      var mates = d.items.filter(function (x) { return x.setName === i.setName; });
      setItems = '<div class="section-title">Set: ' + esc(i.setName) + "</div><div class=\"effect-list\">" +
        mates.map(function (x) { return '<span class="fx">' + link("items.html", x.id, x.name) + "</span>"; }).join("") + "</div>";
    }
    // Only credit real, named monsters as droppers — skip the internal HM_T* generic tier enemies
    // (fallback stat-templates) so hard gear reads as dropped by the clearly-Hard "_H" monsters.
    var droppedBy = d.enemies.filter(function (e) {
      if (/^HM_T/.test(e.id)) return false;
      return (e.drops || []).some(function (dr) { return dr.itemId === i.id; });
    });
    var bossDrops = d.bosses.filter(function (b) {
      return b.dropItemId === i.id || b.hardModeDropItemId === i.id || b.bonusDropItemId === i.id;
    });
    app.innerHTML = detailHead("items.html", "Items", itemList(d), i) +
      '<div class="detail">' + portrait(i.image, i.name) +
      "<div><h1>" + esc(i.name) + "</h1>" +
      '<div class="tags"><span class="pill" style="color:' + rarColor(i.rarity) + '">' + esc(i.rarity) + "</span>" +
        '<span class="pill">' + esc(i.type) + "</span>" +
        (i.isUnique ? '<span class="pill">Unique</span>' : "") +
        (i.isBossItem ? '<span class="pill">Boss Item</span>' : "") +
        (i.isHardModeItem ? '<span class="pill">Hard</span>' : "") + "</div>" +
      '<button class="compare-add" type="button" data-compare-id="' + esc(i.id) + '">&#8644; Add to comparison</button>' +
      (i.description ? "<p>" + esc(i.description) + "</p>" : "") +
      (effects ? '<div class="section-title">Effects</div><div class="effect-list">' + effects + "</div>" : "") +
      '<div class="section-title">Details</div><div class="statgrid">' +
        (i.buyPrice > 0 && !i.shopUnavailable ? sb("Buy Price", fmt(i.buyPrice) + " g") : sb("Availability", i.shopUnavailable ? "Drop only" : "Shop")) +
        sb("Max Copies", i.type === "Accessory" ? 3 : 20) +
        (i.setName ? sb("Set", esc(i.setName)) : "") +
      "</div>" +
      itemPermTable(i) +
      setItems +
      (droppedBy.length ? '<div class="section-title">Dropped by</div><div class="effect-list">' +
        droppedBy.map(function (e) {
          var dr = (e.drops || []).filter(function (x) { return x.itemId === i.id; })[0];
          var ch = dr ? " (" + dr.chance + "%)" : "";
          return '<span class="fx">' + link("monsters.html", e.id, e.name) + esc(ch) + "</span>";
        }).join("") + "</div>" : "") +
      (bossDrops.length ? '<div class="section-title">Boss rewards</div><div class="effect-list">' +
        bossDrops.map(function (b) {
          var mode = b.hardModeDropItemId === i.id ? "Hard" : b.bonusDropItemId === i.id ? "Bonus" : "Normal";
          return '<span class="fx">' + link("bosses.html", b.id, b.name) + ' <small>' + mode + "</small></span>";
        }).join("") + "</div>" : "") +
      "</div></div>";
    mountCompareTray(d, i.id);
  }

  function compareStore() {
    try { return JSON.parse(localStorage.getItem("tw-compare-items") || "[]"); } catch (_) { return []; }
  }
  function saveCompare(ids) { try { localStorage.setItem("tw-compare-items", JSON.stringify(ids)); } catch (_) {} }
  function mountCompareTray(d, currentId) {
    var add = document.querySelector("[data-compare-id]");
    var ids = compareStore().filter(function (id) { return !!d._itemById[id]; }).slice(0, 4);
    var collapsed = false; try { collapsed = localStorage.getItem("tw-compare-collapsed") === "1"; } catch (_) {}
    var tray = document.createElement("section"); tray.className = "compare-tray"; tray.setAttribute("aria-label", "Item comparison");
    document.body.appendChild(tray);
    function render() {
      var items = ids.map(function (id) { return d._itemById[id]; }).filter(Boolean);
      tray.innerHTML = '<div class="compare-head"><strong>Compare items <span>' + items.length + '/4</span></strong><div class="compare-actions">' +
        '<button type="button" data-collapse aria-expanded="' + (!collapsed) + '" aria-label="' + (collapsed ? "Expand" : "Minimize") + ' comparison tray">' + (collapsed ? "Expand" : "Minimize") + '</button>' +
        '<button type="button" data-clear>Clear</button></div></div>' +
        (items.length ? '<div class="compare-scroll"><table><tr><th>Stat</th>' + items.map(function (x) { return '<th><a href="items.html?id=' + encodeURIComponent(x.id) + '">' + esc(x.name) + '</a><button type="button" data-remove="' + esc(x.id) + '" aria-label="Remove ' + esc(x.name) + '">&#215;</button></th>'; }).join("") + '</tr>' +
        compareRow("Rarity", items, function (x) { return x.rarity; }) + compareRow("Type", items, function (x) { return x.type; }) +
        compareRow("HP", items, function (x) { return fmt(x.bonusHP); }) + compareRow("ATK", items, function (x) { return fmt(x.bonusATK); }) +
        compareRow("DEF", items, function (x) { return fmt(x.bonusDEF); }) + compareRow("AGI", items, function (x) { return fmt(x.bonusAGI); }) +
        compareRow("LUC", items, function (x) { return fmt(x.bonusLUC); }) + '</table></div>' : '<p>Select up to four items to compare.</p>');
      tray.classList.toggle("open", items.length > 0);
      tray.classList.toggle("collapsed", collapsed);
      if (add) { add.disabled = ids.indexOf(currentId) >= 0 || ids.length >= 4; add.textContent = ids.indexOf(currentId) >= 0 ? "Added to comparison" : "⇄ Add to comparison"; }
      var collapse = tray.querySelector("[data-collapse]"); if (collapse) collapse.onclick = function () { collapsed = !collapsed; try { localStorage.setItem("tw-compare-collapsed", collapsed ? "1" : "0"); } catch (_) {} render(); };
      var clear = tray.querySelector("[data-clear]"); if (clear) clear.onclick = function () { ids = []; saveCompare(ids); render(); };
      Array.prototype.forEach.call(tray.querySelectorAll("[data-remove]"), function (b) { b.onclick = function () { ids = ids.filter(function (id) { return id !== b.getAttribute("data-remove"); }); saveCompare(ids); render(); }; });
    }
    if (add) add.onclick = function () { if (ids.indexOf(currentId) < 0 && ids.length < 4) { ids.push(currentId); saveCompare(ids); render(); } };
    render();
  }
  function compareRow(label, items, get) { return '<tr><th>' + label + '</th>' + items.map(function (x) { return '<td>' + esc(get(x)) + '</td>'; }).join("") + '</tr>'; }

  /* ---- Maps: whole-world route graph -> per-world -> single map ---- */
  var WORLD_META = {
    "Grassland":  { icon: "&#127793;", color: "#5cb85c" },
    "Forest":     { icon: "&#127794;", color: "#3f9d54" },
    "Volcanic":   { icon: "&#127755;", color: "#e0603a" },
    "Desert":     { icon: "&#127964;", color: "#d9a441" },
    "Underwater": { icon: "&#127754;", color: "#3aa0e0" },
    "Void Hunt":  { icon: "&#128371;",  color: "#8a5cf0" },
    "World Gate": { icon: "&#128682;", color: "#8a8f98" }
  };
  // Real in-game connections per world (documented route). Maps to MapData asset ids.
  var WORLD_ROUTES = {
    "Grassland": { root: "Grassland_Map", edges: {} },
    "Forest": { root: "ForestRoad_Map", edges: {
      "ForestRoad_Map": ["DarkForest_Map"], "DarkForest_Map": ["DeepForest_Map"], "DeepForest_Map": ["AshenForest_Map"] } },
    "Volcanic": { root: "VolcanicApproach_Map", edges: {
      "VolcanicApproach_Map": ["LavaRiverPass_Map"], "LavaRiverPass_Map": ["LavaCore_Map"] } },
    "Desert": { root: "DesertOutskirts_Map", edges: {
      "DesertOutskirts_Map": ["DesertCrossroads_Map"],
      "DesertCrossroads_Map": ["SandstoneTunnel_Map", "AncientBurialPassage_Map", "SunBuriedCave_Map"],
      "SandstoneTunnel_Map": ["DesertBossRoom_Map"], "AncientBurialPassage_Map": ["DesertBossRoom_Map"], "SunBuriedCave_Map": ["DesertBossRoom_Map"] } },
    "Underwater": { root: "ShallowCoralReef_Map", edges: {
      "ShallowCoralReef_Map": ["CoralMaze_Map", "SunkenTempleGate_Map", "DeepTrench_Map"],
      "CoralMaze_Map": ["GiantClamBossRoom_Map"], "DeepTrench_Map": ["MainUnderwaterBossRoom_Map"] } }
  };
  function worldStats(d, w) {
    var ms = d.maps.filter(function (m) { return m.world === w; });
    var ids = ms.map(function (m) { return m.id; });
    var bc = d.bosses.filter(function (b) { return ids.indexOf(b.mapId) >= 0; }).length;
    return { maps: ms, bosses: bc };
  }
  function wnode(d, w, opts) {
    opts = opts || {};
    var meta = WORLD_META[w] || { icon: "&#128506;", color: "var(--accent)" };
    var s = worldStats(d, w);
    var sub = opts.locked ? "Coming soon"
      : (s.maps.length + " map" + (s.maps.length !== 1 ? "s" : "") +
         (s.bosses ? " &#183; " + s.bosses + " boss" + (s.bosses > 1 ? "es" : "") : ""));
    var inner = '<span class="wicon">' + meta.icon + "</span>" +
      '<span class="wname">' + esc(w) + "</span><span class=\"wmeta\">" + sub + "</span>";
    if (opts.locked) return '<div class="wnode locked" style="--wc:' + meta.color + '">' + inner + "</div>";
    var cls = "wnode" + (opts.secret ? " secret" : "");
    return '<a class="' + cls + '" style="--wc:' + meta.color + '" href="maps.html?world=' + encodeURIComponent(w) + '">' + inner + "</a>";
  }
  PAGES.maps = function (app, d) {
    var id = param("id"); if (id) return mapDetail(app, d, d._mapById[id]);
    var world = param("world"); if (world) return worldView(app, d, world);
    var worlds = ["Grassland", "Forest", "Volcanic", "Desert", "Underwater", "Void Hunt"];
    app.innerHTML =
      '<div class="page-head"><h1>World Map</h1><p>Every region, connected. Tap a world to see its maps &amp; bosses.</p></div>' +
      '<div class="view-switch" role="group" aria-label="World view"><button type="button" data-view="map">Map</button><button type="button" data-view="list">List</button></div>' +
      '<div class="world-view" data-panel="map"><div class="worldmap"><div class="wm-grid">' +
        '<div class="wm-cell" style="grid-area:uw">'     + wnode(d, "Underwater") + '</div>' +
        '<div class="wm-conn v" style="grid-area:vu"></div>' +
        '<div class="wm-cell" style="grid-area:void">'   + wnode(d, "Void Hunt", { secret: true }) + '</div>' +
        '<div class="wm-conn h dashed" style="grid-area:h1"></div>' +
        '<div class="wm-cell" style="grid-area:volc">'   + wnode(d, "Volcanic") + '</div>' +
        '<div class="wm-conn h" style="grid-area:h2"></div>' +
        '<div class="wm-cell" style="grid-area:forest">' + wnode(d, "Forest") + '</div>' +
        '<div class="wm-conn h" style="grid-area:h3"></div>' +
        '<div class="wm-cell" style="grid-area:gl">'     + wnode(d, "Grassland") + '</div>' +
        '<div class="wm-conn h" style="grid-area:h4"></div>' +
        '<div class="wm-cell" style="grid-area:desert">' + wnode(d, "Desert") + '</div>' +
        '<div class="wm-conn v" style="grid-area:vd"></div>' +
        '<div class="wm-cell" style="grid-area:gate">'   + wnode(d, "World Gate", { locked: true }) + '</div>' +
      '</div></div><p class="route-note">Grassland is the hub &#8212; Forest &amp; Volcanic to the west, Desert east, the Underwater docks north, the World Gate south. Void Hunt is a secret arena reached from Volcanic.</p></div>' +
      '<div class="world-view region-list" data-panel="list">' + worlds.map(function (w) { return wnode(d, w, { secret: w === "Void Hunt" }); }).join("") + '</div>';
    var stored; try { stored = localStorage.getItem("tw-map-view"); } catch (_) {}
    var view = stored || (window.innerWidth <= 640 ? "list" : "map");
    function setView(v) {
      view = v; try { localStorage.setItem("tw-map-view", v); } catch (_) {}
      Array.prototype.forEach.call(app.querySelectorAll("[data-view]"), function (b) { var on = b.getAttribute("data-view") === v; b.classList.toggle("active", on); b.setAttribute("aria-pressed", on ? "true" : "false"); });
      Array.prototype.forEach.call(app.querySelectorAll("[data-panel]"), function (p) {
        var hide = p.getAttribute("data-panel") !== v;
        p.hidden = hide;
        p.style.display = hide ? "none" : "";
      });
    }
    Array.prototype.forEach.call(app.querySelectorAll("[data-view]"), function (b) { b.onclick = function () { setView(b.getAttribute("data-view")); }; }); setView(view);
  };
  function worldView(app, d, w) {
    var s = worldStats(d, w);
    if (!s.maps.length) return notFound(app, "maps.html", "Worlds");
    var meta = WORLD_META[w] || { color: "var(--accent)" };
    var route = WORLD_ROUTES[w];
    var byId = {}; s.maps.forEach(function (m) { byId[m.id] = m; });
    // Depth + BFS discovery order from the route root, so each tier lists its maps grouped
    // under the parent they branch from (keeps siblings adjacent and connectors untangled).
    var depth = {}, order = [];
    if (route && byId[route.root]) {
      depth[route.root] = 0; order.push(route.root);
      var queue = [route.root], guard = 0;
      while (queue.length && guard++ < 999) {
        var cur = queue.shift();
        (route.edges[cur] || []).forEach(function (k) {
          if (byId[k] && depth[k] == null) { depth[k] = depth[cur] + 1; order.push(k); queue.push(k); }
        });
      }
    }
    var maxD = 0; s.maps.forEach(function (m) { if (depth[m.id] != null) maxD = Math.max(maxD, depth[m.id]); });
    var tiers = [];
    order.forEach(function (idk) { (tiers[depth[idk]] = tiers[depth[idk]] || []).push(byId[idk]); });
    s.maps.forEach(function (m) { if (depth[m.id] == null) (tiers[maxD + 1] = tiers[maxD + 1] || []).push(m); });
    function mnode(m) {
      var mb = d.bosses.filter(function (b) { return b.mapId === m.id; });
      var sub = mb.length ? ("&#9760;&#65039; " + mb.map(function (b) { return esc(b.name); }).join(", ")) : "No boss";
      return '<a class="mnode" data-mid="' + esc(m.id) + '" href="maps.html?id=' + encodeURIComponent(m.id) + '" style="--wc:' + meta.color + '">' +
        thumb(m.image, m.name) +
        '<div class="mnode-body"><h4>' + esc(m.name) + '</h4><div class="meta">' + sub + '</div></div></a>';
    }
    // Orient each world's chain to match how you ENTER it from Grassland (compass):
    //   Desert is east  -> enter from the left, flow left->right (horizontal)
    //   Underwater is north (docks) -> enter from the bottom, flow bottom->top (reversed vertical)
    //   Forest/Volcanic are west -> enter from the right, flow right->left (reversed horizontal)
    var DIR = { Grassland: "v", Forest: "hr", Volcanic: "hr", Desert: "h", Underwater: "vr" };
    var dir = DIR[w] || "v";
    var horizontal = (dir === "h" || dir === "hr");
    var reverse = (dir === "vr" || dir === "hr");
    var rows = [];
    tiers.forEach(function (row) { if (row && row.length) rows.push(row); });
    if (reverse) rows.reverse();
    var html = rows.map(function (row) {
      return '<div class="mtier">' + row.map(mnode).join("") + "</div>";
    }).join("");
    app.innerHTML =
      '<a class="back" href="maps.html">&#8592; World Map</a>' +
      '<div class="page-head"><h1>' + esc(w) + '</h1><p>' + s.maps.length + ' map' + (s.maps.length !== 1 ? 's' : '') + ' &#183; connected in travel order</p></div>' +
      '<div class="mchain' + (horizontal ? " h" : "") + '" style="--wc:' + meta.color + '"><svg class="mconn-svg" aria-hidden="true"></svg>' + html + '</div>';
    drawRouteConnectors(app, route);
  }
  // Draw one line per route edge, from parent node centre to child node centre, on an SVG
  // overlay behind the (opaque) map cards. Uses offset coords so it survives horizontal scroll,
  // and redraws on resize / after thumbnails load. This is what makes every branch visible
  // (e.g. Shallow Coral Reef -> Coral Maze / Sunken Temple Gate / Deep Trench), not just a chain.
  function drawRouteConnectors(app, route) {
    var chain = app.querySelector(".mchain");
    if (!chain || !route) return;
    var svg = chain.querySelector(".mconn-svg");
    if (!svg) return;
    function centre(id) {
      var el = chain.querySelector('[data-mid="' + id + '"]');
      return el ? { x: el.offsetLeft + el.offsetWidth / 2, y: el.offsetTop + el.offsetHeight / 2 } : null;
    }
    function draw() {
      var W = chain.scrollWidth, H = chain.scrollHeight;
      svg.setAttribute("viewBox", "0 0 " + W + " " + H);
      svg.style.width = W + "px"; svg.style.height = H + "px";
      var lines = "";
      Object.keys(route.edges || {}).forEach(function (p) {
        var pc = centre(p); if (!pc) return;
        (route.edges[p] || []).forEach(function (c) {
          var cc = centre(c); if (!cc) return;
          lines += '<line x1="' + pc.x + '" y1="' + pc.y + '" x2="' + cc.x + '" y2="' + cc.y + '"/>';
        });
      });
      svg.innerHTML = lines;
    }
    requestAnimationFrame(draw);
    Array.prototype.forEach.call(chain.querySelectorAll("img"), function (im) {
      if (!im.complete) im.addEventListener("load", function () { requestAnimationFrame(draw); }, { once: true });
    });
    if (drawRouteConnectors._rz) window.removeEventListener("resize", drawRouteConnectors._rz);
    var t; drawRouteConnectors._rz = function () { clearTimeout(t); t = setTimeout(draw, 120); };
    window.addEventListener("resize", drawRouteConnectors._rz);
  }
  function mapDetail(app, d, m) {
    if (!m) return notFound(app, "maps.html", "Maps");
    var bosses = d.bosses.filter(function (b) { return b.mapId === m.id; });
    app.innerHTML =
      '<a class="back" href="maps.html' + (m.world ? "?world=" + encodeURIComponent(m.world) : "") + '">&#8592; ' + esc(m.world || "Maps") + "</a>" +
      "<h1>" + esc(m.name) + "</h1>" +
      (m.world ? '<div class="tags"><span class="pill">' + esc(m.world) + "</span></div>" : "") +
      '<div class="map-art">' +
        (m.image ? '<img src="' + IMG_BASE + esc(m.image) + '" alt="' + esc(m.name) + '">' : '<div class="empty">No map art available.</div>') +
      "</div>" +
      '<div class="statgrid">' +
        sb("Walkable tiles", fmt(m.walkableCells)) + sb("Blocked tiles", fmt(m.blockedCells)) +
        sb("Grid", m.gridWidth + "&#215;" + m.gridHeight) +
      "</div>" +
      (bosses.length ? '<div class="section-title">Bosses here</div><div class="effect-list">' +
        bosses.map(function (b) { return '<span class="fx">' + link("bosses.html", b.id, b.name) + "</span>"; }).join("") + "</div>" : "");
  }

  /* ---- Characters ---- */
  PAGES.characters = function (app, d) {
    var id = param("id");
    if (id) return charDetail(app, d, d._charById[id]);
    var sorted = charList(d);
    listView(app, d, {
      items: sorted, page: "characters.html", title: "Characters", subtitle: d.characters.length + " characters",
      search: function (c) { return c.name + " " + c.id; },
      card: function (c) {
        var badge = c.isPremium ? '<span class="badge" style="color:var(--accent-2)">Premium</span>' :
          c.unlockedByDefault ? '<span class="badge">Starter</span>' :
          c.purchasePrice > 0 ? '<span class="badge">' + fmt(c.purchasePrice) + " g</span>" : '<span class="badge">Unlock</span>';
        var top = [["HP", c.hpMultiplier], ["ATK", c.atkMultiplier], ["DEF", c.defMultiplier], ["AGI", c.agiMultiplier], ["LUC", c.lucMultiplier]]
          .sort(function (a, b) { return b[1] - a[1]; }).slice(0, 2)
          .map(function (x) { return x[0] + " &#215;" + Number(x[1]).toFixed(1); }).join(" &#183; ");
        return cardShell("characters.html", c.id, c.image, c.name,
          badge + '<span class="meta">' + top + "</span>");
      }
    });
  };
  function charDetail(app, d, c) {
    if (!c) return notFound(app, "characters.html", "Characters");
    function mult(v) { return "&#215;" + Number(v).toFixed(2).replace(/\.?0+$/, ""); }
    var owned = [];
    if (c.ownedBonusHP)  owned.push("HP +" + fmt(c.ownedBonusHP));
    if (c.ownedBonusATK) owned.push("ATK +" + fmt(c.ownedBonusATK));
    if (c.ownedBonusDEF) owned.push("DEF +" + fmt(c.ownedBonusDEF));
    if (c.ownedBonusAGI) owned.push("AGI +" + fmt(c.ownedBonusAGI));
    if (c.ownedBonusLUC) owned.push("LUC +" + fmt(c.ownedBonusLUC));
    if (c.ownedBonusDropRatePct) owned.push("Drop +" + c.ownedBonusDropRatePct + "%");
    if (c.ownedBonusGoldPct) owned.push("Gold +" + c.ownedBonusGoldPct + "%");
    app.innerHTML = detailHead("characters.html", "Characters", charList(d), c) +
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
    var list = d.achievements.slice();
    function reward(a) {
      if (a.rewardType === "UnlockCharacter") {
        var c = d._charById[a.characterRewardId];
        return '<span class="ach-reward unlock">&#128273; ' + (c ? "Unlock " + esc(c.name) : "Unlock character") + "</span>";
      }
      return '<span class="ach-reward">' + esc(a.rewardType.replace("Bonus", "")) + " +" + a.statBonus + "</span>";
    }
    function card(a) {
      var mode = (a.modeRequirement && a.modeRequirement !== "Any") ? '<span class="badge">' + esc(a.modeRequirement) + "</span>" : "";
      return '<div class="ach-card"><div class="ach-ico">&#127942;</div>' +
        '<div class="ach-body"><h4>' + esc(a.name) + "</h4><p>" + esc(a.description) + "</p>" +
        '<div class="ach-foot">' + reward(a) + mode + "</div></div></div>";
    }
    var modes = ["All", "Normal", "Hard", "Any"];
    app.innerHTML =
      '<div class="page-head"><h1>Achievements</h1><p>' + d.achievements.length + " goals &amp; rewards</p></div>" +
      '<div class="tabs" id="tabs">' + modes.map(function (m, i) { return '<button class="tab' + (i === 0 ? " active" : "") + '" data-m="' + m + '">' + m + "</button>"; }).join("") + "</div>" +
      '<div class="toolbar"><input type="search" id="q" placeholder="Search achievements&#8230;"><span class="result-count" id="rc"></span></div>' +
      '<div class="ach-grid" id="grid"></div>';
    var grid = $("#grid", app), rc = $("#rc", app), qi = $("#q", app), mode = "All", q = "";
    function apply() {
      var out = list.filter(function (a) {
        if (q && (a.name + " " + a.description).toLowerCase().indexOf(q) < 0) return false;
        if (mode === "All") return true;
        return a.modeRequirement === mode;
      });
      grid.innerHTML = out.length ? out.map(card).join("") : '<div class="empty" style="grid-column:1/-1">No matches.</div>';
      rc.textContent = out.length + " / " + list.length;
    }
    qi.addEventListener("input", function () { q = qi.value.toLowerCase(); apply(); });
    Array.prototype.forEach.call(app.querySelectorAll("#tabs .tab"), function (btn) {
      btn.addEventListener("click", function () {
        mode = btn.getAttribute("data-m");
        Array.prototype.forEach.call(app.querySelectorAll("#tabs .tab"), function (b) { b.classList.remove("active"); });
        btn.classList.add("active"); apply();
      });
    });
    apply();
  };

  /* ---- Sets ---- */
  PAGES.sets = function (app, d) {
    var groups = {};
    d.items.forEach(function (it) { if (it.setName) (groups[it.setName] = groups[it.setName] || []).push(it); });
    var names = Object.keys(groups).sort(function (a, b) { return a.localeCompare(b); });
    app.innerHTML =
      '<div class="page-head"><h1>Item Sets</h1><p>' + names.length + " sets &#8212; wearing a set's pieces together grants its bonus (incl. bonus drop rate).</p></div>" +
      (names.length ? '<div class="set-grid">' + names.map(function (n) {
        var mates = groups[n];
        return '<div class="set-card"><h3>' + esc(n) + ' <span class="set-count">' + mates.length + " pieces</span></h3>" +
          '<div class="effect-list">' + mates.map(function (it) {
            return '<a class="fx" href="items.html?id=' + encodeURIComponent(it.id) + '">' + esc(it.name) +
              ' <span style="color:var(--faint)">' + esc(it.type) + "</span></a>";
          }).join("") + "</div></div>";
      }).join("") + "</div>" : '<div class="empty">No item sets in the current data.</div>');
  };

  /* ---------- loading + back-to-top ---------- */
  function showLoading(app) {
    app.innerHTML = '<div class="loading"><div class="spinner"></div><p>Loading game data&#8230;</p></div>';
  }
  function mountBackToTop() {
    var b = document.createElement("button");
    b.id = "toTop"; b.className = "to-top"; b.type = "button";
    b.setAttribute("aria-label", "Back to top");
    b.innerHTML = "&#8593;";
    b.addEventListener("click", function () { window.scrollTo({ top: 0, behavior: "smooth" }); });
    document.body.appendChild(b);
    function upd() { b.classList.toggle("show", (window.pageYOffset || 0) > 400); }
    window.addEventListener("scroll", upd, { passive: true }); upd();
  }

  /* ---------- shared list view ---------- */
  function sb(k, v) { return '<div class="statbox"><div class="k">' + k + '</div><div class="v">' + v + "</div></div>"; }
  function pct(f) { return Math.round((f || 0) * 100) + "%"; }
  function backLink(page, label) { return '<a class="back" href="' + page + '">&#8592; All ' + label + "</a>"; }
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
    var q = "", tabIdx = 0;
    // Remember tab / search / filters / scroll per page so Back returns to the same view.
    var SKEY = "tw-list:" + cfg.page;
    var saved = {}, back = isBackNav();
    try { saved = JSON.parse(sessionStorage.getItem(SKEY) || "{}") || {}; } catch (e) {}
    // Only restore the saved view (tab / search / filters / scroll) on Back/Forward. A fresh nav
    // click (e.g. Items -> Monsters) starts clean: default tab, no filters, top of page.
    if (back) {
      if (cfg.tabs && typeof saved.tab === "number" && saved.tab >= 0 && saved.tab < cfg.tabs.length) tabIdx = saved.tab;
      if (typeof saved.q === "string") q = saved.q;
      if (saved.filters) for (var fk in saved.filters) if (fk in active) active[fk] = saved.filters[fk];
    }
    var tabsHtml = cfg.tabs ? '<div class="tabs" id="tabs">' + cfg.tabs.map(function (t, i) {
      return '<button class="tab' + (i === tabIdx ? " active" : "") + '" data-i="' + i + '">' + esc(t.label) + "</button>";
    }).join("") + "</div>" : "";
    app.innerHTML =
      '<div class="page-head"><h1>' + esc(cfg.title) + "</h1><p>" + esc(cfg.subtitle) + "</p></div>" +
      tabsHtml +
      '<div class="toolbar">' +
        (cfg.search ? '<input type="search" id="q" placeholder="Search&#8230;">' : "") +
        (cfg.filters || []).map(function (f) {
          return '<select data-key="' + f.key + '"><option value="">' + f.label + ': All</option>' +
            f.values.map(function (v) { return '<option value="' + esc(v) + '"' + (active[f.key] === v ? " selected" : "") + ">" + esc(v) + "</option>"; }).join("") + "</select>";
        }).join("") +
        '<span class="result-count" id="rc"></span>' +
      "</div>" +
      '<div class="grid" id="grid"></div>';

    var grid = $("#grid", app), rc = $("#rc", app);
    function apply() {
      var tab = cfg.tabs ? cfg.tabs[tabIdx] : null;
      var base = (tab && tab.test) ? cfg.items.filter(tab.test) : cfg.items;
      var out = base.filter(function (x) {
        if (q && cfg.search(x).toLowerCase().indexOf(q) < 0) return false;
        for (var key in active) if (active[key] && cfg.filters) {
          var f = cfg.filters.filter(function (ff) { return ff.key === key; })[0];
          if (f && f.get(x) !== active[key]) return false;
        }
        return true;
      });
      grid.innerHTML = out.length ? out.map(function (x) { return cfg.card(x, tab); }).join("") : '<div class="empty" style="grid-column:1/-1">No matches.</div>';
      rc.textContent = out.length + " / " + base.length;
    }
    var qi = $("#q", app);
    if (qi) { qi.value = q; qi.addEventListener("input", function () { q = qi.value.toLowerCase(); apply(); }); }
    Array.prototype.forEach.call(app.querySelectorAll("select[data-key]"), function (sel) {
      sel.addEventListener("change", function () { active[sel.getAttribute("data-key")] = sel.value || null; apply(); });
    });
    Array.prototype.forEach.call(app.querySelectorAll("#tabs .tab"), function (btn) {
      btn.addEventListener("click", function () {
        tabIdx = +btn.getAttribute("data-i");
        Array.prototype.forEach.call(app.querySelectorAll("#tabs .tab"), function (b) { b.classList.remove("active"); });
        btn.classList.add("active"); apply(); window.scrollTo(0, 0);
      });
    });
    // Persist the view (incl. scroll) right before navigating into a detail page.
    window.addEventListener("pagehide", function () {
      try { sessionStorage.setItem(SKEY, JSON.stringify({ tab: tabIdx, q: q, filters: active, scrollY: window.pageYOffset || 0 })); } catch (e) {}
    });
    apply();
    // Only restore scroll when returning via Back/Forward; fresh visits start at the top.
    if (back && saved.scrollY) { var y = saved.scrollY; requestAnimationFrame(function () { window.scrollTo(0, y); }); }
    else window.scrollTo(0, 0);
  }

  /* ---------- side ad rails (Google AdSense — web) ----------
     To go live after AdSense approval: set AD_CLIENT to your publisher id
     ("ca-pub-XXXXXXXXXXXXXXXX") and the two slot ids. Until then the rails show a
     subtle placeholder on wide screens so the 3-column layout is visible. Rails are
     fixed in the outer margins and hidden below 1600px (they'd overlap content). */
  /* ---------- ads ---------- */
  // Google AdSense **Auto ads**: the loader <script> (ca-pub-1837000267504503) is in every
  // page's <head> and Google places ads automatically — no per-unit code needed here.

  /* ---------- theme toggle ---------- */
  var SUN = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5 5l1.4 1.4M17.6 17.6L19 19M19 5l-1.4 1.4M6.4 17.6L5 19"/></svg>';
  var MOON = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z"/></svg>';
  function curTheme() { return document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark"; }
  function applyTheme(t) {
    document.documentElement.setAttribute("data-theme", t);
    try { localStorage.setItem("tw-theme", t); } catch (e) {}
    var b = document.getElementById("themeToggle"); if (b) b.innerHTML = t === "dark" ? SUN : MOON;
  }
  function mountTheme() {
    var b = document.createElement("button");
    b.id = "themeToggle"; b.className = "theme-toggle"; b.type = "button";
    b.setAttribute("aria-label", "Toggle light and dark theme");
    b.innerHTML = curTheme() === "dark" ? SUN : MOON;
    b.addEventListener("click", function () { applyTheme(curTheme() === "dark" ? "light" : "dark"); });
    document.body.appendChild(b);
  }

  /* ---------- boot ---------- */
  document.addEventListener("DOMContentLoaded", function () {
    var page = document.body.getAttribute("data-page") || "home";
    mountTheme();
    var fav = document.createElement("link");
    fav.rel = "icon"; fav.href = IMG_BASE + "app_icon.png";
    document.head.appendChild(fav);
    buildChrome(page);
    mountBackToTop();
    var app = $("#app");
    if (app && PAGES[page]) {
      showLoading(app);
      loadData().then(function (d) { PAGES[page](app, d); }).catch(function (e) { fail(app, e); });
    }
  });
})();
