// The page shell: <head> with SEO metadata, header, footer and the search palette.
import { pagePath } from '../lib/paths.js';
import { esc, attr, cls, tools, asset, jsonScript, REPO } from './util.js';
import { icon, catIcon } from './icons.js';
import { categoryCss } from './color.js';
import { logoMark } from './art.js';

let seo = null;
try {
  seo = await import('../lib/seo.js');
} catch (error) {
  if (error?.code !== 'ERR_MODULE_NOT_FOUND') throw error;
}

const OG_LOCALE = { ru: 'ru_RU', en: 'en_US' };

// Runs before first paint: theme and the remembered reading mode, so nothing flashes.
// Values are JSON, as src/client/core.js stores them.
const BOOT = `(function(d){d.className+=' js';try{var s=localStorage,t=JSON.parse(s.getItem('smh-theme'));if(t==='light'||t==='dark')d.setAttribute('data-theme',t);if(JSON.parse(s.getItem('smh-mode'))==='steps')d.className+=' mode-steps'}catch(e){}})(document.documentElement)`;

function fallbackMeta(site, kind, subject, page) {
  const { tr } = tools(site);
  const path = pagePath(kind, subject);
  const name = tr('site.name');
  const abs = (lang) => (site.siteUrl ? site.abs(path, lang) : '');
  const crumbs = page.crumbs || [];
  const jsonld = [];
  if (kind === 'home' && site.siteUrl) {
    jsonld.push({
      '@context': 'https://schema.org', '@type': 'WebSite', name, url: site.abs(''), inLanguage: site.lang,
      potentialAction: { '@type': 'SearchAction', target: site.abs('search/') + '?q={search_term_string}', 'query-input': 'required name=search_term_string' }
    });
  }
  if (crumbs.length && site.siteUrl) {
    jsonld.push({
      '@context': 'https://schema.org', '@type': 'BreadcrumbList',
      itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: site.abs(c.path) }))
    });
  }
  return {
    title: kind === 'home' ? `${name}: ${tr('site.tagline').toLowerCase()}` : `${page.title} | ${name}`,
    description: page.description || tr('site.description'),
    canonical: kind === '404' ? '' : abs(site.lang),
    alternates: kind === '404' || !site.siteUrl ? {} : { ru: abs('ru'), en: abs('en'), 'x-default': abs('ru') },
    jsonld,
    noindex: kind === '404' || kind === 'search'
  };
}

export function pageMeta(site, kind, subject, page) {
  if (seo?.pageMeta) return seo.pageMeta(site, kind, subject);
  return fallbackMeta(site, kind, subject, page);
}

function head(site, meta, page) {
  const { tr } = tools(site);
  const lang = site.lang;
  const ogImage = site.siteUrl ? site.abs('og.png', 'ru') : asset(site, 'og.png');
  const alternates = Object.entries(meta.alternates || {})
    .filter(([, url]) => url)
    .map(([hl, url]) => `<link rel="alternate" hreflang="${attr(hl)}" href="${attr(url)}">`).join('');
  const og = [
    ['og:type', page.kind === 'guide' ? 'article' : 'website'],
    ['og:site_name', tr('site.name')],
    ['og:title', page.ogTitle || meta.title],
    ['og:description', meta.description],
    ['og:url', meta.canonical],
    ['og:image', ogImage],
    ['og:image:width', '1200'],
    ['og:image:height', '630'],
    ['og:locale', OG_LOCALE[lang]],
    ['og:locale:alternate', OG_LOCALE[lang === 'ru' ? 'en' : 'ru']]
  ].filter(([, v]) => v).map(([p, v]) => `<meta property="${p}" content="${attr(v)}">`).join('');
  const tw = [
    ['twitter:card', 'summary_large_image'],
    ['twitter:title', page.ogTitle || meta.title],
    ['twitter:description', meta.description],
    ['twitter:image', ogImage]
  ].map(([n, v]) => `<meta name="${n}" content="${attr(v)}">`).join('');
  const ld = (meta.jsonld || []).map((o) => `<script type="application/ld+json">${jsonScript(o)}</script>`).join('');
  return `<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(meta.title)}</title>
<meta name="description" content="${attr(meta.description)}">
${meta.noindex ? '<meta name="robots" content="noindex">\n' : ''}${meta.canonical ? `<link rel="canonical" href="${attr(meta.canonical)}">\n` : ''}${alternates}
<meta name="color-scheme" content="light dark">
<meta name="theme-color" content="#fbf7f1" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#141a24" media="(prefers-color-scheme: dark)">
<link rel="icon" href="${attr(asset(site, 'favicon.ico'))}" sizes="32x32">
<link rel="icon" href="${attr(asset(site, 'favicon.svg'))}" type="image/svg+xml">
<link rel="apple-touch-icon" href="${attr(asset(site, 'apple-touch-icon.png'))}">
<link rel="stylesheet" href="${attr(asset(site, 'assets/site.css'))}">
<style>${categoryCss(site.categories)}</style>
<script>${BOOT}</script>
${og}
${tw}
${ld}
<script type="module" src="${attr(asset(site, 'assets/js/client/app.js'))}"></script>
</head>`;
}

