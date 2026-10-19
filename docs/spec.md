# Show Me How — platform spec

Show Me How ("Покажи, как") is a static site of short, illustrated, step-by-step guides for
everyday devices and things: pair headphones, set up a router, assemble a chest of drawers, put a
bike together out of the box. Anyone can request a guide (GitHub Issue Form) or write one (pull
request with a Markdown file). The site is built by a dependency-free Node script and served from
GitHub Pages at `https://wyrtensi.github.io/showmehow/`.

This document is the contract between all parts of the code and the content. If code and this
document disagree, fix one of them, do not leave them apart.

## 1. Principles

- **Show, don't lecture.** One action per step, an imperative step title, an illustration for the
  steps where seeing helps, exact button names and menu paths as they appear on the device.
- **Sources.** Every guide cites the manufacturer's own documentation (support page, manual PDF).
  Text is written in our own words; manufacturer images are never copied. Illustrations are our
  own schematic SVGs.
- **Bilingual.** Russian is primary and required; English is optional per guide and falls back to
  Russian with a visible note. The interface is fully translated.
- **No dependencies.** Node 20+ built-ins only (`node:fs`, `node:path`, `node:url`, `node:test`
  is not required). No npm packages, no bundler. Browser code is native ES modules.
- **No emoji** anywhere — content, UI, code. Icons are SVG.
- **Interactive widgets are first-class.** A guide may embed a widget (section 6). The washguide
  washing-machine panels will move here later as a widget.

## 2. Repository layout

```
guides/<category>/<slug>/index.ru.md      required
guides/<category>/<slug>/index.en.md      optional
guides/<category>/<slug>/<image>.svg      illustrations (or .webp/.jpg/.png photos, see 4.4)
taxonomy/categories.json                  categories (fixed list, edited by maintainers)
taxonomy/devices.json                     device types, each in one category
taxonomy/brands.json                      brands with aliases
taxonomy/tasks.json                       what the guide does: pair, setup, assemble, ...
data/synonyms.json                        search synonym groups
src/lib/                                  shared modules (build and browser)
  frontmatter.js   YAML-subset parser (section 4.2)
  markdown.js      Markdown-subset renderer (section 4.3)
  svg.js           SVG sanitizer + inliner (section 4.4)
  schema.js        guide + taxonomy validation, returns error/warning lists
  model.js         loads everything into the site model (section 7)
  seo.js           JSON-LD, canonical/alternate URLs, sitemap, llms.txt builders
  paths.js         URL helpers: base path, language prefix
  search.js        search index builder + query engine (section 8)  [build + browser]
  i18n.js          UI strings ru/en + t() helper                       [build + browser]
src/render/                               HTML templates (pure functions returning strings)
src/client/                               browser code (app.js entry, ES modules)
src/styles/                               CSS (concatenated into one file at build)
src/icons/                                SVG icons (UI + one per category)
src/widgets/<type>/                       widgets (section 6)
static/                                   copied verbatim to the site root (fonts, favicons, og.png)
templates/guide/                          template used by `npm run new`
scripts/build.mjs  check.mjs  new.mjs  serve.mjs
scripts/test/run.mjs                      runs every scripts/test/*.test.mjs
docs/spec.md  docs/guide-format.md        this file; the contributor-facing format reference
.github/                                  workflows, issue forms, PR template
```

Ownership while the platform is being built (to avoid parallel edits of the same file):

| Area | Files |
|---|---|
| core | `src/lib/{frontmatter,markdown,svg,schema,model,seo,paths}.js`, `scripts/{build,check,new,serve}.mjs`, `scripts/test/{frontmatter,markdown,svg,schema,build}.test.mjs`, `templates/` |
| frontend | `src/render/**`, `src/client/**`, `src/styles/**`, `src/icons/**`, `src/widgets/**`, `src/lib/i18n.js`, `static/**`, `scripts/make-images.py`, `scripts/test/render.test.mjs` |
| search | `src/lib/search.js`, `data/synonyms.json`, `scripts/test/search.test.mjs` |
| content | `guides/<own categories>/**`; may *append* entries to `taxonomy/brands.json` and `taxonomy/devices.json` with the Edit tool (never rewrite those files whole) |
| repo | `README.md`, `CONTRIBUTING.md`, `LICENSE*`, `.github/**`, `docs/guide-format.md`, `.editorconfig`, `.gitignore` |

