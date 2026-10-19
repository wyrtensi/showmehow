// Stats, requests, contribute, search and 404.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { esc, attr, cls, tools, REPO } from './util.js';
import { icon, catIcon, taskIcon } from './icons.js';
import { requestArt, contributeArt, notFoundArt } from './art.js';
import { crumbs, sectionHead, listingHero, difficulty } from './components.js';
import { heroSearch } from './home.js';
import { layout } from './layout.js';

// The request issue form (.github/ISSUE_TEMPLATE/request-guide.yml) lists categories as
// "<ru name> / <en name>"; a prefilled dropdown value must match an option exactly.
const REQUEST_OTHER = 'Другое / Other';
const requestLabels = Object.fromEntries(
  JSON.parse(readFileSync(join(import.meta.dirname, '..', '..', 'taxonomy', 'categories.json'), 'utf8')).map((c) => [c.id, `${c.ru.name} / ${c.en.name}`])
);

const REQUESTS_API = 'https://api.github.com/repos/wyrtensi/showmehow/issues?labels=request&state=open&per_page=100';
const REQUESTS_HTML = `${REPO}/issues?q=is%3Aissue+is%3Aopen+label%3Arequest+sort%3Areactions-%2B1-desc`;

// Horizontal bar chart. rows: [{name, n, href?, cls?, iconHtml?}]
function bars(rows, { max } = {}) {
  const top = max || Math.max(1, ...rows.map((r) => r.n));
  return `<ul class="bars">${rows.map((r) => {
    const label = `${r.iconHtml ? `<span class="bar-icon">${r.iconHtml}</span>` : ''}<span class="bar-name">${esc(r.name)}</span>`;
    return `<li class="${cls('bar-row', r.cls, !r.n && 'is-zero')}">${r.href ? `<a class="bar-label" href="${attr(r.href)}">${label}</a>` : `<span class="bar-label">${label}</span>`}<span class="bar-track"><span class="bar-fill" style="--v:${(r.n / top).toFixed(3)}"></span></span><span class="bar-n">${r.n}</span></li>`;
  }).join('')}</ul>`;
}

function donut(parts, centerTop, centerBottom) {
  const total = parts.reduce((s, p) => s + p.n, 0) || 1;
  let offset = 0;
  const arcs = parts.map((p) => {
    const len = (p.n / total) * 100;
    const arc = len > 0 ? `<circle class="donut-seg ${p.cls}" cx="60" cy="60" r="46" pathLength="100" stroke-dasharray="${len.toFixed(2)} ${(100 - len).toFixed(2)}" stroke-dashoffset="${(-offset).toFixed(2)}"/>` : '';
    offset += len;
    return arc;
  }).join('');
  return `<div class="donut"><svg viewBox="0 0 120 120" aria-hidden="true"><circle class="donut-bg" cx="60" cy="60" r="46"/>${arcs}</svg><span class="donut-center"><span class="donut-n">${esc(centerTop)}</span><span class="donut-l">${esc(centerBottom)}</span></span></div>`;
}

const panel = (title, ic, inner, extra = '') => `<section class="panel${extra ? ' ' + extra : ''}"><h2 class="panel-title">${icon(ic)}${esc(title)}</h2>${inner}</section>`;

