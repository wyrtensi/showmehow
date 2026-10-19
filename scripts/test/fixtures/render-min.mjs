// Minimal renderer for build tests: every render function of docs/spec.md 7 with bare HTML.
import { pagePath, outputFile } from '../../../src/lib/paths.js';
import { pageMeta } from '../../../src/lib/seo.js';
import { escapeHtml as esc } from '../../../src/lib/markdown.js';

function page(site, kind, subject, body) {
  const meta = pageMeta(site, kind, subject);
  const alt = Object.entries(meta.alternates).map(([hl, u]) => `<link rel="alternate" hreflang="${hl}" href="${esc(u)}">`).join('');
  const ld = meta.jsonld.map((o) => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, '\\u003c')}</script>`).join('');
  const html = `<!doctype html><html lang="${site.lang}"><head><meta charset="utf-8"><title>${esc(meta.title)}</title>` +
    `<meta name="description" content="${esc(meta.description)}">${meta.noindex ? '<meta name="robots" content="noindex">' : ''}` +
    `${meta.canonical ? `<link rel="canonical" href="${esc(meta.canonical)}">` : ''}${alt}${ld}` +
    `<link rel="stylesheet" href="${site.href('assets/site.css', 'ru')}"><script type="module" src="${site.asset('assets/js/client/app.js')}"></script>` +
    `</head><body><p class="sr-only">Data: ${site.abs('llms.txt', 'ru')}</p>${body}</body></html>`;
  return { path: outputFile(pagePath(kind, subject)), html };
}

const list = (site, guides) => `<ul>${guides.map((g) => `<li><a href="${site.href(g.path)}">${esc(g.title)}</a></li>`).join('')}</ul>`;

export const renderHome = (site) => page(site, 'home', null, `<h1>Home</h1>${list(site, site.guides)}`);
export const renderGuide = (site, g) => page(site, 'guide', g, `<h1>${esc(g.title)}</h1>${g.introHtml}` +
  g.steps.map((s) => `<section id="${s.id}"><h2>${esc(s.title)}</h2>${s.image ? (s.image.kind === 'svg' ? s.image.svg : `<img src="${s.image.src}" alt="${esc(s.image.alt)}">`) : ''}${s.html}</section>`).join(''));
export const renderCategory = (site, c) => page(site, 'category', c, `<h1>${esc(c.name)}</h1>${list(site, site.byCategory[c.id])}`);
export const renderDevice = (site, d) => page(site, 'device', d, `<h1>${esc(d.name)}</h1>${list(site, site.byDevice[d.id])}`);
export const renderBrand = (site, b) => page(site, 'brand', b, `<h1>${esc(b.name)}</h1>${list(site, site.byBrand[b.id])}`);
export const renderTask = (site, t) => page(site, 'task', t, `<h1>${esc(t.name)}</h1>${list(site, site.byTask[t.id])}`);
export const renderCatalog = (site) => page(site, 'catalog', null, `<h1>Catalog</h1>${list(site, site.guides)}`);
export const renderSearch = (site) => page(site, 'search', null, '<h1>Search</h1>');
export const renderStats = (site) => page(site, 'stats', null, `<h1>Stats</h1><p>${site.totals.guides}</p>`);
export const renderRequests = (site) => page(site, 'requests', null, '<h1>Requests</h1>');
export const renderContribute = (site) => page(site, 'contribute', null, '<h1>Contribute</h1>');
export const render404 = (site) => page(site, '404', null, '<h1>Not found</h1>');