`package.json`, `scripts/test/run.mjs` and `taxonomy/categories.json`, `taxonomy/tasks.json` are
fixed by the maintainer; ask (in your final report) instead of changing them.

## 3. Taxonomy

All taxonomy files are JSON arrays. Every entry has an `id` (kebab-case, `[a-z0-9-]+`) and `ru`
and `en` blocks with at least `name`.

- `categories.json`: `{id, hue, icon, ru:{name, desc}, en:{name, desc}, featured?: [{url, ru:{title, desc}, en:{title, desc}}]}`.
  `hue` is an OKLCH hue in degrees; the frontend turns it into light/dark colour tokens.
  `icon` is a file name in `src/icons/` without `.svg`. `featured` are external links shown on
  the category page (washguide.ru on "appliances").
- `devices.json`: `{id, category, ru:{name, plural?}, en:{name, plural?}, aliases?: []}`.
- `brands.json`: `{id, name, aliases?: [], site?: url}`. `aliases` include Cyrillic spellings
  ("сяоми", "ксиоми"). The special brand `generic` means "any brand".
- `tasks.json`: `{id, ru:{name, verb}, en:{name, verb}}` — `name` for filters ("Подключение"),
  `verb` for headings ("Подключить").

Reserved ids that may not be category ids: `en`, `device`, `brand`, `task`, `guides`, `stats`,
`requests`, `contribute`, `search`, `assets`, `api`.

## 4. Guide format

### 4.1 Files and slug

A guide lives in `guides/<category>/<slug>/`. The slug is kebab-case, globally unique across
categories, at most 60 characters, and reads like the task: `airpods-pair-android`,
`ikea-malm-3-drawer-assemble`. The folder's category must equal the frontmatter `category`.

### 4.2 Frontmatter (YAML subset)

The file starts with `---` on the first line and the frontmatter ends at the next `---` line.
Supported syntax — anything else is a parse error with a line number:

- `key: value` at column 0. Keys `[a-z][a-zA-Z0-9_]*`.
- Scalars: plain (`Как подключить`), double-quoted (`"a: b"`, escapes `\"` `\\` `\n`),
  single-quoted (`'it''s'`). Plain `true`/`false` become booleans, plain integers and decimals
  become numbers, everything else (dates too) stays a string.
- Inline lists: `[a, b, "c, d"]`.
- Block lists: `key:` followed by lines `  - scalar`, or by maps `  - key: value` with further
  `    key: value` lines (4-space indent) belonging to the same item.
- Block maps: `key:` followed by `  key: value` lines (2-space indent), one level.
- Comments: lines whose first non-space character is `#`. A ` #` after a plain scalar starts a
  comment. Tabs are an error.

Fields (`*` = required):

| Field | Type | Notes |
|---|---|---|
| `title`* | string | 10–90 chars. A full task phrase: "Как подключить AirPods к Android". |
| `summary`* | string | 40–220 chars, one or two sentences, shown on cards and as meta description. |
| `category`* | id | from `categories.json`, equals the folder. |
| `device`* | id | from `devices.json`, must belong to `category`. |
| `brands`* | id list | from `brands.json`, at least one (`[generic]` for brand-independent guides). |
| `models` | string list | model names the guide was checked against: `[AirPods 2, AirPods Pro 2]`. |
| `task`* | id | from `tasks.json`. |
| `difficulty`* | enum | `easy` / `medium` / `hard`. |
| `time`* | integer | minutes, 1–600, realistic for a first-timer. |
| `tools` | string list | what you need at hand: "Телефон с Bluetooth", "Крестовая отвёртка PH2". |
| `parts` | list of maps | for assembly: `- name: Шуруп 4x16` / `    qty: 12` / `    ref: "101345"` (`ref` optional). |
| `aliases` | string list | extra search phrases people type: `[эйрподс, airpods андроид]`. |
| `sources`* | list of maps | `- title:` / `    url:` (https) / `    publisher:` — at least one, manufacturer first. |
| `faq` | list of maps | `- q:` / `    a:` troubleshooting, 0–8 items; `a` allows inline Markdown. |
| `updated`* | date | `YYYY-MM-DD`, when the guide was last checked. |
| `authors`* | string list | GitHub logins. |
| `widget` | block map | `type:` plus widget-specific scalars, see section 6. |
| `draft` | boolean | `true` keeps the guide out of the build (still validated). |

