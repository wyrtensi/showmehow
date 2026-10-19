import { esc, attr, tools, jsonScript } from './util.js';
import { icon, catIcon, taskIcon } from './icons.js';
import { heroArt, requestArt, contributeArt } from './art.js';
import { cardGrid, sectionHead, requestHref } from './components.js';
import { layout } from './layout.js';

const HOME_TASKS = ['pair', 'setup', 'assemble', 'reset', 'maintain'];

export function heroSearch(site, { id = 'hero-q', autofocus = false } = {}) {
  const { tr } = tools(site);
  return `<form class="hero-search" role="search" action="${attr(site.href('search/'))}" method="get" data-instant>
<label class="sr-only" for="${id}">${esc(tr('search.label'))}</label>
<span class="hero-search-icon">${icon('search')}</span>
<input class="hero-search-input" id="${id}" name="q" type="search" autocomplete="off" spellcheck="false" placeholder="${attr(tr('search.placeholder'))}"${autofocus ? ' autofocus' : ''} role="combobox" aria-expanded="false" aria-controls="${id}-list" aria-autocomplete="list">
<button class="btn btn-primary hero-search-btn" type="submit">${esc(tr('search.submit'))}</button>
<div class="instant" id="${id}-panel" hidden><p class="instant-status" aria-live="polite"></p><ul class="instant-list" id="${id}-list" role="listbox"></ul></div>
</form>`;
}

function categoryTile(site, c) {
  const { tr } = tools(site);
  return `<li><a class="cat-tile c-${c.id}" href="${attr(site.href(c.id + '/'))}">
<span class="cat-tile-art" aria-hidden="true"><span class="cat-tile-ring"></span>${catIcon(c, 'cat-tile-icon')}${catIcon(c, 'cat-tile-ghost')}</span>
<span class="cat-tile-name">${esc(c.name)}</span>
<span class="cat-tile-desc">${esc(c.desc)}</span>
<span class="cat-tile-count">${c.count ? esc(tr('count.guides', { n: c.count })) : esc(tr('home.tileEmpty'))}${icon('arrow-right')}</span>
</a></li>`;
}

// Finder (spec 11.5): category, then device, then task. The category chips are prerendered; the
// device and task chips and the matching guides come from the #smh-home data island. The whole
// block needs JavaScript (the category tiles below are the no-JS path).
function finder(site) {
  const { tr } = tools(site);
  const cats = site.categories.filter((c) => c.count);
  if (!cats.length) return '';
  const chips = cats.map((c) => `<label class="chip-check c-${c.id}"><input type="radio" name="c" value="${attr(c.id)}"><span class="chip">${catIcon(c)}<span class="chip-name">${esc(c.name)}</span><span class="chip-count" data-count-for="${attr(c.id)}">${c.count}</span></span></label>`).join('');
  const step = (key, n, label, inner, hidden) => `<fieldset class="finder-step" data-finder-step="${key}"${hidden ? ' hidden' : ''}><legend class="finder-legend"><span class="finder-n">${n}</span>${esc(label)}</legend><div class="finder-chips" data-finder-chips="${key}">${inner}</div></fieldset>`;
  return `<section class="section wrap finder" aria-labelledby="h-finder" data-finder data-js data-catalog="${attr(site.href('guides/'))}" data-any="${attr(tr('finder.any'))}" data-any-task="${attr(tr('finder.anyTask'))}">
${sectionHead(tr('finder.title'), { id: 'h-finder', icon: 'filter', lead: tr('finder.lead') })}
<form class="finder-card" data-finder-form>
${step('c', 1, tr('finder.category'), chips, false)}
${step('d', 2, tr('finder.device'), '', true)}
${step('k', 3, tr('finder.task'), '', true)}
<div class="finder-out" data-finder-out>
<p class="finder-count" aria-live="polite" data-finder-count>${esc(tr('finder.pickFirst'))}</p>
<ul class="finder-list" data-finder-list></ul>
<p class="finder-none" data-finder-none hidden>${esc(tr('finder.none'))} <a href="${attr(requestHref(site))}">${esc(tr('search.request'))}</a></p>
<div class="finder-actions" data-finder-actions hidden><a class="btn btn-primary" href="${attr(site.href('guides/'))}" data-finder-all>${icon('layers')}<span>${esc(tr('finder.open'))}</span></a><button type="reset" class="btn btn-ghost" data-finder-reset>${icon('refresh')}<span>${esc(tr('finder.reset'))}</span></button></div>
</div>
</form>
</section>`;
}

// Continue where you left off (spec 11.5): filled from localStorage by src/client/home.js.
function continueBox(site) {
  const { tr } = tools(site);
  return `<section class="section wrap continue" aria-labelledby="h-continue" data-continue hidden data-at="${attr(tr('continue.at', { n: '{n}', total: '{total}' }))}" data-open="${attr(tr('continue.open'))}" data-forget="${attr(tr('continue.forget'))}">
${sectionHead(tr('continue.title'), { id: 'h-continue', icon: 'steps' })}
<ul class="continue-list" data-continue-list></ul>
</section>`;
}