function langSwitch(site, page) {
  const other = site.lang === 'ru' ? 'en' : 'ru';
  const path = page.kind === '404' ? '' : pagePath(page.kind, page.subject);
  const { tr } = tools(site);
  return `<a class="tool lang-switch" href="${attr(site.href(path, other))}" hreflang="${other}" lang="${other}" data-lang-switch="${other}" title="${attr(tr('lang.other'))}">${icon('globe')}<span>${tr('lang.otherShort')}</span></a>`;
}

function themeButton(site) {
  const { tr } = tools(site);
  return `<button class="tool theme-toggle" type="button" data-theme-toggle data-js aria-label="${attr(tr('theme.label'))}: ${attr(tr('theme.system'))}" data-labels="${attr(JSON.stringify({ label: tr('theme.label'), system: tr('theme.system'), light: tr('theme.light'), dark: tr('theme.dark') }))}">${icon('monitor', 'when-system')}${icon('sun', 'when-light')}${icon('moon', 'when-dark')}</button>`;
}

function themeSeg(site, extra) {
  const { tr } = tools(site);
  const buttons = ['system', 'light', 'dark'].map((k) => `<button type="button" class="seg-btn" data-theme-set="${k}" aria-pressed="${k === 'system'}">${icon({ system: 'monitor', light: 'sun', dark: 'moon' }[k])}<span>${esc(tr('theme.' + k))}</span></button>`).join('');
  return `<div class="seg ${extra}" role="group" aria-label="${attr(tr('theme.label'))}" data-js>${buttons}</div>`;
}

function categoryMenu(site, extra = '') {
  return `<ul class="cat-menu${extra}">${site.categories.map((c) => `<li><a class="cat-menu-item c-${c.id}" href="${attr(site.href(c.id + '/'))}"><span class="cat-menu-icon">${catIcon(c)}</span><span class="cat-menu-text"><span class="cat-menu-name">${esc(c.name)}</span><span class="cat-menu-count">${tools(site).tr('count.guides', { n: c.count || 0 })}</span></span></a></li>`).join('')}</ul>`;
}

function header(site, page) {
  const { tr } = tools(site);
  const nav = [
    ['guides/', tr('nav.catalog'), 'catalog'],
    ['stats/', tr('nav.stats'), 'stats'],
    ['requests/', tr('nav.requests'), 'requests']
  ];
  const navLinks = nav.map(([p, label, kind]) => `<a class="nav-link" href="${attr(site.href(p))}"${page.kind === kind ? ' aria-current="page"' : ''}>${esc(label)}</a>`).join('');
  return `<header class="site-header">
<div class="wrap header-in">
<a class="logo" href="${attr(site.href(''))}"${page.kind === 'home' ? ' aria-current="page"' : ''}>${logoMark()}<span class="logo-name">${esc(tr('site.name'))}</span></a>
<nav class="main-nav" aria-label="${attr(tr('nav.menu'))}">
<details class="dropdown cats-dd"><summary class="nav-link">${esc(tr('nav.categories'))}${icon('chevron-down', 'dd-chev')}</summary><div class="dropdown-panel">${categoryMenu(site)}<a class="dropdown-all" href="${attr(site.href('guides/'))}">${esc(tr('nav.allCategories'))}${icon('arrow-right')}</a></div></details>
${navLinks}
</nav>
<div class="header-tools">
<a class="search-trigger" href="${attr(site.href('search/'))}" data-palette-open aria-label="${attr(tr('search.label'))}">${icon('search')}<span class="search-trigger-text">${esc(tr('search.short'))}</span><kbd class="search-trigger-kbd">Ctrl K</kbd></a>
${langSwitch(site, page)}
${themeButton(site)}
<details class="dropdown mobile-menu"><summary class="tool" aria-label="${attr(tr('nav.menu'))}">${icon('menu', 'when-closed')}${icon('close', 'when-open')}</summary><div class="dropdown-panel mobile-panel">
<nav class="mobile-links" aria-label="${attr(tr('nav.menu'))}"><a href="${attr(site.href('guides/'))}">${icon('layers')}${esc(tr('nav.catalog'))}</a><a href="${attr(site.href('stats/'))}">${icon('chart')}${esc(tr('nav.stats'))}</a><a href="${attr(site.href('requests/'))}">${icon('request')}${esc(tr('nav.requests'))}</a><a href="${attr(site.href('contribute/'))}">${icon('edit')}${esc(tr('nav.contribute'))}</a></nav>
<p class="mobile-label">${esc(tr('nav.categories'))}</p>
${categoryMenu(site, ' cat-menu-compact')}
${themeSeg(site, 'mobile-theme')}
</div></details>
</div>
</div>
</header>`;
}