The English file repeats the frontmatter but only these fields are read from it: `title`,
`summary`, `tools`, `parts[].name`, `aliases`, `faq`, `sources[].title`. Everything else comes from
the Russian file; the validator warns if the English file sets a different `category`, `device`,
`brands`, `task`, `difficulty`, `time` or `widget`.

### 4.3 Body (Markdown subset)

Text before the first `## ` heading is the introduction (0–3 short paragraphs). Every `## `
heading starts a step; the heading text is the step title (imperative, 3–80 chars). A guide has
3–30 steps. `# ` headings are not allowed. The English file must have the same number of steps and
use the same images in the same steps.

Block syntax:

- paragraphs (blank line separated; single newlines join with a space);
- `### ` sub-heading inside a step;
- lists: `- ` / `* ` unordered, `1. ` ordered; one nested level by indenting 2–4 spaces;
- alerts, GitHub style — the first line is `> [!NOTE]`, `> [!TIP]`, `> [!IMPORTANT]`,
  `> [!WARNING]` or `> [!CAUTION]`, following `> ` lines are its content (inline Markdown,
  paragraphs, lists). A blockquote without a marker renders as a plain quote;
- image on its own line: `![alt text](file.svg)` — the step illustration, at most one per step,
  alt text required (10–160 chars, describes what the picture shows);
- fenced code blocks with ``` for literal strings (Wi-Fi names, commands, addresses);
- tables: GFM pipe tables with a `|---|` separator row (settings, indicator meanings).

Inline syntax: `**bold**`, `*em*` / `_em_`, `` `code` ``, `[text](https://...)` (http/https and
`#anchors` only; external links get `rel="noopener"` and `target="_blank"`), `<kbd>X</kbd>`
(the only HTML allowed; all other `<` is escaped), and the **UI path** `{{Настройки > Bluetooth > Добавить}}`
which renders as a chain of interface labels:
`<span class="ui-path"><span class="ui-seg">Настройки</span><span class="ui-sep"></span>...</span>`.

Output HTML uses only these elements: `p h3 ul ol li strong em code pre a kbd span table thead
tbody tr th td blockquote figure img div` (alerts: `<div class="alert alert-tip"><p class="alert-title">...`
— the title text comes from i18n, the renderer receives a `labels` map).

### 4.4 Illustrations

SVG is the default. One illustration per step at most, referenced from the step body. Files live
next to the guide, named `step-<n>.svg` or descriptively. They are **inlined** into the page after
sanitising, so they follow the theme.

Style:

- `viewBox="0 0 480 300"` (wide) or `0 0 300 300` (square), no `width`/`height` attributes;
- flat schematic drawing: device outline, the part the user touches, an arrow or pulse showing the
  action. No text except neutral symbols (digits, `OK`, `+`, `-`, power/bluetooth glyphs drawn as
  paths) — the same file serves both languages;
- colours only through classes, never hard-coded (the validator warns on `fill="#..."` /
  `stroke="#..."` other than `none`/`currentColor`):

| Class | Meaning |
|---|---|
| `f-paper` | page-coloured fill (cut-outs, screens off) |
| `f-soft` | light neutral fill (device bodies) |
| `f-muted` | mid neutral fill (secondary parts) |
| `f-ink` / `s-ink` | outlines and dark details |
| `f-accent` / `s-accent` | the category colour: the part to act on |
| `f-accent-soft` | tinted category colour (backgrounds, glow) |
| `f-hl` / `s-hl` | highlight: arrows, taps, "press here" marks |
| `f-ok` / `f-warn` | indicator lights: green-ish / amber-ish |
| `anim-pulse` `anim-tap` `anim-nudge` | optional CSS animations (disabled under reduced motion) |