export function renderStats(site) {
  const { tr, date } = tools(site);
  const T = site.totals;
  const guides = site.guides;
  const n = guides.length || 1;
  const avgTime = Math.round(guides.reduce((s, g) => s + g.time, 0) / n);
  const avgSteps = (guides.reduce((s, g) => s + g.steps.length, 0) / n).toFixed(1).replace(/\.0$/, '');
  const byDiff = ['easy', 'medium', 'hard'].map((d) => ({ id: d, n: guides.filter((g) => g.difficulty === d).length }));
  const topDevices = site.devices.filter((d) => d.count).sort((a, b) => b.count - a.count).slice(0, 10);
  const topBrands = site.brands.filter((b) => b.count && b.id !== 'generic').sort((a, b) => b.count - a.count).slice(0, 10);
  const big = [
    ['layers', T.guides, 'totals.guides'], ['steps', T.steps, 'totals.steps'], ['image', T.illustrations, 'totals.illustrations'],
    ['device', T.devices, 'totals.devices'], ['tag', T.brands, 'totals.brands'], ['book', T.sources, 'totals.sources']
  ];
  const crumbItems = [{ name: tr('stats.title'), path: 'stats/' }];
  const enShare = T.guides ? Math.round((T.withEnglish / T.guides) * 100) : 0;
  const body = `${listingHero(site, { kicker: tr('site.name'), title: tr('stats.title'), lead: tr('stats.lead'), iconHtml: icon('chart'), crumbItems, stats: site.updatedAt ? [{ icon: 'clock', text: tr('stats.updatedAt', { date: date(site.updatedAt) }) }] : [] })}
<section class="section wrap">
<ul class="big-numbers">${big.map(([ic, v, key]) => `<li class="big-number">${icon(ic)}<span class="big-n">${v ?? 0}</span><span class="big-l">${esc(tr(key, { n: v ?? 0 }))}</span></li>`).join('')}</ul>
</section>
<section class="section wrap stats-grid">
${panel(tr('stats.byCategory'), 'grid', bars(site.categories.map((c) => ({ name: c.name, n: c.count || 0, href: site.href(c.id + '/'), cls: 'c-' + c.id, iconHtml: catIcon(c) }))), 'panel-wide')}
${panel(tr('stats.byTask'), 'sparkle', bars(site.tasks.filter((k) => k.count).map((k) => ({ name: k.name, n: k.count, href: site.href('task/' + k.id + '/'), iconHtml: taskIcon(k) }))))}
${panel(tr('stats.byDifficulty'), 'gauge', `<div class="donut-wrap">${donut(byDiff.map((d) => ({ n: d.n, cls: 'seg-' + d.id })), String(T.guides), tr('totals.guides', { n: T.guides }))}<ul class="legend">${byDiff.map((d) => `<li><span class="legend-dot seg-${d.id}"></span>${difficulty(site, d.id)}<span class="legend-n">${d.n}</span></li>`).join('')}</ul></div>`)}
${panel(tr('stats.byDevice'), 'device', topDevices.length ? bars(topDevices.map((d) => ({ name: d.plural || d.name, n: d.count, href: site.href('device/' + d.id + '/'), cls: 'c-' + d.category }))) : `<p class="muted">${esc(tr('stats.empty'))}</p>`)}
${panel(tr('stats.byBrand'), 'tag', topBrands.length ? bars(topBrands.map((b) => ({ name: b.name, n: b.count, href: site.href('brand/' + b.id + '/') }))) : `<p class="muted">${esc(tr('stats.empty'))}</p>`)}
${panel(tr('stats.languages'), 'globe', `<div class="donut-wrap">${donut([{ n: T.withEnglish, cls: 'seg-en' }, { n: T.guides - T.withEnglish, cls: 'seg-ru' }], enShare + '%', 'EN')}<ul class="legend"><li><span class="legend-dot seg-en"></span>${esc(tr('stats.withEnglish'))}<span class="legend-n">${T.withEnglish}</span></li><li><span class="legend-dot seg-ru"></span>${esc(tr('stats.ruOnly'))}<span class="legend-n">${T.guides - T.withEnglish}</span></li></ul></div>`)}
${panel(tr('stats.content'), 'clock', `<ul class="mini-stats"><li><span class="mini-n">${avgTime}</span><span class="mini-l">${esc(tr('unit.min', { n: '' }).trim())}, ${esc(tr('stats.avgTime'))}</span></li><li><span class="mini-n">${avgSteps}</span><span class="mini-l">${esc(tr('stats.avgSteps'))}</span></li><li><span class="mini-n">${T.categories}</span><span class="mini-l">${esc(tr('totals.categories', { n: T.categories }))}</span></li></ul>`)}
${panel(tr('stats.latest'), 'refresh', `<ol class="latest">${guides.slice(0, 8).map((g) => `<li class="c-${g.category.id}"><a href="${attr(site.href(g.path))}"><span class="latest-icon">${catIcon(g.category)}</span><span class="latest-title">${esc(g.title)}</span><time datetime="${attr(g.updated)}">${esc(date(g.updated))}</time></a></li>`).join('')}</ol>`, 'panel-wide')}
${panel(tr('stats.topRequests'), 'thumb', requestsBox(site, 'top'), 'panel-wide')}
</section>`;
  return { path: 'stats/index.html', html: layout(site, { kind: 'stats', subject: null, title: tr('stats.title'), description: tr('stats.lead'), body, crumbs: crumbItems, mainClass: 'stats' }) };
}

