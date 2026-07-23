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
    { id: "game-data",    label: "Data Notes",  href: "game-data.html" },
    { id: "patch",        label: "Patch Notes", href: "patch.html" },
    { id: "faq",          label: "FAQ",         href: "faq.html" },
    { id: "about",        label: "About",       href: "/about.html" }
  ];

  var PRIMARY_NAV = ["home", "guide", "maps", "items", "monsters"];
  var PAGE_PRESENTATION = {
    monsters:     { icon: "&#128058;", kicker: "Bestiary", accent: "#6fd08c" },
    bosses:       { icon: "&#9760;", kicker: "Boss Archive", accent: "#ff766d" },
    items:        { icon: "&#9876;", kicker: "Loot Library", accent: "#ffcf6b" },
    sets:         { icon: "&#10022;", kicker: "Build Workshop", accent: "#b994ff" },
    maps:         { icon: "&#128506;", kicker: "World Atlas", accent: "#64b5f6" },
    characters:   { icon: "&#9823;", kicker: "Roster", accent: "#62d9d0" },
    achievements: { icon: "&#127942;", kicker: "Milestones", accent: "#f3b95f" }
  };

  var IMG_BASE = "assets/img/";
  var DATA_URL = "data/data.json";
  var WIKI_VERSION = "24";

  // Add the final store listing URLs here when each release is live. Empty URLs
  // intentionally render as "Coming soon" so visitors never hit a broken page.
  var STORE_LINKS = {
    ios: "",
    android: ""
  };

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

  function trackEvent(name, params) {
    if (typeof window.gtag !== "function") return;
    window.gtag("event", name, params || {});
  }

  function storeButton(platform, eyebrow, label, url) {
    var icon = platform === "ios" ? "iOS" : "AOS";
    var content = '<span class="store-icon" aria-hidden="true">' + icon + '</span>' +
      '<span class="store-copy"><small>' + eyebrow + '</small><strong>' + label + '</strong></span>' +
      (url ? '<span class="store-arrow" aria-hidden="true">&#8599;</span>' : '<span class="store-soon">Coming soon</span>');
    if (url) {
      return '<a class="store-button is-live" data-store-platform="' + platform + '" href="' + esc(url) + '" target="_blank" rel="noopener noreferrer" ' +
        'aria-label="' + esc(label) + ' (opens in a new tab)">' + content + '</a>';
    }
    return '<span class="store-button is-pending" aria-label="' + esc(label) + ' coming soon">' + content + '</span>';
  }

  function pageHero(page, title, subtitle, count) {
    var key = String(page || "").replace(/\.html$/, "");
    var meta = PAGE_PRESENTATION[key] || { icon: "IL", kicker: "Field Index", accent: "var(--accent)" };
    return '<section class="catalog-head" style="--page-accent:' + meta.accent + '">' +
      '<div class="catalog-icon" aria-hidden="true">' + meta.icon + '</div>' +
      '<div class="catalog-copy"><span class="catalog-kicker">' + meta.kicker + '</span>' +
      '<h1>' + esc(title) + '</h1><p>' + esc(subtitle) + '</p></div>' +
      (count ? '<div class="catalog-total"><strong>' + esc(count) + '</strong><span>entries</span></div>' : '') +
      '</section>';
  }

  /* ---------- Normal / Hard mode state ---------- */
  var GAME_MODE_KEY = "tw-game-mode";
  function isHardEnemy(e) { return !!(e && /_H$/.test(e.id || "")); }
  function isHardZone(z) { return !!(z && /_HM_Z/.test(z.id || "")); }
  function selectedGameMode(fallback) {
    var queryMode = String(param("mode") || "").toLowerCase();
    if (queryMode === "normal" || queryMode === "hard") return queryMode;
    var saved = "";
    try { saved = localStorage.getItem(GAME_MODE_KEY) || ""; } catch (_) {}
    return saved === "hard" || saved === "normal" ? saved : (fallback || "normal");
  }
  function rememberGameMode(mode, syncUrl) {
    if (mode !== "normal" && mode !== "hard") return;
    try { localStorage.setItem(GAME_MODE_KEY, mode); } catch (_) {}
    if (syncUrl && window.history && window.history.replaceState) {
      var url = new URL(window.location.href);
      url.searchParams.set("mode", mode);
      window.history.replaceState(null, "", url.pathname + url.search + url.hash);
    }
  }
  function modeTabsHtml(mode, availability, label) {
    availability = availability || { normal: true, hard: true };
    return '<div class="mode-tabs" role="tablist" aria-label="' + esc(label || "Game mode") + '">' +
      ["normal", "hard"].map(function (m) {
        var active = mode === m, available = availability[m] !== false;
        return '<button type="button" class="mode-tab' + (active ? " active" : "") + '" data-game-mode="' + m + '" role="tab"' +
          ' aria-selected="' + (active ? "true" : "false") + '"' + (!available ? ' disabled aria-disabled="true"' : '') + '>' +
          (m === "hard" ? "Hard Mode" : "Normal Mode") + '</button>';
      }).join("") + '</div>';
  }
  function wireModeTabs(root, mode, render) {
    Array.prototype.forEach.call(root.querySelectorAll(".mode-tab[data-game-mode]"), function (btn) {
      btn.addEventListener("click", function () {
        if (btn.disabled) return;
        var next = btn.getAttribute("data-game-mode");
        if (next === mode) return;
        rememberGameMode(next, true);
        render(next);
        window.scrollTo(0, 0);
      });
    });
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
  function itemPrimaryStat(i) {
    if (i.type === "Weapon") return Number(i.bonusATK) || 0;
    if (i.type === "Armor" || i.type === "Helmet" || i.type === "Shoes") return Number(i.bonusHP) || 0;
    return Math.max(Number(i.bonusATK) || 0, Number(i.bonusHP) || 0);
  }
  function itemPrimaryLabel(i) {
    if (i.type === "Weapon") return "ATK";
    if (i.type === "Armor" || i.type === "Helmet" || i.type === "Shoes") return "HP";
    return (Number(i.bonusATK) || 0) >= (Number(i.bonusHP) || 0) ? "ATK" : "HP";
  }
  function itemStatCompare(field, direction) {
    return function (a, b) {
      var av = field === "primary" ? itemPrimaryStat(a) : Number(a[field]) || 0;
      var bv = field === "primary" ? itemPrimaryStat(b) : Number(b[field]) || 0;
      if (av !== bv) return (av - bv) * direction;
      return String(a.name).localeCompare(String(b.name));
    };
  }
  function itemList(d) {
    var types = { Weapon: 0, Armor: 1, Helmet: 2, Shoes: 3, Accessory: 4 };
    return d.items.slice().sort(function (a, b) {
      var ta = types[a.type] == null ? 9 : types[a.type], tb = types[b.type] == null ? 9 : types[b.type];
      if (ta !== tb) return ta - tb;
      var statDelta = itemPrimaryStat(a) - itemPrimaryStat(b);
      return statDelta || String(a.name).localeCompare(String(b.name));
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
      var primary = NAV.filter(function (n) { return PRIMARY_NAV.indexOf(n.id) >= 0; }).sort(function (a, b) {
        return PRIMARY_NAV.indexOf(a.id) - PRIMARY_NAV.indexOf(b.id);
      });
      var secondary = NAV.filter(function (n) { return PRIMARY_NAV.indexOf(n.id) < 0; });
      var links = primary.map(function (n) {
        return '<a href="' + n.href + '"' + (n.id === active ? ' class="active" aria-current="page"' : "") + ">" + n.label + "</a>";
      }).join("");
      var secondaryActive = secondary.some(function (n) { return n.id === active; });
      var moreLinks = secondary.map(function (n) {
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
          '<nav class="nav-links" id="navLinks" aria-label="Wiki navigation">' + links +
            '<details class="nav-more"' + (secondaryActive ? ' data-active="true"' : '') + '>' +
              '<summary>More <span aria-hidden="true">&#9662;</span></summary>' +
              '<div class="nav-more-menu">' + moreLinks + '</div>' +
            '</details>' +
          "</nav>" +
        "</div>";
      var tgl = $("#navToggle", header), nl = $("#navLinks", header);
      if (tgl && nl) {
        tgl.addEventListener("click", function () {
          var open = nl.classList.toggle("open");
          tgl.setAttribute("aria-expanded", open ? "true" : "false");
        });
        nl.addEventListener("click", function (e) {
          if (e.target.tagName === "A") {
            nl.classList.remove("open");
            tgl.setAttribute("aria-expanded", "false");
          }
        });
      }
    }
    var footer = $("#site-footer");
    if (footer) {
      footer.innerHTML =
        'Tony Works &#8212; companion wiki for <strong>Infinite Loot-Loop</strong>. ' +
        '<a href="/about.html">About</a> &#183; <a href="game-data.html">Data notes</a> &#183; ' +
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
      if (window.TWI18n) window.TWI18n.localizeGameData(d);
      d._itemById = index(d.items); d._enemyById = index(d.enemies);
      d._bossById = index(d.bosses); d._charById = index(d.characters);
      d._mapById = index(d.maps);
      _data = d; return d;
    });
  }
  function index(arr) { var m = {}; (arr || []).forEach(function (x) { m[x.id] = x; }); return m; }

  function fail(app, err) {
    app.innerHTML =
      '<div class="notice" role="status"><strong>The live catalog is temporarily unavailable.</strong><br>' +
      'The developer-written information below remains available. Please try the interactive catalog again later, ' +
      'or use the <a href="guide.html">field guide</a> while data refreshes.</div>';
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
      ["monsters.html", "&#128126;", "Monsters", c.enemies, "Stats, locations and drop tables", "#6fd08c"],
      ["bosses.html", "&#9760;&#65039;", "Bosses", c.bosses, "Normal and Hard Mode rewards", "#ff766d"],
      ["items.html", "&#9876;&#65039;", "Items", c.items, "Gear, effects and rarity", "#ffcf6b"],
      ["maps.html", "&#128506;&#65039;", "Maps", c.maps, "World connections and routes", "#64b5f6"],
      ["characters.html", "&#129489;", "Characters", c.characters, "Roster and stat multipliers", "#62d9d0"],
      ["guide.html", "&#128214;", "Field Guide", null, "Progression, stats and strategy", "#b994ff"]
    ];
    var resources = [
      ["sets.html", "Item Sets", "Build complete equipment bonuses"],
      ["achievements.html", "Achievements", "Track goals and permanent rewards"],
      ["patch.html", "Patch Notes", "See the latest changes"],
      ["faq.html", "FAQ", "Get quick player answers"]
    ];
    app.innerHTML =
      '<section class="hero game-hero">' +
        '<div class="hero-copy"><span class="hero-kicker">Official companion wiki</span>' +
        '<h1>Infinite <span class="grad">Loot-Loop</span></h1>' +
        '<p>Find drops, explore routes, compare gear and plan your next run with data exported directly from the game.</p>' +
        '<div class="hero-actions"><a class="hero-primary" href="guide.html">Start with the guide <span aria-hidden="true">&#8594;</span></a>' +
          '<a class="hero-secondary" href="#explore">Explore the wiki</a></div>' +
        '<div class="launch-line"><span class="download-dot" aria-hidden="true"></span><strong>Mobile launch:</strong> iOS &amp; Android coming soon</div></div>' +
      "</section>" +
      '<section class="home-search home-search-featured" aria-labelledby="wiki-search-title"><div class="home-search-copy"><span class="section-kicker">Quick lookup</span>' +
        '<h2 id="wiki-search-title">What are you looking for?</h2><p>Jump straight to a monster, boss, item or character.</p></div>' +
        '<div class="home-search-box"><label class="sr-only" for="gsearch">Search the wiki</label><span aria-hidden="true">&#128269;</span>' +
          '<input type="search" id="gsearch" autocomplete="off" placeholder="Search the wiki&#8230;"></div>' +
        '<div class="g-results" id="gresults" aria-live="polite"></div></section>' +
      '<section class="starter-panel" aria-labelledby="starter-title">' +
        '<div class="starter-intro"><span class="starter-kicker">First run</span><h2 id="starter-title">New to Infinite Loot-Loop?</h2>' +
        '<p>Learn the essentials, choose your playstyle and enter your first route with a plan.</p></div>' +
        '<div class="starter-steps">' +
          '<a href="guide.html"><span class="starter-num">01</span><span><strong>Learn the loop</strong><small>AP, battles, death and permanent progress</small></span><span class="starter-go" aria-hidden="true">&#8594;</span></a>' +
          '<a href="characters.html"><span class="starter-num">02</span><span><strong>Choose a character</strong><small>Compare starters and stat multipliers</small></span><span class="starter-go" aria-hidden="true">&#8594;</span></a>' +
          '<a href="items.html"><span class="starter-num">03</span><span><strong>Understand gear</strong><small>Stats, rarity, drops and equipment sets</small></span><span class="starter-go" aria-hidden="true">&#8594;</span></a>' +
          '<a href="maps.html"><span class="starter-num">04</span><span><strong>Plan your route</strong><small>World connections, zones and bosses</small></span><span class="starter-go" aria-hidden="true">&#8594;</span></a>' +
        '</div>' +
      '</section>' +
      '<section class="home-explore" id="explore" aria-labelledby="explore-title"><div class="section-head"><div><span class="section-kicker">Game database</span>' +
        '<h2 id="explore-title">Explore the wiki</h2></div><div class="stat-strip">' +
        stat(c.enemies, "Monsters") + stat(c.items, "Items") + stat(c.maps, "Maps") + stat(c.characters, "Characters") +
      '</div></div><div class="hub-grid">' + cards.map(function (x) {
        return '<a class="hub-card" href="' + x[0] + '" style="--hub-accent:' + x[5] + '">' +
          '<div class="ico">' + x[1] + "</div>" +
          '<span class="hub-go" aria-hidden="true">&#8594;</span><h3>' + x[2] + "</h3>" +
          (x[3] != null ? '<div class="count">' + x[3] + " entries</div>" : "") +
          "<p>" + x[4] + "</p></a>";
      }).join("") + '</div></section>' +
      '<section class="home-resources" aria-labelledby="resources-title"><div class="section-head compact"><div><span class="section-kicker">Keep exploring</span>' +
        '<h2 id="resources-title">More resources</h2></div></div><div class="resource-row">' + resources.map(function (x) {
          return '<a href="' + x[0] + '"><span><strong>' + x[1] + '</strong><small>' + x[2] + '</small></span><span aria-hidden="true">&#8594;</span></a>';
        }).join("") + '</div></section>' +
      '<aside class="home-status" aria-label="Game and wiki status"><div><span class="status-dot" aria-hidden="true"></span><span><small>Current game build</small><strong>' + esc(d.gameVersion || "Development") + '</strong></span></div>' +
        '<div><span><small>Wiki refreshed</small><strong>' + esc(formatDate(d.generatedAt)) + '</strong></span></div>' +
        '<div><span><small>Mobile release</small><strong>iOS &amp; Android coming soon</strong></span></div>' +
        '<a href="patch.html">Read latest patch notes &#8594;</a></aside>' +
      "";
    function stat(n, l) { return '<div class="stat"><div class="n">' + (n || 0) + '</div><div class="l">' + l + "</div></div>"; }
    function formatDate(value) {
      if (!value) return "Not available";
      try { return new Intl.DateTimeFormat(window.TWI18n ? window.TWI18n.code : undefined, { year: "numeric", month: "short", day: "numeric" }).format(new Date(value)); }
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
        { label: "Normal Mode", mode: "normal", test: function (e) { return !isHardEnemy(e); } },
        { label: "Hard Mode", mode: "hard", test: function (e) { return isHardEnemy(e); } }
      ],
      search: function (e) { return e.name + " " + e.id + " " + (e.worlds || []).join(" ") + " " + areaNames(d, e.areas).join(" "); },
      filters: [
        { key: "area", label: "Area",
          options: (d.areas || []).map(function (a) {
            return { value: a.code, label: a.name + " (" + a.code + ")", group: a.world };
          }),
          get: function (e) { return e.areas || []; } }
      ],
      card: function (e) {
        // Show the exact maps it spawns on (Dark Forest), not just the world (Forest).
        var where = areaNames(d, e.areas);
        return cardShell("monsters.html", e.id, e.image, e.name,
          tierBadge(e.worlds) +
          '<span class="badge">Lv ' + rng(e.minLevel, e.maxLevel) + "</span>" +
          (where.length ? '<span class="badge">' + esc(where.join(", ")) + "</span>" : "") +
          '<span class="meta">HP ' + rng(e.hpMin, e.hpMax) + " &#183; ATK " + rng(e.atkMin, e.atkMax) + "</span>");
      }
    });
  };
  // Monster counter-stats (resist model). FIXED per monster — the number a player must out-grow.
  // critResist/comboResist/critMultResist beyond what the player has zeroes that effect; a crit
  // resist above 100% means you need >100% crit chance (tiered-crit territory) just to land one.
  var RESIST_LABELS = {
    critResist: "Crit resist", comboResist: "Combo resist", dodgeResist: "Dodge resist",
    critMultResist: "Crit-dmg resist", armorPierce: "Armor pierce", weaken: "Weaken"
  };
  function resistRows(r) {
    if (!r) return "";
    return Object.keys(RESIST_LABELS).filter(function (k) { return (r[k] || 0) > 0; }).map(function (k) {
      var v = r[k];
      // critMultResist is a flat multiplier reduction (e.g. -0.50x); the rest are percentages.
      var disp = k === "critMultResist" ? ("−" + v.toFixed(2) + "x") : (Math.round(v * 100) + "%");
      return sb(RESIST_LABELS[k], disp);
    }).join("");
  }
  function resistSection(r, title) {
    var rows = resistRows(r);
    if (!rows) return "";
    return '<div class="section-title">' + (title || "Resistances") + "</div>" +
      '<div class="statgrid">' + rows + "</div>";
  }

  function monsterDetail(app, d, e, forcedMode) {
    if (!e) return notFound(app, "monsters.html", "Monsters");
    var normal = isHardEnemy(e) ? d._enemyById[String(e.id).replace(/_H$/, "")] : e;
    var hard = isHardEnemy(e) ? e : d._enemyById[e.id + "_H"];
    var queryMode = String(param("mode") || "").toLowerCase();
    var mode = forcedMode || ((queryMode === "normal" || queryMode === "hard") ? queryMode : (isHardEnemy(e) ? "hard" : "normal"));
    if (mode === "hard" && !hard) mode = "normal";
    if (mode === "normal" && !normal) mode = "hard";
    var selected = mode === "hard" ? hard : normal;
    rememberGameMode(mode, false);
    var worlds = selected.worlds || [], zones = selected.zoneNames || [], drops = selected.drops || [];
    var lvLabel = selected.minLevel === selected.maxLevel ? ("Lv " + selected.minLevel) : ("Lv " + selected.minLevel + "&#8211;" + selected.maxLevel);
    var navList = monsterList(d).filter(function (x) { return isHardEnemy(x) === (mode === "hard"); });
    app.innerHTML = detailHead("monsters.html", "Monsters", navList, selected) +
      '<div class="detail">' + portrait(selected.image, selected.name) +
      "<div><h1>" + esc(selected.name) + "</h1>" +
      modeTabsHtml(mode, { normal: !!normal, hard: !!hard }, "Monster mode") +
      '<div class="tags"><span class="pill mode-pill ' + mode + '">' + (mode === "hard" ? "Hard Mode" : "Normal Mode") + '</span>' +
        '<span class="pill">Level ' + rng(selected.minLevel, selected.maxLevel) + "</span>" +
        (selected.isBoss ? '<span class="pill" style="color:var(--bad)">Boss</span>' : "") +
        (selected.permanentBPReward ? '<span class="pill">+' + selected.permanentBPReward + " AP</span>" : "") + "</div>" +
      '<div class="section-title">Stats (' + lvLabel + ")</div>" +
      '<div class="statgrid">' +
        sb("HP", rng(selected.hpMin, selected.hpMax)) + sb("ATK", rng(selected.atkMin, selected.atkMax)) +
        sb("EXP", rng(selected.expMin, selected.expMax)) + sb("Gold", rng(selected.goldMin, selected.goldMax)) +
      "</div>" +
      resistSection(selected.resists, "Resistances") +
      (worlds.length
        ? '<div class="section-title">Appears in</div><div class="effect-list">' +
            worlds.map(function (w) { return '<a class="fx region-link" data-region="' + esc(w) + '" href="maps.html?world=' + encodeURIComponent(w) + '&mode=' + mode + '">' + esc(w) + "</a>"; }).join("") + "</div>" +
            (zones.length ? '<p style="color:var(--faint);font-size:.85rem;margin-top:.5rem">' + esc(zones.join(" · ")) + "</p>" : "")
        : "") +
      (drops.length ? '<div class="section-title">Drops</div><table class="data"><tr><th>Item</th><th>Chance</th></tr>' +
        drops.map(function (x) { return "<tr><td>" + link("items.html", x.itemId, x.itemName || x.itemId) + "</td><td>" + x.chance + "%</td></tr>"; }).join("") + "</table>" : "") +
      "</div></div>";
    wireModeTabs(app, mode, function (next) { monsterDetail(app, d, selected, next); });
  }

  /* ---- Bosses ---- */
  PAGES.bosses = function (app, d) {
    var id = param("id");
    if (id) return bossDetail(app, d, d._bossById[id]);
    var list = bossList(d);
    listView(app, d, {
      items: list, page: "bosses.html", title: "Bosses", subtitle: d.bosses.length + " bosses",
      tabs: [ { label: "Normal Mode", mode: "normal" }, { label: "Hard Mode", mode: "hard" } ],
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
  function bossDetail(app, d, b, forcedMode) {
    if (!b) return notFound(app, "bosses.html", "Bosses");
    var map = d._mapById[b.mapId];
    function itemLink(id) { var it = d._itemById[id]; return it ? link("items.html", id, it.name) : esc(id); }
    var hasHard = b.hardModeHp || b.hardModeAtk || b.hardModeDropItemId;
    var mode = forcedMode || selectedGameMode("normal");
    if (mode === "hard" && !hasHard) mode = "normal";
    rememberGameMode(mode, false);
    function stats(mode) {
      var hard = mode === "hard";
      var hp = hard && b.hardModeHp ? b.hardModeHp : b.hp;
      var atk = hard && b.hardModeAtk ? b.hardModeAtk : b.atk;
      var dropId = (hard && b.hardModeDropItemId) ? b.hardModeDropItemId : b.dropItemId;
      var res = hard ? b.hardModeResists : b.resists;
      return '<div class="statgrid">' + sb("HP", fmt(hp)) + sb("ATK", fmt(atk)) + "</div>" +
        resistSection(res, "Resistances") +
        '<div class="section-title">Drops</div><table class="data"><tr><th>Type</th><th>Item</th><th>Base chance</th></tr>' +
          (dropId ? "<tr><td>" + (hard ? "Hard" : "Normal") + "</td><td>" + itemLink(dropId) + "</td><td>" + bossDropChance(b, hard ? "Hard" : "Normal") + "%</td></tr>" : "") +
          (b.bonusDropItemId ? "<tr><td>Bonus</td><td>" + itemLink(b.bonusDropItemId) + "</td><td>" + bossDropChance(b, hard ? "Hard" : "Normal") + "%</td></tr>" : "") +
        "</table>";
    }
    app.innerHTML = detailHead("bosses.html", "Bosses", bossList(d), b) +
      '<div class="detail">' + portrait(b.image, b.name) +
      "<div><h1>" + esc(b.name) + "</h1>" +
      '<div class="tags"><span class="pill">Level ' + b.level + "</span>" +
        (b.mapId ? '<span class="pill">' + (map
          ? '<a href="maps.html?id=' + encodeURIComponent(b.mapId) + '&mode=' + mode + '">' + esc(map.name) + "</a>"
          : esc(b.mapId)) + "</span>" : "") +
        '<span class="pill">EXP ' + fmt(b.exp) + "</span></div>" +
      modeTabsHtml(mode, { normal: true, hard: !!hasHard }, "Boss mode") +
      '<div id="bstats">' + stats(mode) + "</div>" +
      "</div></div>";
    wireModeTabs(app, mode, function (next) { bossDetail(app, d, b, next); });
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
      tabs: [
        { label: "Normal Mode", mode: "normal", test: function (i) { return !i.isHardModeItem; } },
        { label: "Hard Mode", mode: "hard", test: function (i) { return i.isHardModeItem; } }
      ],
      search: function (i) { return i.name + " " + i.id + " " + (i.setName || ""); },
      filters: [
        { key: "type",   label: "Type",   values: types,              get: function (i) { return i.type; } },
        { key: "rarity", label: "Rarity", values: rarities,           get: function (i) { return i.rarity; } },
        // Where can I get this? Matches field drops, boss rewards AND shop stock for the area.
        { key: "area", label: "Area",
          options: (d.areas || []).map(function (a) {
            return { value: a.code, label: a.name + " (" + a.code + ")", group: a.world };
          }),
          get: function (i) { return (i.dropAreas || []).concat(i.shopAreas || []); } }
      ],
      defaultSort: "primary-asc",
      sorts: [
        { key: "primary-asc", label: "Main stat: Low to high", compare: itemStatCompare("primary", 1) },
        { key: "atk-asc", label: "ATK: Low to high", compare: itemStatCompare("bonusATK", 1) },
        { key: "atk-desc", label: "ATK: High to low", compare: itemStatCompare("bonusATK", -1) },
        { key: "hp-asc", label: "HP: Low to high", compare: itemStatCompare("bonusHP", 1) },
        { key: "hp-desc", label: "HP: High to low", compare: itemStatCompare("bonusHP", -1) }
      ],
      card: function (i) {
        var mainLabel = itemPrimaryLabel(i), mainValue = itemPrimaryStat(i);
        var eff = (i.effects || []).slice(0, 2).join(" · ");
        return '<a class="card rar item-card" href="items.html?id=' + encodeURIComponent(i.id) + '" style="border-top-color:' + rarColor(i.rarity) + '">' +
          thumb(i.image, i.name) + '<div class="body"><h4>' + esc(i.name) + "</h4>" +
          '<div class="meta"><span style="color:' + rarColor(i.rarity) + '">' + esc(i.rarity) + "</span> &#183; " + esc(i.type) + "</div>" +
          '<div class="item-main-stat"><span>' + esc(mainLabel) + '</span><strong>' + fmt(mainValue) + '</strong></div>' +
          (eff ? '<div class="meta" style="margin-top:.25rem">' + esc(eff) + "</div>" : "") + "</div></a>";
      }
    });
  };
  // "Where do I farm this?" — the areas an item can be obtained in, split by how. Each chip
  // links to that area's map page, which lists its full drop table.
  function itemAreaSection(d, i, mode) {
    var byCode = {}; (d.areas || []).forEach(function (a) { byCode[a.code] = a; });
    var drops = (i.dropAreas || []), shops = (i.shopAreas || []);
    if (!drops.length && !shops.length) return "";
    function chips(codes, tag) {
      return codes.map(function (c) {
        var a = byCode[c]; if (!a) return "";
        var label = esc(a.name) + " <small>" + esc(c) + "</small>" + (tag ? " <small>" + tag + "</small>" : "");
        return '<span class="fx">' + (a.mapId
          ? '<a href="maps.html?id=' + encodeURIComponent(a.mapId) + '&mode=' + mode + '">' + label + "</a>"
          : label) + "</span>";
      }).join("");
    }
    // Shop-only areas are listed separately so "drops here" stays truthful.
    var shopOnly = shops.filter(function (c) { return drops.indexOf(c) < 0; });
    return '<div class="section-title">Where to find it</div><div class="effect-list">' +
      chips(drops, "") + chips(shopOnly, "shop") + "</div>";
  }

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
  function itemDetail(app, d, i, forcedMode) {
    if (!i) return notFound(app, "items.html", "Items");
    var normal = i.isHardModeItem ? d._itemById[String(i.id).replace(/_H$/, "")] : i;
    var hard = i.isHardModeItem ? i : d._itemById[i.id + "_H"];
    var queryMode = String(param("mode") || "").toLowerCase();
    var mode = forcedMode || ((queryMode === "normal" || queryMode === "hard") ? queryMode : (i.isHardModeItem ? "hard" : "normal"));
    if (mode === "hard" && !hard) mode = "normal";
    if (mode === "normal" && !normal) mode = "hard";
    i = mode === "hard" ? hard : normal;
    rememberGameMode(mode, false);
    Array.prototype.forEach.call(document.querySelectorAll(".compare-tray"), function (tray) { tray.remove(); });
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
    var navList = itemList(d).filter(function (x) { return !!x.isHardModeItem === (mode === "hard"); });
    app.innerHTML = detailHead("items.html", "Items", navList, i) +
      '<div class="detail">' + portrait(i.image, i.name) +
      "<div><h1>" + esc(i.name) + "</h1>" +
      modeTabsHtml(mode, { normal: !!normal, hard: !!hard }, "Item mode") +
      '<div class="tags"><span class="pill mode-pill ' + mode + '">' + (mode === "hard" ? "Hard Mode" : "Normal Mode") + '</span>' +
        '<span class="pill" style="color:' + rarColor(i.rarity) + '">' + esc(i.rarity) + "</span>" +
        '<span class="pill">' + esc(i.type) + "</span>" +
        (i.isUnique ? '<span class="pill">Unique</span>' : "") +
        (i.isBossItem ? '<span class="pill">Boss Item</span>' : "") + "</div>" +
      '<button class="compare-add" type="button" data-compare-id="' + esc(i.id) + '">&#8644; Add to comparison</button>' +
      (i.description ? "<p>" + esc(i.description) + "</p>" : "") +
      (effects ? '<div class="section-title">Effects</div><div class="effect-list">' + effects + "</div>" : "") +
      '<div class="section-title">Details</div><div class="statgrid">' +
        (i.buyPrice > 0 && !i.shopUnavailable && i.shopAreas && i.shopAreas.length > 0
          ? sb("Buy Price", fmt(i.buyPrice) + " g")
          : sb("Availability", (i.dropAreas && i.dropAreas.length > 0) ? "Drop only" : "Not in shop")) +
        sb("Max Copies", i.type === "Accessory" ? 3 : 20) +
        (i.setName ? sb("Set", esc(i.setName)) : "") +
      "</div>" +
      itemPermTable(i) +
      setItems +
      itemAreaSection(d, i, mode) +
      (droppedBy.length ? '<div class="section-title">Dropped by</div><div class="effect-list">' +
        droppedBy.map(function (e) {
          var dr = (e.drops || []).filter(function (x) { return x.itemId === i.id; })[0];
          var ch = dr ? " (" + dr.chance + "%)" : "";
          return '<span class="fx">' + link("monsters.html", e.id, e.name) + esc(ch) + "</span>";
        }).join("") + "</div>" : "") +
      (bossDrops.length ? '<div class="section-title">Boss rewards</div><div class="effect-list">' +
        bossDrops.map(function (b) {
          var dropMode = b.hardModeDropItemId === i.id ? "Hard" : b.bonusDropItemId === i.id ? "Bonus" : "Normal";
          return '<span class="fx"><a href="bosses.html?id=' + encodeURIComponent(b.id) + '&mode=' + mode + '">' + esc(b.name) + "</a>" +
            " (" + bossDropChance(b, dropMode === "Hard" ? "Hard" : (mode === "hard" ? "Hard" : "Normal")) + "%) <small>" + dropMode + "</small></span>";
        }).join("") + "</div>" : "") +
      "</div></div>";
    wireModeTabs(app, mode, function (next) { itemDetail(app, d, i, next); });
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
    "World Gate": { icon: "&#128682;", color: "#8a8f98" },
    // World Gate branch regions, reached through the hub south of Grassland.
    "Japan":      { icon: "&#9962;",    color: "#e0607a" },
    "Greek":      { icon: "&#127963;", color: "#5bc8d8" },
    "Military":   { icon: "&#128737;", color: "#7d8b5a" },
    "Heaven":     { icon: "&#10024;",  color: "#f0d264" }
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
      "CoralMaze_Map": ["GiantClamBossRoom_Map"], "DeepTrench_Map": ["MainUnderwaterBossRoom_Map"] } },
    // World Gate branch — each region is entered from the CV_01 hub and returns to it.
    "Japan": { root: "JapanVillage_Map", edges: {
      "JapanVillage_Map": ["JapanTerraces_Map"], "JapanTerraces_Map": ["JapanShrine_Map"],
      "JapanShrine_Map": ["JapanPagoda_Map"] } },
    "Greek": { root: "GreekHarbor_Map", edges: {
      "GreekHarbor_Map": ["GreekAgora_Map"],
      "GreekAgora_Map": ["GreekLabyrinth_Map", "GreekAmphitheatre_Map", "GreekGrotto_Map"],
      "GreekLabyrinth_Map": ["GreekTemple_Map"], "GreekAmphitheatre_Map": ["GreekTemple_Map"],
      "GreekGrotto_Map": ["GreekTemple_Map"] } },
    "Military": { root: "MilitaryCheckpoint_Map", edges: {
      "MilitaryCheckpoint_Map": ["MilitaryDepot_Map"], "MilitaryDepot_Map": ["MilitaryTrench_Map"],
      "MilitaryTrench_Map": ["MilitaryMinefield_Map"], "MilitaryMinefield_Map": ["MilitaryAirfield_Map"],
      "MilitaryAirfield_Map": ["MilitaryBunker_Map"], "MilitaryBunker_Map": ["MilitaryYard_Map"],
      "MilitaryYard_Map": ["MilitaryHQ_Map"] } },
    "Heaven": { root: "HeavenAscension_Map", edges: {} }
  };
  // Route prefixes are shared by a map's normal and hard-mode ZoneData assets.
  // Keeping this map-to-route table explicit prevents similarly named maps from being
  // grouped together accidentally (for example, Greek Temple and Sunken Temple Gate).
  var MAP_ZONE_ROUTES = {
    "Grassland_Map": "GL01",
    "ForestRoad_Map": "FR01", "DarkForest_Map": "FR02", "DeepForest_Map": "FR03", "AshenForest_Map": "FR04",
    "VolcanicApproach_Map": "VO01", "LavaRiverPass_Map": "VO02", "LavaCore_Map": "VO03",
    "DesertOutskirts_Map": "DS01", "DesertCrossroads_Map": "DS02", "SunBuriedCave_Map": "DS03",
    "SandstoneTunnel_Map": "DS04", "AncientBurialPassage_Map": "DS05", "DesertBossRoom_Map": "DS06",
    "ShallowCoralReef_Map": "UW01", "CoralMaze_Map": "UW02", "SunkenTempleGate_Map": "UW03",
    "DeepTrench_Map": "UW04", "GiantClamBossRoom_Map": "UW06", "MainUnderwaterBossRoom_Map": "UW07",
    "VoidHunt_Map": "VoidHunt"
  };
  // data.json ships an `areas` table (region code + its map) built from the setup tools, so prefer
  // it — a new region added there flows straight through to the site with no second table to
  // update here. MAP_ZONE_ROUTES stays as a fallback for older data.json builds.
  function routeForMap(d, mapId) {
    var areas = (d && d.areas) || [];
    for (var i = 0; i < areas.length; i++) if (areas[i].mapId === mapId) return areas[i].code;
    return MAP_ZONE_ROUTES[mapId] || null;
  }
  function zonesForMap(d, m, mode) {
    var route = m && routeForMap(d, m.id);
    if (!route) return [];
    return (d.zones || []).filter(function (z) {
      var onRoute = route === "VoidHunt"
        ? z.id === "VoidHunt_Zone" || z.id.indexOf("VoidHunt_") === 0
        : z.id.indexOf(route + "_Zone") === 0 || z.id.indexOf(route + "_HM_Z") === 0;
      if (!onRoute) return false;
      if (mode === "hard") return isHardZone(z);
      if (mode === "normal") return !isHardZone(z);
      return true;
    }).sort(function (a, b) {
      var ah = /_HM_Z/.test(a.id), bh = /_HM_Z/.test(b.id);
      if (ah !== bh) return ah ? 1 : -1;
      return a.minEnemyLevel - b.minEnemyLevel || a.name.localeCompare(b.name);
    });
  }
  function mapEncounters(d, m, mode) {
    var zones = zonesForMap(d, m, mode), seen = {}, enemies = [];
    zones.forEach(function (z) {
      (z.enemies || []).forEach(function (ze) {
        var e = d._enemyById[ze.enemyId];
        if (!e) return;
        if (!seen[e.id]) {
          seen[e.id] = { enemy: e, zones: [], hard: /_H$/.test(e.id) || /_HM_Z/.test(z.id) };
          enemies.push(seen[e.id]);
        }
        if (seen[e.id].zones.indexOf(z.name) < 0) seen[e.id].zones.push(z.name);
      });
    });
    return { zones: zones, enemies: enemies };
  }
  function mapDropItems(d, encounters) {
    var byId = {}, rows = [];
    encounters.enemies.forEach(function (entry) {
      (entry.enemy.drops || []).forEach(function (drop) {
        var row = byId[drop.itemId];
        if (!row) {
          row = byId[drop.itemId] = { item: d._itemById[drop.itemId], id: drop.itemId, name: drop.itemName || drop.itemId, sources: [] };
          rows.push(row);
        }
        row.sources.push({ enemy: entry.enemy, chance: drop.chance, hard: entry.hard });
      });
    });
    return rows.sort(function (a, b) { return a.name.localeCompare(b.name); });
  }
  // Base boss drop odds (BossData.RollDrop): 1% Normal, 0.75% Hard. A "Bonus" item rolls on the
  // same chance as the mode it belongs to. Falls back to the constants if data.json predates them.
  function bossDropChance(b, mode) {
    if (mode === "Hard") return b.hardModeDropChance != null ? b.hardModeDropChance : 0.75;
    return b.dropChance != null ? b.dropChance : 1;
  }
  function bossDropItems(d, bosses, selectedMode) {
    var rows = [];
    bosses.forEach(function (b) {
      var hard = selectedMode === "hard";
      var entries = selectedMode
        ? [[hard ? b.hardModeDropItemId : b.dropItemId, hard ? "Hard" : "Normal"], [b.bonusDropItemId, "Bonus"]]
        : [[b.dropItemId, "Normal"], [b.hardModeDropItemId, "Hard"], [b.bonusDropItemId, "Bonus"]];
      entries.forEach(function (x) {
        if (!x[0]) return;
        var item = d._itemById[x[0]];
        rows.push({ item: item, id: x[0], name: item ? item.name : x[0], boss: b, mode: x[1],
          chance: bossDropChance(b, selectedMode === "hard" || x[1] === "Hard" ? "Hard" : "Normal") });
      });
    });
    return rows;
  }
  function worldStats(d, w) {
    var ms = d.maps.filter(function (m) { return m.world === w; });
    var ids = ms.map(function (m) { return m.id; });
    var bc = d.bosses.filter(function (b) { return ids.indexOf(b.mapId) >= 0; }).length;
    return { maps: ms, bosses: bc };
  }
  function wnode(d, w, opts) {
    opts = opts || {};
    var mode = opts.mode || selectedGameMode("normal");
    var meta = WORLD_META[w] || { icon: "&#128506;", color: "var(--accent)" };
    var s = worldStats(d, w);
    var sub = opts.locked ? "Coming soon"
      : (s.maps.length + " map" + (s.maps.length !== 1 ? "s" : "") +
         (s.bosses ? " &#183; " + s.bosses + " boss" + (s.bosses > 1 ? "es" : "") : ""));
    var inner = '<span class="wicon">' + meta.icon + "</span>" +
      '<span class="wname">' + esc(w) + "</span><span class=\"wmeta\">" + sub + "</span>";
    if (opts.locked) return '<div class="wnode locked" style="--wc:' + meta.color + '">' + inner + "</div>";
    var cls = "wnode" + (opts.secret ? " secret" : "");
    return '<a class="' + cls + '" style="--wc:' + meta.color + '" href="maps.html?world=' + encodeURIComponent(w) + '&mode=' + mode + '">' + inner + "</a>";
  }
  // Region codes -> their map names ("FR02" -> "Dark Forest").
  function areaNames(d, codes) {
    if (!codes || !codes.length) return [];
    var byCode = {}; (d.areas || []).forEach(function (a) { byCode[a.code] = a; });
    return codes.map(function (c) { return byCode[c] ? byCode[c].name : c; });
  }
  // One row per MAP within a world, so Forest Road / Dark Forest / Deep Dark Forest / Ashen
  // Forest Pass are each listed and reachable rather than hidden behind a single "Forest" node.
  function areaRows(d, w, mode) {
    var meta = WORLD_META[w] || { icon: "&#128506;", color: "var(--accent)" };
    var list = (d.areas || []).filter(function (a) { return a.world === w; });
    if (!list.length) return "";
    return '<section class="area-group" style="--wc:' + meta.color + '">' +
      '<h3 class="area-group-head"><span class="wicon">' + meta.icon + '</span>' + esc(w) +
        '<small>' + list.length + " map" + (list.length !== 1 ? "s" : "") + "</small></h3>" +
      '<div class="area-rows">' + list.map(function (a) {
        var map = d._mapById[a.mapId];
        var encounters = map ? mapEncounters(d, map, mode) : { zones: [], enemies: [] };
        var mapBosses = d.bosses.filter(function (b) { return b.mapId === a.mapId; });
        var drops = mapDropItems(d, encounters).length + bossDropItems(d, mapBosses, mode).length;
        var levels = encounters.zones.map(function (z) { return [z.minEnemyLevel, z.maxEnemyLevel]; });
        var minLevel = levels.length ? Math.min.apply(null, levels.map(function (x) { return x[0]; })) : 0;
        var maxLevel = levels.length ? Math.max.apply(null, levels.map(function (x) { return x[1]; })) : 0;
        var href = a.mapId ? "maps.html?id=" + encodeURIComponent(a.mapId) + "&mode=" + mode : "maps.html?world=" + encodeURIComponent(w) + "&mode=" + mode;
        return '<a class="area-row" href="' + href + '">' +
          '<span class="area-code">' + esc(a.code) + "</span>" +
          '<span class="area-name">' + esc(a.name) + "</span>" +
          '<span class="area-meta">' + (minLevel ? "Lv " + fmt(minLevel) + "&#8211;" + fmt(maxLevel) + " &#183; " : "") +
            encounters.enemies.length + " monsters &#183; " + drops + " drops" +
            (mapBosses.length ? " &#183; " + mapBosses.length + " boss" + (mapBosses.length > 1 ? "es" : "") : "") + "</span>" +
          '<b aria-hidden="true">&#8594;</b></a>';
      }).join("") + "</div></section>";
  }
  PAGES.maps = function (app, d, forcedMode) {
    var id = param("id"); if (id) return mapDetail(app, d, d._mapById[id], forcedMode);
    var world = param("world"); if (world) return worldView(app, d, world, forcedMode);
    var mode = forcedMode || selectedGameMode("normal");
    rememberGameMode(mode, false);
    var worlds = ["Grassland", "Forest", "Volcanic", "Desert", "Underwater", "Void Hunt",
                  "Japan", "Greek", "Military", "Heaven"];
    app.innerHTML =
      pageHero("maps.html", "World Map", "Every region, connected. Choose a world to trace its maps and bosses.", d.maps.length) +
      modeTabsHtml(mode, null, "Map data mode") +
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
        '<div class="wm-cell" style="grid-area:gate">'   + wnode(d, "World Gate") + '</div>' +
        // The World Gate fans out to its four themed regions.
        '<div class="wm-conn v" style="grid-area:vg"></div>' +
        '<div class="wm-branch" style="grid-area:wg"><div class="wm-branch-bus"></div><div class="wm-branch-row">' +
          ["Japan", "Greek", "Military", "Heaven"].map(function (w) {
            return '<div class="wm-branch-item"><span class="wm-drop"></span>' + wnode(d, w) + "</div>";
          }).join("") +
        '</div></div>' +
      '</div></div><p class="route-note">Grassland is the hub &#8212; Forest &amp; Volcanic to the west, Desert east, the Underwater docks north, the World Gate south. Void Hunt is a secret arena reached from Volcanic. Through the World Gate lie Japan, Greek, Military and Heaven.</p></div>' +
      // List view = every MAP on its own row (Forest Road, Dark Forest, Deep Dark Forest …),
      // grouped under its world. The compass graph above stays world-level.
      '<div class="world-view region-list" data-panel="list">' + worlds.map(function (w) {
        return areaRows(d, w, mode);
      }).join("") + '</div>';
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
    wireModeTabs(app, mode, function (next) { PAGES.maps(app, d, next); });
  };
  function worldView(app, d, w, forcedMode) {
    var mode = forcedMode || selectedGameMode("normal");
    rememberGameMode(mode, false);
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
      var me = mapEncounters(d, m, mode), drops = mapDropItems(d, me);
      var facts = [me.enemies.length + " monster" + (me.enemies.length !== 1 ? "s" : ""), drops.length + " item drop" + (drops.length !== 1 ? "s" : "")];
      if (mb.length) facts.push(mb.length + " boss" + (mb.length !== 1 ? "es" : ""));
      var sub = facts.join(" &#183; ");
      return '<a class="mnode" data-mid="' + esc(m.id) + '" href="maps.html?id=' + encodeURIComponent(m.id) + '&mode=' + mode + '" style="--wc:' + meta.color + '">' +
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
      modeTabsHtml(mode, null, "World data mode") +
      '<div class="mchain' + (horizontal ? " h" : "") + '" style="--wc:' + meta.color + '"><svg class="mconn-svg" aria-hidden="true"></svg>' + html + '</div>';
    wireModeTabs(app, mode, function (next) { worldView(app, d, w, next); });
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
  function mapDetail(app, d, m, forcedMode) {
    if (!m) return notFound(app, "maps.html", "Maps");
    var mode = forcedMode || selectedGameMode("normal");
    rememberGameMode(mode, false);
    var bosses = d.bosses.filter(function (b) { return b.mapId === m.id; });
    var allZones = zonesForMap(d, m);
    var normalZones = allZones.filter(function (z) { return !isHardZone(z); });
    var hardZones = allZones.filter(function (z) { return isHardZone(z); });
    var encounters = mapEncounters(d, m, mode), zones = encounters.zones;
    var drops = mapDropItems(d, encounters), bossDrops = bossDropItems(d, bosses, mode);
    var levelZones = zones;
    var minLevel = levelZones.length ? Math.min.apply(null, levelZones.map(function (z) { return z.minEnemyLevel; })) : 0;
    var maxLevel = levelZones.length ? Math.max.apply(null, levelZones.map(function (z) { return z.maxEnemyLevel; })) : 0;
    var totalCells = m.walkableCells + m.blockedCells;
    var walkPct = totalCells ? Math.round(m.walkableCells / totalCells * 100) + "%" : "--";
    function sectionHead(kicker, title, count, copy) {
      return '<header class="map-section-head"><div><span class="section-kicker">' + esc(kicker) + '</span><h2>' + esc(title) + '</h2></div>' +
        (count != null ? '<span class="map-section-count">' + fmt(count) + '</span>' : '') +
        (copy ? '<p>' + esc(copy) + '</p>' : '') + '</header>';
    }
    function zoneCard(z) {
      var hard = /_HM_Z/.test(z.id), names = (z.enemies || []).map(function (ze) { return ze.enemyName || ze.enemyId; });
      return '<article class="map-zone-card" style="--zone-color:' + esc(z.color || "var(--accent)") + '">' +
        '<div class="map-zone-top"><div><h3>' + esc(z.name) + '</h3><span>Level ' + fmt(z.minEnemyLevel) + '&#8211;' + fmt(z.maxEnemyLevel) + '</span></div>' +
        '<span class="pill">' + (hard ? 'Hard' : 'Normal') + '</span></div>' +
        '<p>' + (names.length ? esc(names.join(", ")) : 'No regular encounters') + '</p></article>';
    }
    function enemyCard(entry) {
      var e = entry.enemy;
      return '<a class="map-entity-card" href="monsters.html?id=' + encodeURIComponent(e.id) + '&mode=' + mode + '">' + thumb(e.image, e.name) +
        '<div><h3>' + esc(e.name) + '</h3><p>Level ' + fmt(e.minLevel) + '&#8211;' + fmt(e.maxLevel) + ' &#183; ' + (e.drops || []).length + ' drop' + ((e.drops || []).length !== 1 ? 's' : '') + '</p>' +
        '<span>' + esc(entry.zones.join(", ")) + '</span></div><b aria-hidden="true">&#8594;</b></a>';
    }
    function dropCard(row) {
      var item = row.item;
      return '<article class="map-drop-card">' + thumb(item && item.image, row.name) + '<div><h3>' +
        (item ? link("items.html", item.id, item.name) : esc(row.name)) + '</h3>' +
        (item ? '<p><span style="color:' + rarColor(item.rarity) + '">' + esc(item.rarity) + '</span> &#183; ' + esc(item.type) + '</p>' : '') +
        '<div class="map-drop-sources">' + row.sources.map(function (s) {
          return '<span>' + link("monsters.html", s.enemy.id, s.enemy.name) + ' <strong>' + esc(s.chance) + '%</strong>' + (s.hard ? ' <small>Hard</small>' : '') + '</span>';
        }).join('') + '</div></div></article>';
    }
    function bossCard(b) {
      var hard = mode === "hard";
      var hp = hard && b.hardModeHp ? b.hardModeHp : b.hp;
      var atk = hard && b.hardModeAtk ? b.hardModeAtk : b.atk;
      var rewardId = hard && b.hardModeDropItemId ? b.hardModeDropItemId : b.dropItemId;
      var reward = d._itemById[rewardId];
      return '<a class="map-entity-card boss" href="bosses.html?id=' + encodeURIComponent(b.id) + '&mode=' + mode + '">' + thumb(b.image, b.name) +
        '<div><h3>' + esc(b.name) + '</h3><p>Level ' + fmt(b.level) + ' &#183; ' + fmt(hp) + ' HP &#183; ' + fmt(atk) + ' ATK</p>' +
        '<span>' + (reward ? 'Reward: ' + esc(reward.name) : 'Open boss details') + '</span></div><b aria-hidden="true">&#8594;</b></a>';
    }
    function bossDropCard(row) {
      var item = row.item;
      return '<article class="map-drop-card boss-drop">' + thumb(item && item.image, row.name) + '<div><h3>' +
        (item ? link("items.html", item.id, item.name) : esc(row.name)) + '</h3>' +
        (item ? '<p><span style="color:' + rarColor(item.rarity) + '">' + esc(item.rarity) + '</span> &#183; ' + esc(item.type) + '</p>' : '') +
        '<div class="map-drop-sources"><span><a href="bosses.html?id=' + encodeURIComponent(row.boss.id) + '&mode=' + mode + '">' + esc(row.boss.name) + '</a>' +
          ' <strong>' + esc(row.chance) + '%</strong> <small>' + esc(row.mode) + '</small></span></div>' +
        '</div></article>';
    }
    app.innerHTML =
      '<a class="back" href="maps.html' + (m.world ? "?world=" + encodeURIComponent(m.world) + "&mode=" + mode : "?mode=" + mode) + '">&#8592; ' + esc(m.world || "Maps") + "</a>" +
      '<section class="map-detail-hero"><div><span class="section-kicker">Map dossier</span><h1>' + esc(m.name) + '</h1>' +
        '<div class="tags">' + (m.world ? '<span class="pill">' + esc(m.world) + '</span>' : '') +
        (minLevel ? '<span class="pill">Level ' + fmt(minLevel) + '&#8211;' + fmt(maxLevel) + '</span>' : '') + '</div>' +
        '<p>Review this map\'s zones, encounters, regular item drops, bosses, and exclusive boss rewards before choosing your route.</p></div>' +
        '<div class="map-art">' + (m.image ? '<img src="' + IMG_BASE + esc(m.image) + '" alt="' + esc(m.name) + '">' : '<div class="empty">No map art available.</div>') + '</div></section>' +
      modeTabsHtml(mode, { normal: normalZones.length > 0 || bosses.length > 0, hard: hardZones.length > 0 || bosses.length > 0 }, "Map data mode") +
      '<section class="map-overview" aria-label="Map overview">' +
        sb("Zones", zones.length) + sb("Monsters", encounters.enemies.length) + sb("Item drops", drops.length) + sb("Bosses", bosses.length) +
        sb("Walkable", walkPct) + sb("Grid", m.gridWidth + "&#215;" + m.gridHeight) + '</section>' +
      (zones.length ? '<section class="map-detail-section">' + sectionHead("Local areas", "Zones", zones.length, mode === "hard" ? "Hard Mode zones only" : "Normal Mode zones only") +
        '<div class="map-zone-grid">' + zones.map(zoneCard).join('') + '</div></section>' : '') +
      (encounters.enemies.length ? '<section class="map-detail-section">' + sectionHead("Encounters", "Monsters", encounters.enemies.length, "Regular enemies in " + (mode === "hard" ? "Hard Mode" : "Normal Mode")) +
        '<div class="map-entity-grid">' + encounters.enemies.map(enemyCard).join('') + '</div></section>' : '') +
      (drops.length ? '<section class="map-detail-section monster-drops">' + sectionHead("Regular loot", "Monster item drops", drops.length, "Items earned from regular encounters on this map") +
        '<div class="map-drop-grid">' + drops.map(dropCard).join('') + '</div></section>' : '') +
      (bosses.length ? '<section class="map-detail-section">' + sectionHead("Map guardians", "Bosses", bosses.length, "Boss encounters assigned to this map") +
        '<div class="map-entity-grid">' + bosses.map(bossCard).join('') + '</div></section>' : '') +
      (bossDrops.length ? '<section class="map-detail-section boss-drops">' + sectionHead("Exclusive loot", "Boss item drops", bossDrops.length, (mode === "hard" ? "Hard Mode" : "Normal Mode") + " boss and bonus rewards") +
        '<div class="map-drop-grid">' + bossDrops.map(bossDropCard).join('') + '</div></section>' : '') +
      (!zones.length && !bosses.length ? '<div class="empty map-empty">Detailed ' + (mode === "hard" ? "Hard Mode" : "Normal Mode") + ' encounter data is not available for this map yet.</div>' : '');
    wireModeTabs(app, mode, function (next) { mapDetail(app, d, m, next); });
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
      pageHero("achievements.html", "Achievements", "Track goals, permanent rewards, and character unlocks.", d.achievements.length) +
      '<div class="catalog-controls"><div class="tabs" id="tabs">' + modes.map(function (m, i) { return '<button class="tab' + (i === 0 ? " active" : "") + '" data-m="' + m + '">' + m + "</button>"; }).join("") + "</div>" +
      '<div class="toolbar"><label class="search-field"><span aria-hidden="true">&#128269;</span><input type="search" id="q" placeholder="Search achievements&#8230;" aria-label="Search achievements"></label><span class="result-count" id="rc"></span></div></div>' +
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
      pageHero("sets.html", "Item Sets", "Combine matching pieces to activate set bonuses and bonus drop rate.", names.length) +
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
      '<div class="meta">' + metaHtml + '</div><span class="card-go" aria-hidden="true">&#8594;</span></div></a>';
  }
  function notFound(app, page, label) {
    app.innerHTML = backLink(page, label) + '<div class="empty">Not found.</div>';
  }

  function listView(app, d, cfg) {
    var active = {}; (cfg.filters || []).forEach(function (f) { active[f.key] = null; });
    var q = "", tabIdx = 0;
    var preferredMode = selectedGameMode("normal");
    if (cfg.tabs) {
      var preferredTab = cfg.tabs.findIndex(function (t) { return t.mode === preferredMode; });
      if (preferredTab >= 0) tabIdx = preferredTab;
    }
    var sortKey = cfg.defaultSort || (cfg.sorts && cfg.sorts.length ? cfg.sorts[0].key : "");
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
      if (cfg.sorts && cfg.sorts.some(function (s) { return s.key === saved.sort; })) sortKey = saved.sort;
    }
    var modeTabSet = cfg.tabs && cfg.tabs.some(function (t) { return !!t.mode; });
    var tabsHtml = cfg.tabs ? '<div class="tabs' + (modeTabSet ? ' mode-tabs' : '') + '" id="tabs" role="tablist" aria-label="' +
      esc(modeTabSet ? "Game mode" : cfg.title + " categories") + '">' + cfg.tabs.map(function (t, i) {
      return '<button type="button" class="tab' + (modeTabSet ? ' mode-tab' : '') + (i === tabIdx ? " active" : "") +
        '" data-i="' + i + '"' + (t.mode ? ' data-game-mode="' + esc(t.mode) + '"' : '') + ' role="tab" aria-selected="' +
        (i === tabIdx ? "true" : "false") + '">' + esc(t.label) + "</button>";
    }).join("") + "</div>" : "";
    app.innerHTML = pageHero(cfg.page, cfg.title, cfg.subtitle, cfg.items.length) +
      '<div class="catalog-controls">' + tabsHtml +
      '<div class="toolbar">' +
        (cfg.search ? '<label class="search-field"><span aria-hidden="true">&#128269;</span><input type="search" id="q" placeholder="Search ' + esc(cfg.title.toLowerCase()) + '&#8230;" aria-label="Search ' + esc(cfg.title.toLowerCase()) + '"></label>' : "") +
        (cfg.filters || []).map(function (f) {
          var opts;
          if (f.options) {
            // Grouped form: [{value,label,group}] — used by the Area filter so 40 regions stay
            // readable, grouped under their world.
            var order = [], byGroup = {};
            f.options.forEach(function (o) {
              var g = o.group || "";
              if (!byGroup[g]) { byGroup[g] = []; order.push(g); }
              byGroup[g].push(o);
            });
            opts = order.map(function (g) {
              var inner = byGroup[g].map(function (o) {
                return '<option value="' + esc(o.value) + '"' + (active[f.key] === o.value ? " selected" : "") + ">" + esc(o.label) + "</option>";
              }).join("");
              return g ? '<optgroup label="' + esc(g) + '">' + inner + "</optgroup>" : inner;
            }).join("");
          } else {
            opts = f.values.map(function (v) { return '<option value="' + esc(v) + '"' + (active[f.key] === v ? " selected" : "") + ">" + esc(v) + "</option>"; }).join("");
          }
          return '<select data-key="' + f.key + '"><option value="">' + f.label + ': All</option>' + opts + "</select>";
        }).join("") +
        (cfg.sorts ? '<select data-sort aria-label="Sort ' + esc(cfg.title.toLowerCase()) + '">' + cfg.sorts.map(function (s) {
          return '<option value="' + esc(s.key) + '"' + (s.key === sortKey ? ' selected' : '') + '>Sort: ' + esc(s.label) + '</option>';
        }).join('') + '</select>' : '') +
        '<span class="result-count" id="rc"></span>' +
      "</div></div>" +
      '<div class="grid" id="grid"></div>';

    var grid = $("#grid", app), rc = $("#rc", app);
    function apply() {
      var tab = cfg.tabs ? cfg.tabs[tabIdx] : null;
      var base = (tab && tab.test) ? cfg.items.filter(tab.test) : cfg.items;
      var out = base.filter(function (x) {
        if (q && cfg.search(x).toLowerCase().indexOf(q) < 0) return false;
        for (var key in active) if (active[key] && cfg.filters) {
          var f = cfg.filters.filter(function (ff) { return ff.key === key; })[0];
          if (!f) continue;
          var got = f.get(x);
          // get() may return a LIST (an item drops in several areas) — match if any entry hits.
          if (Object.prototype.toString.call(got) === "[object Array]") { if (got.indexOf(active[key]) < 0) return false; }
          else if (got !== active[key]) return false;
        }
        return true;
      });
      if (cfg.sorts && sortKey) {
        var sorter = cfg.sorts.filter(function (s) { return s.key === sortKey; })[0];
        if (sorter && sorter.compare) out = out.slice().sort(sorter.compare);
      }
      grid.innerHTML = out.length ? out.map(function (x) { return cfg.card(x, tab); }).join("") : '<div class="empty" style="grid-column:1/-1">No matches.</div>';
      rc.textContent = out.length + " / " + base.length;
    }
    var qi = $("#q", app);
    if (qi) { qi.value = q; qi.addEventListener("input", function () { q = qi.value.toLowerCase(); apply(); }); }
    Array.prototype.forEach.call(app.querySelectorAll("select[data-key]"), function (sel) {
      sel.addEventListener("change", function () { active[sel.getAttribute("data-key")] = sel.value || null; apply(); });
    });
    var sortSelect = app.querySelector("select[data-sort]");
    if (sortSelect) sortSelect.addEventListener("change", function () { sortKey = sortSelect.value; apply(); });
    Array.prototype.forEach.call(app.querySelectorAll("#tabs .tab"), function (btn) {
      btn.addEventListener("click", function () {
        tabIdx = +btn.getAttribute("data-i");
        Array.prototype.forEach.call(app.querySelectorAll("#tabs .tab"), function (b) {
          b.classList.remove("active"); b.setAttribute("aria-selected", "false");
        });
        btn.classList.add("active"); btn.setAttribute("aria-selected", "true");
        var tab = cfg.tabs && cfg.tabs[tabIdx];
        if (tab && tab.mode) rememberGameMode(tab.mode, true);
        apply(); window.scrollTo(0, 0);
      });
    });
    // Persist the view (incl. scroll) right before navigating into a detail page.
    window.addEventListener("pagehide", function () {
      try { sessionStorage.setItem(SKEY, JSON.stringify({ tab: tabIdx, q: q, filters: active, sort: sortKey, scrollY: window.pageYOffset || 0 })); } catch (e) {}
    });
    apply();
    // Only restore scroll when returning via Back/Forward; fresh visits start at the top.
    if (back && saved.scrollY) { var y = saved.scrollY; requestAnimationFrame(function () { window.scrollTo(0, y); }); }
    else window.scrollTo(0, 0);
  }

  /* ---------- advertising policy ----------
     AdSense is intentionally limited to substantive, long-form editorial pages.
     Do not add the Auto Ads loader to catalog shells, search/filter screens, legal
     pages, loading states, errors, or other utility-only experiences. */

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

  /* ---------- GA4 interaction events ---------- */
  function mountAnalyticsEvents() {
    document.addEventListener("click", function (event) {
      var anchor = event.target.closest && event.target.closest("a");
      if (!anchor) return;
      var href = anchor.getAttribute("href") || "";
      var page = document.body.getAttribute("data-page") || "unknown";

      if (anchor.classList.contains("store-button")) {
        trackEvent("store_click", {
          platform: anchor.getAttribute("data-store-platform") || "unknown",
          link_location: page
        });
      } else if (anchor.closest(".g-results")) {
        trackEvent("wiki_search", {
          method: "result_click",
          result_type: (href.split(".html")[0] || "unknown").replace(/[^a-z_]/gi, ""),
          link_location: page
        });
      } else if (/guide\.html(?:$|[?#])/.test(href)) {
        trackEvent("guide_open", { link_location: page });
      } else if (/patch\.html(?:$|[?#])/.test(href)) {
        trackEvent("patch_notes_open", { link_location: page });
      } else if (/^mailto:/i.test(href)) {
        trackEvent("support_click", { link_location: page });
      }
    });
  }

  /* ---------- boot ---------- */
  document.addEventListener("DOMContentLoaded", function () {
    var page = document.body.getAttribute("data-page") || "home";
    mountTheme();
    mountAnalyticsEvents();
    var fav = document.createElement("link");
    fav.rel = "icon"; fav.href = IMG_BASE + "app_icon.png";
    document.head.appendChild(fav);
    var translationsReady = window.TWI18n ? window.TWI18n.ready : Promise.resolve();
    translationsReady.then(function () {
      buildChrome(page);
      mountBackToTop();
      var app = $("#app");
      if (app && PAGES[page]) {
        if (!app.children.length) showLoading(app);
        else app.setAttribute("aria-busy", "true");
        loadData().then(function (d) {
          app.removeAttribute("aria-busy");
          PAGES[page](app, d);
        }).catch(function (e) {
          app.removeAttribute("aria-busy");
          fail(app, e);
        });
      }
    });
  });
})();