- stroke width 3 for outlines, 2 for details, `stroke-linecap="round"` `stroke-linejoin="round"`;
- allowed elements: `svg g path rect circle ellipse line polyline polygon defs marker use title`;
  attributes: geometry, `class`, `transform`, `fill`, `stroke`, `stroke-*`, `opacity`,
  `marker-*`, `id`, `href` / `xlink:href` (only `#local`), `viewBox`, `xmlns`, `d`, `points`.
  Anything else (`script`, `style`, `foreignObject`, `on*`, external `href`, `image`, `text`) is
  rejected. Ids are prefixed with the slug and step at inlining so pages stay valid. Max 40 KB.

Photos (`.webp`, `.jpg`, `.png`, max 300 KB, at most 1600 px wide) are allowed when the
contributor took them, and are copied, not inlined. Manufacturer photos are never allowed.

### 4.5 Validation (`npm run check`)

Errors fail the check (and CI); warnings are printed. Beyond the field rules above:

- unknown frontmatter fields → error; unknown taxonomy ids → error;
- duplicate slug, folder/category mismatch, `# ` heading, step count out of range → error;
- referenced image missing, image unused by any step → error / warning;
- any emoji (Unicode `Extended_Pictographic`, plus `\u{FE0F}`) in any guide or taxonomy file → error;
- a `sources` url that is not `https://` → error;
- English file: step count or images differ → error; ignored fields differ → warning;
- `time` > 120 with `difficulty: easy` → warning; summary repeating the title → warning;
- taxonomy: unique ids, reserved category ids, device category exists, `ru` and `en` names → error.

The checker prints `path:line: message` so editors and GitHub annotations can jump there; in
GitHub Actions (`GITHUB_ACTIONS=true`) it also prints `::error file=...,line=...::message`.

## 5. Site

### 5.1 URLs

`BASE_PATH` (env, default `/`; production `/showmehow/`) prefixes every link; all internal links
are root-absolute (`/showmehow/en/audio/`), never relative, so 404.html works from any depth.
`SITE_URL` (env, production `https://wyrtensi.github.io/showmehow`) enables canonical links,
absolute URLs in sitemap/llms/JSON-LD. Russian has no prefix, English lives under `en/`.

| Path (after base + lang) | Page |
|---|---|
| `` | home |
| `<category>/` | category: devices in it, guides, featured links |
| `<category>/<slug>/` | guide |
| `device/<id>/`, `brand/<id>/`, `task/<id>/` | listings |
| `guides/` | catalog with facet filters (category, device, brand, task, difficulty) |
| `search/?q=` | full search results |
| `stats/` | the index: what exists, how much, where |
| `requests/` | request a guide + open requests from GitHub |
| `contribute/` | how to write a guide |
| `/404.html` (root only) | not found, with search |

Data endpoints (root, language-neutral unless noted): `guides.json` (catalog, both languages),
`api/<slug>.json` (full guide, both languages, rendered HTML + raw steps), `assets/search.ru.json`,
`assets/search.en.json`, `llms.txt`, `llms-full.txt` (ru), `en/llms-full.txt`, `sitemap.xml`
(with `hreflang` alternates and `lastmod` from `git log -1 --format=%cs -- <guide dir>`, falling
back to `updated`), `robots.txt`, `.nojekyll`.

Note: on a `github.io/<repo>/` project site the host-root `robots.txt` is not ours; ours is still
emitted for a future custom domain, and the sitemap is submitted in the search consoles.

### 5.2 Pages

- **Home**: hero with the big search field (instant results while typing), "what do you want to do"
  task chips (pair / set up / assemble / reset / clean), category tiles with icon, colour and guide
  count, new and updated guides, a "can't find it — request a guide" block, totals strip
  (guides, devices, brands, languages).
