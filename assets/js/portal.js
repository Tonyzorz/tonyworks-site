/* TonyWorks portal — lists apps from apps.json as icon + name tiles. */
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
        '<span class="app-go">→</span>' +
      "</a>";
    }).join("");

    portal.innerHTML =
      '<section class="hero">' +
        '<h1>Tony<span class="grad">Works</span></h1>' +
        "<p>Apps &amp; games by Tony — companion sites, wikis and tools.</p>" +
      "</section>" +
      '<div class="app-list">' + (tiles || '<div class="empty">No apps yet.</div>') + "</div>";

    var footer = document.getElementById("portal-footer");
    if (footer) footer.innerHTML = "TonyWorks · " + new Date().getFullYear() +
      ' · <a href="mailto:tonyzorz@naver.com">tonyzorz@naver.com</a>';
  }

  document.addEventListener("DOMContentLoaded", function () {
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