function footer(site) {
  const { tr } = tools(site);
  const links = [
    [site.href('guides/'), tr('nav.catalog')],
    [site.href('stats/'), tr('nav.stats')],
    [site.href('requests/'), tr('nav.requests')],
    [site.href('contribute/'), tr('nav.contribute')]
  ];
  const ext = [
    [REPO, tr('footer.github')],
    [REPO + '/blob/main/CONTRIBUTING.md', 'CONTRIBUTING.md']
  ];
  const agents = [
    [asset(site, 'llms.txt'), 'llms.txt'],
    [asset(site, 'guides.json'), 'guides.json'],
    [asset(site, 'sitemap.xml'), 'sitemap.xml']
  ];
  return `<footer class="site-footer">
<div class="wrap footer-in">
<div class="footer-brand">
<a class="logo" href="${attr(site.href(''))}">${logoMark()}<span class="logo-name">${esc(tr('site.name'))}</span></a>
<p>${esc(tr('footer.about'))}</p>
${themeSeg(site, 'theme-seg')}
</div>
<div class="footer-col"><p class="footer-title">${esc(tr('footer.categories'))}</p><ul class="footer-cats">${site.categories.map((c) => `<li><a href="${attr(site.href(c.id + '/'))}">${esc(c.name)}</a></li>`).join('')}</ul></div>
<div class="footer-col"><p class="footer-title">${esc(tr('footer.project'))}</p><ul>${links.map(([h, l]) => `<li><a href="${attr(h)}">${esc(l)}</a></li>`).join('')}${ext.map(([h, l]) => `<li><a href="${attr(h)}" rel="noopener" target="_blank">${esc(l)}</a></li>`).join('')}</ul>
<p class="footer-title">${esc(tr('footer.agents'))}</p><ul class="footer-mono">${agents.map(([h, l]) => `<li><a href="${attr(h)}">${esc(l)}</a></li>`).join('')}</ul></div>
</div>
<div class="wrap footer-bottom"><p>${esc(tr('footer.license'))}</p><p>${langSwitchText(site)}</p></div>
</footer>`;
}

function langSwitchText(site) {
  return site.langs.map((l) => `<span lang="${l}">${esc(tools(site).tr('lang.' + l))}</span>`).join(' / ');
}

function palette(site) {
  const { tr } = tools(site);
  return `<dialog class="palette" id="palette" aria-label="${attr(tr('search.label'))}">
<div class="palette-box">
<form class="palette-field" role="search" action="${attr(site.href('search/'))}" method="get">
${icon('search')}
<input class="palette-input" id="palette-q" name="q" type="search" autocomplete="off" spellcheck="false" placeholder="${attr(tr('search.placeholder'))}" aria-label="${attr(tr('search.label'))}" role="combobox" aria-expanded="true" aria-controls="palette-list" aria-autocomplete="list">
<button class="palette-close" type="button" data-palette-close aria-label="${attr(tr('search.close'))}"><kbd>Esc</kbd></button>
</form>
<div class="palette-body" id="palette-body"><p class="palette-status" aria-live="polite"></p><ul class="palette-list" id="palette-list" role="listbox"></ul></div>
<div class="palette-foot"><span><kbd>${icon('chevron-down', 'flip')}</kbd><kbd>${icon('chevron-down')}</kbd> ${esc(tr('search.hintNav'))}</span><span><kbd>Enter</kbd> ${esc(tr('search.hintOpen'))}</span><span><kbd>Esc</kbd> ${esc(tr('search.hintClose'))}</span></div>
</div>
</dialog>`;
}

// Data the browser needs to label results without another request.
function dataIsland(site) {
  const cats = {};
  for (const c of site.categories) cats[c.id] = { n: c.name, i: c.icon };
  const tasks = {};
  for (const k of site.tasks) tasks[k.id] = { n: k.name, v: k.verb, c: k.count || 0 };
  return `<script type="application/json" id="smh-data">${jsonScript({ cats, tasks, repo: REPO })}</script>`;
}

function agentNote(site) {
  const { tr } = tools(site);
  const link = (p, label) => `<a href="${attr(site.siteUrl ? site.abs(p, 'ru') : asset(site, p))}">${label}</a>`;
  return `<div class="sr-only agent-note">${tr('site.agentNote', { llms: link('llms.txt', 'llms.txt'), guides: link('guides.json', 'guides.json'), api: link('api/', 'api/&lt;slug&gt;.json') })}</div>`;
}

// page: {kind, subject, title, description, body, accent: category|null, crumbs, bodyClass}
export function layout(site, page) {
  const meta = pageMeta(site, page.kind, page.subject, page);
  const { tr } = tools(site);
  const html = `<!doctype html>
<html lang="${site.lang}" data-lang="${site.lang}" data-base="${attr(site.base)}" data-search="${attr(asset(site, `assets/search.${site.lang}.json`))}" data-icons="${attr(asset(site, 'assets/icons.svg'))}" data-site-url="${attr(site.siteUrl || '')}">
${head(site, meta, page)}
<body class="${cls('kind-' + page.kind, page.accent && 'c-' + page.accent.id, page.bodyClass)}">
${agentNote(site)}
<a class="skip-link" href="#main">${esc(tr('nav.skip'))}</a>
${header(site, page)}
<main id="main" class="${cls('main', page.mainClass)}">
${page.body}
</main>
${footer(site)}
${palette(site)}
<div class="toast" id="toast" role="status" aria-live="polite"></div>
${dataIsland(site)}
</body>
</html>
`;
  return html;
}