- **Guide**: breadcrumb, title, meta row (time, difficulty, steps, brand/model chips, task),
  summary, "you will need" checklist (tools + parts table), two reading modes — **full** (all steps,
  numbered, illustration beside/above text) and **step-by-step** (one step fills the screen, big
  next/previous buttons fixed at the bottom on mobile, keyboard arrows, swipe, progress bar),
  per-step "done" checkboxes with progress kept in localStorage, anchors per step (`#step-3`),
  troubleshooting (faq), sources with publisher, "found a mistake" link (prefilled fix issue),
  related guides (same device, then same category), language fallback note.
- **Category / device / brand / task**: header with colour and icon, counts, filters, guide cards.
- **Catalog**: all guides, facet filters with counts, sort (new, A–Z, quickest), filters kept in the
  query string.
- **Stats ("Индекс")**: totals; guides per category (bar chart), per device type, per brand, per
  task, per difficulty; language coverage (how many have English); steps and illustrations in
  total; latest updates; open requests (fetched client-side) and the most-voted requests.
- **Requests**: a short form (device, what to do, category, language) that opens the prefilled
  GitHub issue form; a list of open requests from
  `https://api.github.com/repos/wyrtensi/showmehow/issues?labels=request&state=open&per_page=100`
  with their thumbs-up counts, sorted by votes; graceful text when the API is unreachable.
- **Contribute**: the guide format in short, the template, the PR flow, link to CONTRIBUTING.md.

Global: header with logo, search button (opens the command palette, `Ctrl+K` / `/`), categories
menu, language switch (keeps the current path and query), theme switch (system / light / dark, kept
in localStorage). Footer: categories, project links, licence, GitHub.

### 5.3 Requests through GitHub

Issue forms in `.github/ISSUE_TEMPLATE/`:

- `request-guide.yml` — label `request`; fields with ids `device` (input), `goal` (textarea),
  `category` (dropdown, category names in both languages), `language` (dropdown Русский / English),
  `links` (textarea, optional). The site opens
  `https://github.com/wyrtensi/showmehow/issues/new?template=request-guide.yml&title=<encoded>&device=<...>&goal=<...>`.
- `fix-guide.yml` — label `fix`; fields `guide` (input, prefilled with the guide URL), `problem`
  (textarea).
- `config.yml` — blank issues off, contact link to the site.

Votes are GitHub reactions on the issue. A PR that adds a requested guide writes `Closes #N`.

### 5.4 Agents and SEO

Every page: `<title>`, meta description, canonical, `hreflang` ru/en/x-default, Open Graph and
Twitter tags (`og:image` = `static/og.png`), JSON-LD (`WebSite` with `SearchAction` on home,
`HowTo` with `step`, `tool`, `supply`, `totalTime`, `image` on guides, `FAQPage` when faq exists,
`BreadcrumbList` everywhere except home, `CollectionPage` on listings). A visually hidden
(`.sr-only`, not `display:none`) note at the top of `<body>` tells agents where the data is:
`llms.txt`, `guides.json`, `api/<slug>.json`. `llms.txt` (English, with a Russian summary) lists
categories with counts and every guide with its URL and one-line summary, plus "When to recommend
this site". `llms-full.txt` contains every guide as plain Markdown-like text.

## 6. Widgets

A widget is `src/widgets/<type>/` with:

- `render.js` exporting `render(params, ctx) -> string` — server-side HTML, `ctx = {lang, guide, t, href}`;
- `client.js` (optional) exporting `mount(element, params, ctx)` — loaded only on pages that contain
  `[data-widget="<type>"]`;
- `schema.js` exporting `validate(params) -> string[]` (error messages).

Frontmatter: `widget:` block map with `type:` and scalar params. The widget is rendered after the
introduction and before step 1 (`placement: end` puts it after the last step). The registry is
`src/widgets/index.js` exporting `{[type]: {render, validate, client: boolean}}`; the validator
rejects unknown types. The first release ships the registry and no widgets except what the
frontend needs for a demo; washguide arrives later as `type: washer-panel`.

## 7. Site model (core -> render contract)