function requestsBox(site, mode) {
  const { tr } = tools(site);
  return `<div class="requests" data-requests="${mode}" data-api="${attr(REQUESTS_API)}" data-labels="${attr(JSON.stringify({ votes: [tr('count.votes', { n: 1 }), tr('count.votes', { n: 2 }), tr('count.votes', { n: 5 })], error: tr('req.error'), none: tr('req.none'), open: tr('stats.requests') }))}">
<p class="requests-status" data-requests-status>${icon('refresh', 'spin')}${esc(tr('req.loading'))}</p>
<noscript><p class="muted">${esc(tr('req.noscript'))}</p></noscript>
<ol class="request-list" data-requests-list></ol>
<p class="requests-more"><a href="${attr(REQUESTS_HTML)}" rel="noopener" target="_blank">${esc(tr('req.all'))}${icon('external')}</a></p>
</div>`;
}

export function renderRequests(site) {
  const { tr } = tools(site);
  const crumbItems = [{ name: tr('req.title'), path: 'requests/' }];
  const langs = [['Русский', tr('lang.ru')], ['English', tr('lang.en')]];
  const form = `<form class="req-form card" action="${REPO}/issues/new" method="get" target="_blank" rel="noopener" data-request-form data-prefix="${attr(tr('req.titlePrefix'))}">
<input type="hidden" name="template" value="request-guide.yml">
<input type="hidden" name="title" value="" data-request-title disabled>
<div class="field"><label for="rq-device">${esc(tr('req.device'))}</label><input id="rq-device" name="device" type="text" required maxlength="120" placeholder="${attr(tr('req.devicePh'))}" autocomplete="off"></div>
<div class="field"><label for="rq-goal">${esc(tr('req.goal'))}</label><textarea id="rq-goal" name="goal" rows="3" required maxlength="600" placeholder="${attr(tr('req.goalPh'))}"></textarea></div>
<div class="field-row">
<div class="field"><label for="rq-category">${esc(tr('req.category'))}</label><span class="select"><select id="rq-category" name="category"><option value="${attr(REQUEST_OTHER)}">${esc(tr('req.categoryAny'))}</option>${site.categories.map((c) => `<option value="${attr(requestLabels[c.id] || c.name)}" data-id="${attr(c.id)}">${esc(c.name)}</option>`).join('')}</select>${icon('chevron-down')}</span></div>
<div class="field"><label for="rq-language">${esc(tr('req.language'))}</label><span class="select"><select id="rq-language" name="language">${langs.map(([v, l]) => `<option value="${attr(v)}"${(site.lang === 'ru') === (v === 'Русский') ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select>${icon('chevron-down')}</span></div>
</div>
<button class="btn btn-primary btn-lg" type="submit">${icon('external')}${esc(tr('req.submit'))}</button>
<p class="form-note">${icon('info')}${esc(tr('req.note'))}</p>
</form>`;
  const tips = [['device', 'req.why1'], ['sparkle', 'req.why2'], ['thumb', 'req.why3']];
  const body = `<section class="band page-hero">
<div class="wrap">
${crumbs(site, crumbItems)}
<div class="page-hero-in">
<div><p class="kicker">${esc(tr('site.name'))}</p><h1 class="page-title">${esc(tr('req.title'))}</h1><p class="page-lead">${esc(tr('req.lead'))}</p>
<ul class="tips">${tips.map(([ic, k]) => `<li><span class="tip-icon">${icon(ic)}</span><span><strong>${esc(tr(k))}</strong> ${esc(tr(k + 'Text'))}</span></li>`).join('')}</ul></div>
<div class="page-hero-art">${requestArt()}</div>
</div>
</div>
</section>
<div class="wrap req-layout">
${form}
<section class="req-open" aria-labelledby="h-open">${sectionHead(tr('req.open'), { id: 'h-open', icon: 'thumb', lead: tr('req.openLead') })}${requestsBox(site, 'list')}</section>
</div>`;
  return { path: 'requests/index.html', html: layout(site, { kind: 'requests', subject: null, title: tr('req.title'), description: tr('req.lead'), body, crumbs: crumbItems, mainClass: 'requests-page' }) };
}

const TEMPLATE = `---
title: Как подключить колонку JBL Flip 6 к телефону
summary: Включите режим сопряжения кнопкой Bluetooth и выберите колонку в настройках телефона.
category: audio
device: speaker
brands: [jbl]
task: pair
difficulty: easy
time: 3
tools: [Телефон с Bluetooth]
sources:
  - title: JBL Flip 6 Quick Start Guide
    url: https://www.jbl.com/...
    publisher: JBL
updated: 2026-10-19
authors: [your-github-login]
---

Короткое вступление: что получится в конце.

## Включите колонку

Нажмите кнопку питания, пока не загорится индикатор.

![Колонка сверху, палец на кнопке Bluetooth](step-2.svg)

## Откройте настройки Bluetooth

Откройте {{Настройки > Bluetooth}} на телефоне.`;

export function renderContribute(site) {
  const { tr } = tools(site);
  const crumbItems = [{ name: tr('contrib.title'), path: 'contribute/' }];
  const code = (s) => `<code>${esc(s)}</code>`;
  const flow = [
    ['fork', 'contrib.flow1', { cmd: code('npm run new') }],
    ['edit', 'contrib.flow2', {}],
    ['image', 'contrib.flow3', {}],
    ['check-circle', 'contrib.flow4', { cmd: code('npm run check') }]
  ];
  const classes = [
    ['f-paper', 'f-paper'], ['f-soft', 'f-soft'], ['f-muted', 'f-muted'], ['f-ink', 'f-ink / s-ink'],
    ['f-accent', 'f-accent / s-accent'], ['f-accent-soft', 'f-accent-soft'], ['f-hl', 'f-hl / s-hl'], ['f-ok', 'f-ok'], ['f-warn', 'f-warn']
  ];
  const body = `<section class="band page-hero">
<div class="wrap">
${crumbs(site, crumbItems)}
<div class="page-hero-in">
<div><p class="kicker">${esc(tr('site.name'))}</p><h1 class="page-title">${esc(tr('contrib.title'))}</h1><p class="page-lead">${esc(tr('contrib.lead'))}</p>
<p class="hero-actions"><a class="btn btn-primary" href="${attr(REPO + '/blob/main/CONTRIBUTING.md')}" rel="noopener" target="_blank">${icon('doc')}${esc(tr('contrib.guide'))}</a><a class="btn btn-soft" href="${attr(REPO)}" rel="noopener" target="_blank">${icon('code')}${esc(tr('contrib.repo'))}</a></p></div>
<div class="page-hero-art">${contributeArt()}</div>
</div>
</div>
</section>
<section class="section wrap" aria-labelledby="h-flow">
${sectionHead(tr('contrib.flow'), { id: 'h-flow' })}
<ol class="flow">${flow.map(([ic, k, vars], i) => `<li class="flow-step"><span class="flow-n">${i + 1}</span><span class="flow-icon">${icon(ic)}</span><h3>${esc(tr(k))}</h3><p>${escVars(tr(k + 'Text'), vars)}</p></li>`).join('')}</ol>
</section>
<section class="section wrap contrib-grid">
<div class="panel"><h2 class="panel-title">${icon('star')}${esc(tr('contrib.rules'))}</h2><ul class="rules">${[1, 2, 3, 4].map((i) => `<li>${icon('check')}<span>${escVars(tr('contrib.rule' + i), { path: code('{{Настройки > Bluetooth}}') })}</span></li>`).join('')}</ul></div>
<div class="panel"><h2 class="panel-title">${icon('image')}${esc(tr('contrib.palette'))}</h2><p class="muted">${esc(tr('contrib.paletteLead'))}</p><ul class="swatches">${classes.map(([c, label]) => `<li><svg viewBox="0 0 32 32" aria-hidden="true"><circle class="${c} s-line" cx="16" cy="16" r="13" stroke-width="1.5"/></svg><code>${esc(label)}</code></li>`).join('')}</ul></div>
<div class="panel panel-wide"><h2 class="panel-title">${icon('doc')}${esc(tr('contrib.template'))}<span class="panel-note">guides/audio/jbl-flip-6-pair/index.ru.md</span></h2><pre class="code-block"><code>${esc(TEMPLATE)}</code></pre>
<p class="muted">${esc(tr('contrib.license'))}</p>
<p><a class="btn btn-soft btn-sm" href="${attr(REPO + '/blob/main/docs/guide-format.md')}" rel="noopener" target="_blank">${icon('book')}${esc(tr('contrib.format'))}</a></p></div>
</section>`;
  return { path: 'contribute/index.html', html: layout(site, { kind: 'contribute', subject: null, title: tr('contrib.title'), description: tr('contrib.lead'), body, crumbs: crumbItems, mainClass: 'contribute' }) };
}

// Translated text with HTML fragments substituted after escaping.
function escVars(text, vars) {
  return esc(text).replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
}

export function renderSearch(site) {
  const { tr } = tools(site);
  const crumbItems = [{ name: tr('search.title'), path: 'search/' }];
  const body = `<section class="band page-hero search-hero">
<div class="wrap">
${crumbs(site, crumbItems)}
<h1 class="page-title">${esc(tr('search.title'))}</h1>
<p class="page-lead">${esc(tr('search.lead'))}</p>
${heroSearch(site, { id: 'search-q' })}
</div>
</section>
<section class="section wrap" aria-live="polite">
<div class="search-results" data-search-page data-empty-title="${attr(tr('search.empty', { q: '{q}' }))}">
<noscript><div class="notice">${icon('info')}<p>${esc(tr('search.noscript'))} <a href="${attr(site.href('guides/'))}">${esc(tr('nav.catalog'))}</a></p></div></noscript>
<p class="search-summary" data-search-summary></p>
<div class="card-grid" data-search-cards></div>
</div>
<div class="search-browse">${sectionHead(tr('home.categories'), {})}<ul class="cat-pills">${site.categories.map((c) => `<li><a class="cat-pill c-${c.id}" href="${attr(site.href(c.id + '/'))}">${catIcon(c)}<span>${esc(c.name)}</span><span class="chip-count">${c.count || 0}</span></a></li>`).join('')}</ul></div>
</section>`;
  return { path: 'search/index.html', html: layout(site, { kind: 'search', subject: null, title: tr('search.title'), description: tr('search.lead'), body, crumbs: crumbItems, mainClass: 'search-page' }) };
}

export function render404(site) {
  const { tr } = tools(site);
  const body = `<section class="section wrap nf">
<div class="nf-art">${notFoundArt()}</div>
<p class="kicker">404</p>
<h1 class="page-title">${esc(tr('nf.title'))}</h1>
<p class="page-lead">${esc(tr('nf.text'))}</p>
${heroSearch(site, { id: 'nf-q' })}
<p class="hero-actions"><a class="btn btn-soft" href="${attr(site.href(''))}">${icon('home')}${esc(tr('nf.home'))}</a><a class="btn btn-ghost" href="${attr(site.href('guides/'))}">${icon('layers')}${esc(tr('nav.catalog'))}</a></p>
<ul class="cat-pills">${site.categories.map((c) => `<li><a class="cat-pill c-${c.id}" href="${attr(site.href(c.id + '/'))}">${catIcon(c)}<span>${esc(c.name)}</span></a></li>`).join('')}</ul>
</section>`;
  return { path: '404.html', html: layout(site, { kind: '404', subject: null, title: tr('nf.title'), description: tr('nf.text'), body, mainClass: 'nf-page' }) };
}
