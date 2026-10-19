// Building blocks shared by several pages.
import { esc, attr, cls, tools, issueUrl } from './util.js';
import { icon, catIcon, taskIcon } from './icons.js';
import { emptyArt } from './art.js';

export function difficulty(site, level) {
  const { tr } = tools(site);
  const n = { easy: 1, medium: 2, hard: 3 }[level] || 1;
  return `<span class="diff diff-${esc(level)}" title="${attr(tr('diff.label'))}"><span class="diff-bars" aria-hidden="true">${[1, 2, 3].map((i) => `<i${i <= n ? ' class="on"' : ''}></i>`).join('')}</span>${esc(tr('diff.' + level))}</span>`;
}

// One guide card. Data attributes feed the client-side filters and sorting.
export function guideCard(site, g, { level = 3 } = {}) {
  const { tr, minutes } = tools(site);
  const steps = g.stats?.steps ?? g.steps.length;
  const h = `h${level}`;
  const data = [
    ['c', g.category.id], ['d', g.device.id], ['b', g.brands.map((b) => b.id).join(' ')], ['k', g.task.id],
    ['f', g.difficulty], ['m', g.time], ['u', g.updated], ['t', g.title.toLowerCase()]
  ].map(([k, v]) => ` data-${k}="${attr(v)}"`).join('');
  return `<article class="gcard c-${g.category.id}"${data}>
<div class="gcard-art" aria-hidden="true"><span class="gcard-blob">${catIcon(g.category, 'gcard-cat')}</span><span class="gcard-task">${taskIcon(g.task)}</span><span class="gcard-time">${icon('clock')}${esc(minutes(g.time))}</span></div>
<div class="gcard-body">
<p class="gcard-kicker">${esc(g.device.name)}<span class="dot"></span>${esc(g.task.name)}</p>
<${h} class="gcard-title"><a class="gcard-link" href="${attr(site.href(g.path))}">${esc(g.title)}</a></${h}>
<p class="gcard-sum">${esc(g.summary)}</p>
<p class="gcard-meta"><span>${icon('steps')}${esc(tr('count.steps', { n: steps }))}</span>${difficulty(site, g.difficulty)}${g.fallback ? `<span class="gcard-lang" title="${attr(tr('guide.fallback'))}">RU</span>` : ''}</p>
</div>
</article>`;
}

export function cardGrid(site, guides, opts = {}) {
  return `<div class="${cls('card-grid', opts.cls)}"${opts.attrs || ''}>${guides.map((g) => guideCard(site, g, opts)).join('')}</div>`;
}

export function crumbs(site, items) {
  const { tr } = tools(site);
  const all = [{ name: tr('nav.home'), path: '' }, ...items];
  return `<nav class="crumbs" aria-label="${attr(tr('crumb.label'))}"><ol>${all.map((c, i) => (i === all.length - 1
    ? `<li><span aria-current="page">${esc(c.name)}</span></li>`
    : `<li><a href="${attr(site.href(c.path))}">${i === 0 ? icon('home') : ''}${esc(c.name)}</a>${icon('chevron-right', 'crumb-sep')}</li>`)).join('')}</ol></nav>`;
}

export function sectionHead(title, { id, lead, link, icon: ic, level = 2 } = {}) {
  return `<div class="section-head">${ic ? `<span class="section-icon">${icon(ic)}</span>` : ''}<div class="section-titles"><h${level} class="section-title"${id ? ` id="${attr(id)}"` : ''}>${esc(title)}</h${level}>${lead ? `<p class="section-lead">${esc(lead)}</p>` : ''}</div>${link ? `<a class="section-link" href="${attr(link.href)}">${esc(link.label)}${icon('arrow-right')}</a>` : ''}</div>`;
}

export function requestHref(site, extra = {}) {
  const q = new URLSearchParams(extra).toString();
  return site.href('requests/') + (q ? '?' + q : '');
}

export function emptyState(site, { title, text, query = {} } = {}) {
  const { tr } = tools(site);
  return `<div class="empty">${emptyArt()}<h2 class="empty-title">${esc(title || tr('listing.empty'))}</h2><p>${esc(text || tr('listing.emptyText'))}</p><a class="btn btn-primary" href="${attr(requestHref(site, query))}">${icon('request')}${esc(tr('search.request'))}</a></div>`;
}

// Hero band for listing pages: colour, icon, title, counts.
export function listingHero(site, { kicker, title, lead, iconHtml, accent, stats = [], crumbItems, after = '' }) {
  return `<section class="${cls('band listing-hero', accent && 'c-' + accent.id)}">
<div class="wrap">
${crumbs(site, crumbItems)}
<div class="listing-hero-in">
<div class="listing-icon" aria-hidden="true">${iconHtml}</div>
<div class="listing-text">
<p class="kicker">${esc(kicker)}</p>
<h1 class="page-title">${esc(title)}</h1>
${lead ? `<p class="page-lead">${esc(lead)}</p>` : ''}
${stats.length ? `<ul class="hero-stats">${stats.map((s) => `<li>${s.icon ? icon(s.icon) : ''}<span>${esc(s.text)}</span></li>`).join('')}</ul>` : ''}
</div>
</div>
${after}
</div>
</section>`;
}