`model.js` exports `loadSite({root, lang, base, siteUrl}) -> Promise<Site>`, called once per
language. All strings are already in `lang` (with Russian fallback). HTML fields are rendered and
safe to print.

```js
Site = {
  lang, base, siteUrl,            // 'ru' | 'en', '/showmehow/', 'https://...' or ''
  langs: ['ru', 'en'],
  href(path, lang = site.lang),   // '/showmehow/en/audio/' — path without leading slash
  abs(path, lang),                // absolute URL when siteUrl is set, else href()
  categories: [Category], devices: [Device], brands: [Brand], tasks: [Task],
  guides: [Guide],                // excludes drafts, sorted by updated desc
  byCategory: {id: [Guide]}, byDevice, byBrand, byTask,
  totals: {guides, steps, illustrations, devices, brands, categories, withEnglish, sources},
  updatedAt                        // newest updated date
}
Category = {id, hue, icon, name, desc, featured: [{url, title, desc}], count, devices: [Device]}
Device   = {id, category, name, plural, aliases, count}
Brand    = {id, name, aliases, site, count}
Task     = {id, name, verb, count}
Guide = {
  slug, path,                      // path: 'audio/airpods-pair-android/'
  category, device, brands, task,  // the taxonomy objects (not ids)
  models, difficulty, time,
  title, summary, introHtml,
  tools: [string], parts: [{name, qty, ref}],
  aliases,
  steps: [{n, id, title, html, image: null | {kind: 'svg', svg, alt} | {kind: 'photo', src, alt, width, height}}],
  faq: [{q, aHtml}], sources: [{title, url, publisher}],
  updated, lastmod, authors,
  widget: null | {type, params, placement},
  langs: {ru: true, en: boolean},  // which files exist
  fallback: boolean,               // true when lang is 'en' but the text is Russian
  stats: {steps, illustrations, words}
}
```

`src/render/index.js` exports one function per page, each `(site, ...args) -> {path, html}` where
`path` is the output file relative to the language root (`audio/airpods-pair-android/index.html`)
and `html` the complete document: `renderHome(site)`, `renderGuide(site, guide)`,
`renderCategory(site, category)`, `renderDevice(site, device)`, `renderBrand(site, brand)`,
`renderTask(site, task)`, `renderCatalog(site)`, `renderSearch(site)`, `renderStats(site)`,
`renderRequests(site)`, `renderContribute(site)`, `render404(site)` (path `404.html`, written only
for ru at the dist root). Page metadata (canonical, alternates, JSON-LD objects) comes from
`seo.js`: `pageMeta(site, kind, subject) -> {title, description, canonical, alternates: {ru, en,
'x-default'}, jsonld: [object], noindex}`; the layout prints it.

`build.mjs`: validate (stop on errors) → for each lang `loadSite` → render all pages → write
`dist/` → copy `static/` → bundle CSS (`src/styles/*.css` in name order → `assets/site.css`) →
copy `src/client/**`, `src/lib/{search,i18n,paths}.js` and `src/widgets/**/client.js` to
`assets/js/` keeping relative imports valid → icons sprite `assets/icons.svg` (each
`src/icons/<name>.svg` becomes `<symbol id="i-<name>">`) → data endpoints → `.nojekyll`.
Asset URLs carry `?v=<short hash of content>` for cache busting.

## 8. Search

`src/lib/search.js` runs in Node (build) and the browser (no Node APIs at module top level).

- `buildIndex(guides, site, synonyms) -> object` — compact JSON written to `assets/search.<lang>.json`:
  per guide `{s: slug, p: path, t: title, u: summary, c: category id, d: device id, b: [brand ids],
  k: task id, f: difficulty, m: minutes, tok: {field: [tokens]}}` plus taxonomy names for
  facet labels. Fields and weights: title 10, aliases 8, brands+models 8, device names+aliases 6,
  category name 4, task name+verb 4, step titles 3, summary 2, tools 1.
- `createSearcher(index, synonyms) -> {search(query, {limit = 20, filters}) -> [{slug, path,
  title, summary, score, matched: [field]}], suggest(query) -> [string]}`.
