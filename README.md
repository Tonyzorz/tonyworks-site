# TonyWorks

Companion site / wiki for **Infinite Loot-Loop** — maps, monsters, bosses, items, guides, patch notes, and FAQ.

The site is a static, data-driven web app hosted on GitHub Pages. Game data is exported from the Unity project via **Dev → Export Site Data** into `data.json`, with sprites/icons copied alongside.

## Structure

- `index.html` — hub / landing
- `data/data.json` — exported game data
- `assets/img/…` — copied sprites & icons
- `about.html` — studio, authorship, editorial standards, and contact
- `apps/infinite-loot-loop/game-data.html` — export and review methodology
- pages: Maps, Monsters, Bosses, Items, Sets, Characters, Achievements, Guide, Patch Notes, and FAQ

## AdSense content safeguards

- Do not add the AdSense loader globally.
- Ad code is currently limited to the long-form `guide.html` page.
- Never serve ads on legal pages, loading/error states, empty results, navigation-only screens, or catalog shells.
- Core catalog pages must ship with a real `<h1>` and developer-written content in the initial HTML response.
- JavaScript may enhance or replace the interactive catalog area, but it must not remove the written article that follows it.
- Before requesting an AdSense review, confirm the live HTML, sitemap, canonical links, and rendered content in Search Console URL Inspection.

## Publishing checklist

1. Export and validate `data/data.json` from Unity.
2. Run JavaScript syntax, internal-link, sitemap, and static-content checks.
3. Confirm only approved editorial pages contain the AdSense loader.
4. Publish to GitHub Pages and inspect the live homepage, guide, and one catalog page.
5. Submit `sitemap.xml` and request indexing for the most important updated URLs.

## Contact

tonyzorz@naver.com