// Facet filters + sort over a card grid; works as a plain list without JavaScript.
// facets: [{key, label, items: [{id, name, count}]}]
export function facetedList(site, guides, facets, { sort = true, id = 'list' } = {}) {
  const { tr } = tools(site);
  if (!guides.length) return emptyState(site);
  const facetHtml = facets.filter((f) => f.items.length > 1).map((f) => `<fieldset class="facet" data-facet="${f.key}">
<legend class="facet-title">${esc(f.label)}</legend>
<div class="facet-chips">${f.items.map((it) => `<label class="chip-check${it.cls ? ' ' + it.cls : ''}"><input type="checkbox" name="${f.key}" value="${attr(it.id)}"><span class="chip">${it.icon || ''}<span class="chip-name">${esc(it.name)}</span><span class="chip-count" data-count-for="${attr(it.id)}">${it.count}</span></span></label>`).join('')}</div>
</fieldset>`).join('');
  const sortHtml = sort ? `<label class="sort" data-js>${icon('sort')}<span class="sr-only">${esc(tr('sort.label'))}</span><select name="sort" data-sort>${['new', 'az', 'quick'].map((k) => `<option value="${k}">${esc(tr('sort.' + k))}</option>`).join('')}</select></label>` : '';
  const filters = facetHtml ? `<details class="filters" open data-filters data-js><summary class="filters-toggle">${icon('filter')}<span>${esc(tr('filter.title'))}</span><span class="filters-active" data-active-count></span>${icon('chevron-down', 'dd-chev')}</summary><form class="filters-form" data-filter-form>${facetHtml}<div class="filters-actions"><button class="btn btn-ghost btn-sm" type="reset" data-filter-reset>${icon('refresh')}${esc(tr('filter.reset'))}</button></div></form></details>` : '';
  return `<div class="${cls('faceted', filters && 'has-filters')}" id="${attr(id)}" data-faceted>
${filters}
<div class="faceted-bar"><p class="faceted-count" aria-live="polite" data-shown data-template="${attr(tr('catalog.shown', { n: '{n}', total: '{total}' }))}">${esc(tr('count.guides', { n: guides.length }))}</p>${sortHtml}</div>
${cardGrid(site, guides, { attrs: ' data-cards' })}
<div class="faceted-none" data-none hidden>${emptyArt()}<p class="empty-title">${esc(tr('catalog.none'))}</p><p>${esc(tr('catalog.noneText'))}</p><button class="btn btn-ghost" type="button" data-filter-reset>${icon('refresh')}${esc(tr('filter.reset'))}</button></div>
</div>`;
}

// Counts of a facet over a set of guides, keeping taxonomy order.
export function facetItems(list, guides, pick) {
  const counts = new Map();
  for (const g of guides) for (const id of [].concat(pick(g))) counts.set(id, (counts.get(id) || 0) + 1);
  return list.filter((x) => counts.has(x.id)).map((x) => ({ id: x.id, name: x.name, count: counts.get(x.id) }));
}

export function standardFacets(site, guides, skip = []) {
  const { tr } = tools(site);
  const diffs = ['easy', 'medium', 'hard'].map((id) => ({ id, name: tr('diff.' + id) }));
  return [
    { key: 'c', label: tr('filter.category'), items: facetItems(site.categories, guides, (g) => g.category.id).map((it) => ({ ...it, cls: 'c-' + it.id, icon: catIcon(site.categories.find((c) => c.id === it.id)) })) },
    { key: 'd', label: tr('filter.device'), items: facetItems(site.devices, guides, (g) => g.device.id) },
    { key: 'b', label: tr('filter.brand'), items: facetItems(site.brands, guides, (g) => g.brands.map((b) => b.id)) },
    { key: 'k', label: tr('filter.task'), items: facetItems(site.tasks, guides, (g) => g.task.id).map((it) => ({ ...it, icon: taskIcon(it) })) },
    { key: 'f', label: tr('filter.difficulty'), items: facetItems(diffs, guides, (g) => g.difficulty) }
  ].filter((f) => !skip.includes(f.key));
}

// The prefilled fix issue (.github/ISSUE_TEMPLATE/fix-guide.yml); `problem` prefills its textarea
// (the faq "did not help" links).
export function fixIssueHref(site, guide, problem = '') {
  const { tr } = tools(site);
  return issueUrl({ template: 'fix-guide.yml', title: tr('guide.fixTitle', { title: guide.title }), guide: site.abs(guide.path), problem });
}