- Matching per query token, best variant wins: exact token 1.0, prefix (query ≥ 2 chars) 0.8,
  typo (Damerau–Levenshtein ≤ 1 for tokens of 4–6 chars, ≤ 2 for ≥ 7) 0.55.
  Variants of a query token: itself, Russian↔Latin transliteration, wrong keyboard layout fixed
  (`yfeiybrb` → `наушники`, `ршщ` ↔ `iho`...), synonyms from `data/synonyms.json` (groups of
  equivalent terms across languages: `["наушники", "headphones", "earbuds", "уши", "airpods"]`).
- Normalisation: lower case, `ё`→`е`, strip diacritics, punctuation to spaces, simple stemming
  of common Russian endings (drop `-ами -ями -ов -ев -ей -ах -ях -ы -и -а -я -у -ю -е -ом -ем -ой`
  when the remaining stem is ≥ 4 chars) and English plurals (`-es`, `-s`).
- All query tokens must match (AND); if nothing matches, fall back to OR with a penalty and mark
  results `partial: true`. Ties: score, then fewer steps, then newer.
- Must answer within 10 ms for 2 000 guides on a mid phone; the index for 2 000 guides should stay
  under 1.5 MB uncompressed.

## 9. Design direction

Friendly, warm and rich — a kind tutor, not a spec sheet. Not sparse: colour, illustration, depth.

- Typeface **Onest** (Cyrillic + Latin, OFL), self-hosted woff2 in `static/fonts/` (400, 500, 700),
  fallback `system-ui`.
- Light: warm paper background, white cards with soft layered shadows, ink text; dark: deep
  blue-grey background, raised surfaces, softened colours — both themes designed, not inverted.
- Every category has its own colour (from `hue`), icon and illustrated tile; a guide page takes
  its category colour as `--accent`, so illustrations, progress and buttons match.
- Rounded shapes (14–24 px), generous touch targets (44 px+), playful micro-interactions
  (hover lift, step completion check animation), all under `prefers-reduced-motion`.
- Mobile first: 16 px side gutter, no horizontal scroll at 320 px, bottom navigation in
  step-by-step mode, large tap areas.
- WCAG AA contrast in both themes, visible focus rings, semantic HTML, works without JavaScript
  (everything is prerendered; JS adds search, step mode, progress, filters, requests).

## 10. Tests and CI

`npm test` runs `scripts/test/run.mjs`, which imports every `scripts/test/*.test.mjs` and runs the
`test(name, fn)` cases they register (a tiny runner with `assert` from `node:assert/strict`), then
`npm run check`. `npm run build` must leave no warnings for the shipped content.

- `.github/workflows/ci.yml` — on pull requests and pushes to non-main branches: `npm test`,
  `npm run build`; annotations from the checker.
- `.github/workflows/pages.yml` — on push to `main` and manual dispatch: checkout with full history
  (for lastmod), Node 24, `npm test`, build with `BASE_PATH=/showmehow/`
  `SITE_URL=https://wyrtensi.github.io/showmehow`, `actions/upload-pages-artifact`,
  `actions/deploy-pages`; permissions `pages: write`, `id-token: write`; environment
  `github-pages`. Actions pinned to commit SHAs with the version in a comment.

## 11. Interactivity

Every guide should feel alive, not like a printed manual, and at the same time stay **very
simple**: a person in a hurry, with one hand busy, must just follow big clear steps. Rules:

- one obvious main action per screen; interactive extras sit inside the step they belong to and
  look like part of the text (a timer chip, a light chip), never like a dashboard;
- no settings, modals or tours a person must deal with before reading step 1; nothing auto-plays
  sound; nothing moves except the part the user should look at;
- every control has a visible text label, a 44 px target and works with one thumb;
- if a feature does not make the guide easier for a first-timer, leave it out.

Everything below degrades to readable static HTML without JavaScript.

### 11.1 Inline interactive syntax (markdown.js)

`{{...}}` whose first word is a keyword is not a UI path:

