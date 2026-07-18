/* TonyWorks portal &#8212; lists apps from apps.json as icon + name tiles. */
(function () {
  "use strict";

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function initials(name) {
    var w = String(name || "?").trim().split(/\s+/);
    return ((w[0] ? w[0][0] : "?") + (w[1] ? w[1][0] : "")).toUpperCase();
  }

  function tileIcon(app) {
    if (app.iconImage) {
      return '<div class="app-icon"><img src="' + esc(app.iconImage) + '" alt="' + esc(app.name) +
        '" onerror="this.parentNode.innerHTML=\'<span>' + esc(app.icon || initials(app.name)) + '</span>\'"></div>';
    }
    return '<div class="app-icon"><span>' + esc(app.icon || initials(app.name)) + "</span></div>";
  }

  function renderWebsiteDetail(app) {
    var externalAttrs = app.external ? ' target="_blank" rel="noopener noreferrer"' : "";
    var action = "launch_" + String(app.id || "website").replace(/[^a-z0-9_-]/gi, "_");
    var facts = (app.details || []).map(function (detail) {
      return '<div><dt>' + esc(detail.label) + '</dt><dd>' + esc(detail.value) + '</dd></div>';
    }).join("");
    var features = (app.features || []).map(function (feature) { return "<span>" + esc(feature) + "</span>"; }).join("");

    return '<div class="portal-site-detail-head"><span class="portal-kicker">Selected website</span>' +
      '<div class="portal-site-identity">' + tileIcon(app) + '<div><span>' + esc(app.category || "Web experience") +
      '</span><h3>' + esc(app.name) + '</h3></div></div></div>' +
      '<p class="portal-site-about">' + esc(app.about || app.tagline || "") + '</p>' +
      (facts ? '<dl class="portal-site-facts">' + facts + '</dl>' : "") +
      (features ? '<div class="portal-site-detail-features" aria-label="Website highlights">' + features + '</div>' : "") +
      '<div class="portal-site-detail-actions"><a class="portal-site-launch" data-portal-action="' + esc(action) + '" href="' +
      esc(app.path) + '"' + externalAttrs + '>Visit ' + esc(app.name) + ' <span aria-hidden="true">&#8599;</span></a>' +
      '<span>' + esc(app.domain || app.path) + '</span></div>';
  }

  function renderWebsiteShowcase(apps) {
    var websites = (apps || []).filter(function (app) { return app.type === "web"; });
    if (!websites.length) return "";

    var cards = websites.map(function (app, index) {
      var action = "website_" + String(app.id || "project").replace(/[^a-z0-9_-]/gi, "_");
      var cover = app.coverImage ? '<img src="' + esc(app.coverImage) + '" alt="' + esc(app.coverAlt || app.name) + '" loading="lazy">' : "";
      var features = (app.features || []).map(function (feature) { return "<span>" + esc(feature) + "</span>"; }).join("");
      return '<article class="portal-site-card" data-active="' + (index === 0 ? "true" : "false") +
        '" style="--project-accent:' + esc(app.accent || "#b44a3f") + '"><button class="portal-site-select" type="button" data-website-id="' +
        esc(app.id) + '" data-portal-action="' + esc(action) + '" aria-controls="website-detail" aria-pressed="' + (index === 0 ? "true" : "false") + '">' +
        '<div class="portal-site-art">' + cover + '<span class="portal-site-badge">' + (index === 0 ? "Featured website" : "Web project") + '</span></div>' +
        '<div class="portal-site-info">' + tileIcon(app) + '<div class="portal-site-copy">' +
        '<span class="portal-site-label">' + esc(app.category || "Web experience") + ' <i aria-hidden="true"></i> ' + esc(app.status || "Live") +
        '</span><h3>' + esc(app.name) + '</h3><p>' + esc(app.tagline || "") + '</p>' +
        (features ? '<div class="portal-site-features" aria-label="Highlights">' + features + "</div>" : "") + '</div>' +
        '<span class="portal-site-go" aria-hidden="true">&#8594;</span></div></button></article>';
    }).join("");

    return '<section class="portal-projects" id="projects" aria-labelledby="projects-title">' +
      '<div class="portal-projects-head"><div><span class="portal-kicker">Web projects</span>' +
      '<h2 id="projects-title">Useful sites. Thoughtfully made.</h2></div>' +
      '<p>Independent web experiences from Tony Works. This collection will grow as new sites launch.</p></div>' +
      '<div class="portal-project-layout"><div class="portal-project-grid" aria-label="Websites">' + cards + '</div>' +
      '<aside class="portal-site-detail" id="website-detail" aria-live="polite" style="--project-accent:' +
      esc(websites[0].accent || "#b44a3f") + '">' + renderWebsiteDetail(websites[0]) + '</aside></div></section>';
  }

  function setupWebsiteSelector(apps, portal) {
    var websites = (apps || []).filter(function (app) { return app.type === "web"; });
    var detail = portal.querySelector("#website-detail");
    if (!detail || !websites.length) return;

    portal.addEventListener("click", function (event) {
      var selector = event.target.closest && event.target.closest("[data-website-id]");
      if (!selector) return;
      var id = selector.getAttribute("data-website-id");
      var selected = websites.filter(function (app) { return String(app.id) === id; })[0];
      if (!selected) return;

      portal.querySelectorAll("[data-website-id]").forEach(function (button) {
        var active = button === selector;
        button.setAttribute("aria-pressed", active ? "true" : "false");
        var card = button.closest(".portal-site-card");
        if (card) card.setAttribute("data-active", active ? "true" : "false");
      });
      detail.style.setProperty("--project-accent", selected.accent || "#b44a3f");
      detail.innerHTML = renderWebsiteDetail(selected);

      if (window.matchMedia && window.matchMedia("(max-width: 900px)").matches) {
        detail.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  }

  function render(apps) {
    var portal = document.getElementById("portal");
    var featured = (apps || []).filter(function (app) { return app.type === "game"; })[0] || (apps || [])[0];
    if (!featured) {
      portal.innerHTML = '<div class="empty">No projects yet.</div>';
      return;
    }
    var gamePath = esc(featured.path);
    var guidePath = esc(featured.path.replace(/index\.html$/, "guide.html"));
    var patchPath = esc(featured.path.replace(/index\.html$/, "patch.html"));

    portal.innerHTML =
      '<header class="portal-nav"><a class="portal-brand" href="index.html"><span>TW</span><strong>Tony Works</strong></a>' +
        '<nav aria-label="Main navigation"><a href="#game">Game</a><a href="' + guidePath + '">Guide</a><a href="about.html">About</a><a href="mailto:tonyzorz@naver.com">Contact</a></nav></header>' +
      '<section class="portal-hero" id="game"><div class="portal-hero-copy"><span class="portal-kicker">Independent game studio</span>' +
        '<h1>Small worlds.<br><span>Long adventures.</span></h1>' +
        '<p>Tony Works creates focused games with deep progression, approachable systems, and player-friendly companion tools.</p>' +
        '<div class="portal-actions"><a class="portal-primary" data-portal-action="game" href="' + gamePath + '">Explore Infinite Loot-Loop <span aria-hidden="true">&#8594;</span></a>' +
          '<a class="portal-secondary" data-portal-action="guide" href="' + guidePath + '">Read the beginner guide</a></div>' +
        '<div class="portal-platforms"><span><i aria-hidden="true"></i> In development</span><span>iOS</span><span>Android</span></div></div>' +
        '<a class="featured-game" data-portal-action="featured_game" href="' + gamePath + '" style="--tile-accent:' + esc(featured.accent || "#7c9cff") + '">' +
          '<div class="featured-game-art"><span class="featured-badge">Featured game</span></div><div class="featured-game-info">' + tileIcon(featured) +
          '<div><span class="featured-label">Mobile roguelike RPG</span><h2>' + esc(featured.name) + '</h2><p>' + esc(featured.tagline || "") + '</p></div>' +
          '<span class="featured-go" aria-hidden="true">&#8594;</span></div></a></section>' +
      '<section class="portal-strip" aria-label="Tony Works highlights"><div><strong>Unity</strong><span>Built for mobile</span></div>' +
        '<div><strong>11</strong><span>Supported languages</span></div><div><strong>Live</strong><span>Data-backed wiki</span></div></section>' +
      '<section class="portal-discover" aria-labelledby="discover-title"><div class="portal-section-head"><span class="portal-kicker">More than a landing page</span>' +
        '<h2 id="discover-title">Everything for your next run</h2><p>The official companion wiki stays connected to the game data, so planning a build never becomes guesswork.</p></div>' +
        '<div class="portal-link-grid"><a href="' + gamePath + '"><span class="portal-link-num">01</span><span><strong>Explore the wiki</strong><small>Monsters, bosses, items, maps and characters</small></span><span aria-hidden="true">&#8594;</span></a>' +
          '<a href="' + guidePath + '"><span class="portal-link-num">02</span><span><strong>Learn the loop</strong><small>A friendly guide from first battle to Hard Mode</small></span><span aria-hidden="true">&#8594;</span></a>' +
          '<a href="' + patchPath + '"><span class="portal-link-num">03</span><span><strong>Follow development</strong><small>New content, balance changes and fixes</small></span><span aria-hidden="true">&#8594;</span></a></div></section>' +
      renderWebsiteShowcase(apps) +
      '<section class="portal-contact"><div><span class="portal-kicker">Tony Works</span><h2>Projects made with care—and supported after launch.</h2></div>' +
        '<a data-portal-action="contact" href="mailto:tonyzorz@naver.com">Get in touch &#8594;</a></section>';

    setupWebsiteSelector(apps, portal);

    portal.addEventListener("click", function (e) {
      var target = e.target.closest && e.target.closest("[data-portal-action]");
      if (!target || typeof window.gtag !== "function") return;
      window.gtag("event", "portal_action", { action_name: target.getAttribute("data-portal-action") });
    });

    var footer = document.getElementById("portal-footer");
    if (footer) footer.innerHTML = "Tony Works &#183; " + new Date().getFullYear() +
      ' &#183; <a href="about.html">About</a> &#183; <a href="privacy-policy.html">Privacy</a> &#183; <a href="terms.html">Terms</a>' +
      ' &#183; <a href="mailto:tonyzorz@naver.com">tonyzorz@naver.com</a>';
  }

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

  document.addEventListener("DOMContentLoaded", function () {
    mountTheme();
    var fav = document.createElement("link");
    fav.rel = "icon"; fav.href = "apps/infinite-loot-loop/assets/img/app_icon.png";
    document.head.appendChild(fav);
    var translationsReady = window.TWI18n ? window.TWI18n.ready : Promise.resolve();
    translationsReady.then(function () {
      if (!document.getElementById("portal")) return;
      fetch("apps.json", { cache: "no-cache" })
        .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
        .then(function (d) { render(d.apps || []); })
        .catch(function (e) {
          document.getElementById("portal").innerHTML =
            '<section class="hero"><h1>Tony <span class="grad">Works</span></h1></section>' +
            '<div class="notice">Could not load app list (' + esc(e.message) + ").</div>";
        });
    });
  });
})();