// Compact guide list for the finder and "continue": [slug, path, title, category, device, task, minutes].
function homeData(site) {
  const used = new Set(site.guides.map((g) => g.device.id));
  return `<script type="application/json" id="smh-home">${jsonScript({
    g: site.guides.map((g) => [g.slug, g.path, g.title, g.category.id, g.device.id, g.task.id, g.time]),
    d: Object.fromEntries(site.devices.filter((d) => used.has(d.id)).map((d) => [d.id, d.plural || d.name])),
    k: Object.fromEntries(site.tasks.filter((k) => k.count).map((k) => [k.id, k.name]))
  })}</script>`;
}

export function renderHome(site) {
  const { tr } = tools(site);
  const tasks = HOME_TASKS.map((id) => site.tasks.find((k) => k.id === id)).filter(Boolean);
  const fresh = site.guides.slice(0, 6);
  const totals = [
    ['layers', site.totals.guides, 'totals.guides'],
    ['device', site.totals.devices, 'totals.devices'],
    ['tag', site.totals.brands, 'totals.brands'],
    ['globe', site.langs.length, 'totals.languages']
  ];
  const body = `
<section class="hero">
<div class="wrap hero-in">
<div class="hero-text">
<p class="eyebrow">${icon('sparkle')}${esc(tr('home.eyebrow'))}</p>
<h1 class="hero-title">${esc(tr('home.title'))} <span class="hero-accent">${esc(tr('home.titleAccent'))}</span></h1>
<p class="hero-lead">${esc(tr('home.lead'))}</p>
${heroSearch(site)}
<div class="task-chips" role="group" aria-label="${attr(tr('home.tasks'))}"><span class="task-chips-label">${esc(tr('home.tasks'))}</span>${tasks.map((k) => `<a class="task-chip" href="${attr(site.href('task/' + k.id + '/'))}">${taskIcon(k)}${esc(k.verb)}</a>`).join('')}</div>
</div>
<div class="hero-visual">${heroArt()}</div>
</div>
<div class="wrap"><ul class="totals">${totals.map(([ic, n, key]) => `<li class="total">${icon(ic)}<span class="total-n">${n}</span><span class="total-l">${esc(tr(key, { n }))}</span></li>`).join('')}</ul></div>
</section>

${continueBox(site)}
${finder(site)}
${homeData(site)}

<section class="section wrap" aria-labelledby="h-cats">
${sectionHead(tr('home.categories'), { id: 'h-cats', lead: tr('home.categoriesLead') })}
<ul class="cat-grid">${site.categories.map((c) => categoryTile(site, c)).join('')}</ul>
</section>

${fresh.length ? `<section class="section wrap" aria-labelledby="h-new">
${sectionHead(tr('home.new'), { id: 'h-new', link: { href: site.href('guides/'), label: tr('home.allGuides') } })}
${cardGrid(site, fresh)}
</section>` : ''}

<section class="section wrap" aria-labelledby="h-how">
${sectionHead(tr('home.how'), { id: 'h-how' })}
<ol class="how">
<li class="how-step"><span class="how-icon">${icon('search')}</span><h3>${esc(tr('home.how1'))}</h3><p>${esc(tr('home.how1Text'))}</p></li>
<li class="how-step"><span class="how-icon">${icon('tap')}</span><h3>${esc(tr('home.how2'))}</h3><p>${esc(tr('home.how2Text'))}</p></li>
<li class="how-step"><span class="how-icon">${icon('check-circle')}</span><h3>${esc(tr('home.how3'))}</h3><p>${esc(tr('home.how3Text'))}</p></li>
</ol>
</section>

<section class="section wrap promo-grid">
<div class="promo promo-request">
<div class="promo-text"><h2 class="promo-title">${esc(tr('home.requestTitle'))}</h2><p>${esc(tr('home.requestText'))}</p><a class="btn btn-primary" href="${attr(requestHref(site))}">${icon('request')}${esc(tr('home.requestCta'))}</a></div>
<div class="promo-art">${requestArt()}</div>
</div>
<div class="promo promo-contrib">
<div class="promo-text"><h2 class="promo-title">${esc(tr('home.contributeTitle'))}</h2><p>${esc(tr('home.contributeText'))}</p><a class="btn btn-soft" href="${attr(site.href('contribute/'))}">${icon('edit')}${esc(tr('home.contributeCta'))}</a></div>
<div class="promo-art">${contributeArt()}</div>
</div>
</section>`;
  return { path: 'index.html', html: layout(site, { kind: 'home', subject: null, title: tr('site.name'), description: tr('site.description'), body, mainClass: 'home' }) };
}
