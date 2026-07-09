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

  function render(apps) {
    var portal = document.getElementById("portal");
    var tiles = (apps || []).map(function (app) {
      var accent = app.accent || "var(--accent)";
      return '<a class="app-tile" href="' + esc(app.path) + '" style="--tile-accent:' + esc(accent) + '">' +
        tileIcon(app) +
        '<div class="app-info">' +
          '<h2>' + esc(app.name) + (app.status ? ' <span class="app-status">' + esc(app.status) + "</span>" : "") + "</h2>" +
          (app.tagline ? "<p>" + esc(app.tagline) + "</p>" : "") +
        "</div>" +
        '<span class="app-go">&#8594;</span>' +
      "</a>";
    }).join("");

    portal.innerHTML =
      '<section class="hero">' +
        '<h1>Tony<span class="grad">Works</span></h1>' +
        "<p>Apps &amp; games by Tony &#8212; companion sites, wikis and tools.</p>" +
      "</section>" +
      '<div class="app-list">' + (tiles || '<div class="empty">No apps yet.</div>') + "</div>";

    var footer = document.getElementById("portal-footer");
    if (footer) footer.innerHTML = "TonyWorks &#183; " + new Date().getFullYear() +
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
    fetch("apps.json", { cache: "no-cache" })
      .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then(function (d) { render(d.apps || []); })
      .catch(function (e) {
        document.getElementById("portal").innerHTML =
          '<section class="hero"><h1>Tony<span class="grad">Works</span></h1></section>' +
          '<div class="notice">Could not load app list (' + esc(e.message) + ").</div>";
      });
  });
})();