- `{{timer 15s}}`, `{{timer 2m}}`, `{{timer 1m30s}}` — a "hold / wait" timer chip:
  `<button type="button" class="timer" data-seconds="15"><span class="timer-label">15 s</span></button>`
  (label localised by the renderer through `labels.timer(seconds)`). The client turns it into a
  countdown with a ring, vibrates (`navigator.vibrate`) and plays a short WebAudio tone at the end.
  Max 3600 s.
- `{{led white blink}}`, `{{led amber solid}}`, `{{led white/amber alternate}}` — an indicator light
  chip showing exactly what the device shows. Colours: `white green amber red blue`; patterns:
  `solid blink fast pulse alternate` (alternate needs two colours). Renders
  `<span class="led led-white led-blink" role="img" aria-label="<localised description>"></span>`.
- Anything else inside `{{ }}` stays a UI path. Unknown keyword-like input is an error in check.

### 11.2 Variants ("choose your model")

Frontmatter `variants:` — list of maps `- id: with-button` / `    name: Кейс с кнопкой` (2–6 items;
the English file supplies `variants[].name`). In the body:

- `> [!VARIANT with-button]` followed by `> ` lines — content only for that variant (inside a step);
- `## Step title {variant=with-button}` or `{variant=a,b}` — the whole step belongs to those variants.

The guide shows a picker ("Ваша модель:" chips) above step 1; the choice is kept per guide in
localStorage and in `?v=<id>`; step numbering and progress follow the visible steps. Without a choice
(or without JS) everything is shown and each variant block carries its name as a label. Validation:
referenced ids exist, every variant has at least one step visible, English has the same ids.

### 11.3 Widgets inside steps

A fenced block whose info string is `widget <type>` renders that widget in place; its lines are
`key: value` params (same scalar rules as frontmatter):

    ```widget wifi-qr
    security: WPA
    ```

Same registry and validation as section 6. Frontmatter `widget:` remains for a guide-level widget.
Model: `step.widgets: [{type, params}]` and the HTML placeholder
`<div class="widget" data-widget="<type>" data-params="<escaped JSON>">server HTML</div>`.

### 11.4 Living illustrations

- Animations (`anim-*`) inside a step illustration run only while that step is on screen
  (IntersectionObserver adds `is-live` to the figure; in step mode the active step is live).
- Elements with class `hot` get a pulsing hotspot ring: "this is the part".
- Tapping an illustration opens it enlarged (lightbox with focus trap, Esc closes).

### 11.5 Site-wide interactive features

- **Finder** on home: "Что у вас?" — pick category, then device, then task; matching guides and
  live counts update at every step; state in the query string; keyboard accessible.
- **Continue**: home shows guides with progress saved in localStorage ("Вы остановились на шаге 3").
- **Troubleshooting** on a guide: faq items render as symptom chips ("Что пошло не так?") that
  reveal the answer; "не помогло" opens the prefilled fix issue.
- **Completion**: checking the last step shows a small celebration (SVG burst, respects reduced
  motion) with "share" and "next guide on this device".
- **Stats**: bars and chips are interactive — hover/tap shows numbers, click opens the filtered
  catalog.

### 11.6 First widgets

All widgets run fully in the browser; nothing typed is sent anywhere.

- `wifi-qr` — enter network name, password, security (`WPA`/`WEP`/`nopass`, param `security`
  presets it) → a QR code guests scan to join (`WIFI:T:<sec>;S:<ssid>;P:<pass>;;` with escaping of
  `\ ; , : "`), plus a printable card. Own QR encoder (byte mode, error correction M, versions
  1–10, mask selection), no libraries.
- `saddle-height` — inseam in cm → saddle height from the bottom-bracket centre (inseam x 0.883,
  marked as a starting point), plus the heel-on-pedal check.
- `reminder` — "напомнить" for maintenance: params `every` (`2w`, `1m`, `3m`, `6m`, `1y`) and
  `title`; the user picks a start date and gets an `.ics` file with an RRULE for their calendar.
- `hold-timer` is not a widget: use `{{timer ...}}`.

## 12. Licence

Code: MIT. Guide texts and illustrations: CC BY-SA 4.0. Contributors agree by opening a PR (stated
in CONTRIBUTING.md and the PR template).
