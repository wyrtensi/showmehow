import { esc, attr, tools } from './util.js';
import { icon, iconNames, catIcon, taskIcon } from './icons.js';
import { listingHero, facetedList, standardFacets, sectionHead, emptyState, cardGrid } from './components.js';
import { layout } from './layout.js';
import { widgets } from '../widgets/index.js';

const uniq = (arr) => [...new Set(arr)];

function counts(site, guides) {
  const { tr } = tools(site);
  const devices = uniq(guides.map((g) => g.device.id)).length;
  const brands = uniq(guides.flatMap((g) => g.brands.map((b) => b.id)).filter((b) => b !== 'generic')).length;
  return [
    { icon: 'layers', text: tr('count.guides', { n: guides.length }) },
    devices && { icon: 'device', text: tr('count.devices', { n: devices }) },
    brands && { icon: 'tag', text: tr('count.brands', { n: brands }) }
  ].filter(Boolean);
}

function listingPage(site, { kind, subject, accent, kicker, title, lead, iconHtml, guides, skip, crumbItems, extra = '', heroAfter = '' }) {
  const { tr } = tools(site);
  const body = `${listingHero(site, { kicker, title, lead, iconHtml, accent, stats: counts(site, guides), crumbItems, after: heroAfter })}
${extra}
<section class="section wrap" aria-labelledby="h-list">
${sectionHead(tr('listing.guides'), { id: 'h-list' })}
${facetedList(site, guides, standardFacets(site, guides, skip))}
</section>`;
  return layout(site, { kind, subject, title, description: lead, body, accent, crumbs: crumbItems, mainClass: 'listing' });
}

// A device's own icon (src/icons/dev-<id>.svg) when there is one, else its category's.
const deviceIcon = (device, category, extra) => (iconNames().includes('dev-' + device.id) ? icon('dev-' + device.id, extra) : catIcon(category, extra));


// The guide-level widget's meta (spec 6): short name, extra hub facet, partial data.
function widgetMeta(site, g) {
  const def = g.widget && widgets[g.widget.type];
  return def && typeof def.meta === 'function' ? def.meta(g.widget.params || {}, site.lang) : null;
}

// A model guide is one whose guide-level widget names the model (washer-panel); the rest are general.
const isModel = (site, g) => Boolean(widgetMeta(site, g)?.label);

// How many cards a device group shows on its category page before "All N".
export const CATEGORY_GROUP_SIZE = 3;

// Category page (spec 5.2): device types as subcategory tiles first, then the guides grouped under
// each device type, a few per group with "All N" to the device page. No facet filters here: the
// device pages and the catalog have them.
export function renderCategory(site, category) {
  const { tr } = tools(site);
  const guides = site.byCategory?.[category.id] || [];
  const devices = (category.devices || []).filter(Boolean);
  const crumbItems = [{ name: category.name, path: category.id + '/' }];
  const featured = category.featured?.length ? `<section class="section wrap" aria-labelledby="h-featured">${sectionHead(tr('listing.featured'), { id: 'h-featured' })}<ul class="featured">${category.featured.map((f) => `<li><a class="featured-card" href="${attr(f.url)}" rel="noopener" target="_blank"><span class="featured-icon">${icon('external')}</span><span class="featured-text"><span class="featured-title">${esc(f.title)}</span><span class="featured-desc">${esc(f.desc)}</span><span class="featured-host">${esc(new URL(f.url).hostname)}</span></span></a></li>`).join('')}</ul></section>` : '';
  const tile = (d) => {
    const inner = `<span class="sub-tile-art" aria-hidden="true">${deviceIcon(d, category, 'sub-tile-icon')}</span><span class="sub-tile-text"><span class="sub-tile-name">${esc(d.plural || d.name)}</span><span class="sub-tile-n">${esc(d.count ? tr('count.guides', { n: d.count }) : tr('listing.noneYet'))}</span></span>`;
    return d.count
      ? `<li><a class="sub-tile" href="${attr(site.href('device/' + d.id + '/'))}">${inner}${icon('arrow-right', 'sub-tile-go')}</a></li>`
      : `<li><a class="sub-tile is-empty" href="${attr(site.href('requests/') + '?' + new URLSearchParams({ device: d.name, category: category.id }))}" title="${attr(tr('listing.requestDevice'))}">${inner}</a></li>`;
  };
  const tiles = devices.length ? `<section class="section wrap" aria-labelledby="h-devices">${sectionHead(tr('listing.devices'), { id: 'h-devices' })}<ul class="sub-tiles">${devices.map(tile).join('')}</ul></section>` : '';
  const groups = devices.filter((d) => (site.byDevice?.[d.id] || []).length).map((d) => {
    const list = site.byDevice[d.id];
    // general guides first: they help whoever has this device
    const ordered = [...list.filter((g) => !isModel(site, g)), ...list.filter((g) => isModel(site, g))];
    const shown = ordered.slice(0, CATEGORY_GROUP_SIZE);
    const link = list.length > shown.length ? { href: site.href('device/' + d.id + '/'), label: tr('listing.all', { n: list.length }) } : null;
    return `<section class="section wrap device-group" aria-labelledby="h-dev-${attr(d.id)}">${sectionHead(d.plural || d.name, { id: 'h-dev-' + d.id, link })}${cardGrid(site, shown)}</section>`;
  }).join('\n');
  const body = `${listingHero(site, { kicker: tr('listing.kicker.category'), title: category.name, lead: category.desc, iconHtml: catIcon(category), accent: category, stats: guides.length ? counts(site, guides) : [], crumbItems })}
${tiles}
${guides.length ? groups : `<section class="section wrap">${emptyState(site, { query: { category: category.id } })}</section>`}
${featured}`;
  const html = layout(site, { kind: 'category', subject: category, title: category.name, description: category.desc, body, accent: category, crumbs: crumbItems, mainClass: 'listing' });
  return { path: category.id + '/index.html', html };
}

// A device becomes a hub (spec 5.2) when it has many model guides from several brands: general
// guides on top, then the models grouped by brand with a quick brand filter (and the widget's
// extra facet, e.g. the control type of a washing machine).
export const HUB_MIN_MODELS = 6;
export const HUB_MIN_BRANDS = 3;

export function isHub(site, device) {
  const models = (site.byDevice?.[device.id] || []).filter((g) => isModel(site, g));
  const brands = uniq(models.flatMap((g) => g.brands.map((b) => b.id)));
  return models.length >= HUB_MIN_MODELS && brands.length >= HUB_MIN_BRANDS;
}

function hubBody(site, device, category, guides) {
  const { tr } = tools(site);
  const generic = guides.filter((g) => !isModel(site, g));
  const models = guides.filter((g) => isModel(site, g)).map((g) => ({ g, meta: widgetMeta(site, g) }));
  const brands = site.brands.filter((b) => b.id !== 'generic' && models.some((x) => x.g.brands.some((gb) => gb.id === b.id)))
    .sort((a, b) => a.name.localeCompare(b.name, 'en'));
  const facetLabel = models.find((x) => x.meta?.facet)?.meta.facet.label;
  const facetValues = [];
  for (const x of models) {
    const f = x.meta?.facet;
    if (f && !facetValues.some((v) => v.id === f.id)) facetValues.push({ id: f.id, name: f.name });
  }
  const chip = (key, id, name, n, on) => `<button type="button" class="hub-chip${on ? ' is-on' : ''}" data-hub-key="${key}" data-hub-val="${attr(id)}" aria-pressed="${on}">${esc(name)}${n != null ? `<span class="chip-count">${n}</span>` : ''}</button>`;
  const brandChips = `<div class="hub-filter" role="group" aria-label="${attr(tr('hub.brand'))}"><span class="hub-filter-t">${esc(tr('hub.brand'))}</span>${chip('b', '', tr('hub.all'), null, true)}${brands.map((b) => chip('b', b.id, b.name, models.filter((x) => x.g.brands.some((gb) => gb.id === b.id)).length, false)).join('')}</div>`;
  const facetChips = facetValues.length > 1 ? `<div class="hub-filter" role="group" aria-label="${attr(facetLabel)}"><span class="hub-filter-t">${esc(facetLabel)}</span>${chip('x', '', tr('hub.all'), null, true)}${facetValues.map((v) => chip('x', v.id, v.name, models.filter((x) => x.meta?.facet?.id === v.id).length, false)).join('')}</div>` : '';
  const card = ({ g, meta }) => {
    const label = meta?.label || g.models?.[0] || g.title;
    const brand = g.brands.find((b) => b.id !== 'generic');
    const short = brand && label.startsWith(brand.name + ' ') ? label.slice(brand.name.length + 1) : label;
    return `<li class="hub-item" data-b="${attr(g.brands.map((b) => b.id).join(' '))}" data-x="${attr(meta?.facet?.id || '')}"><a class="model-card" href="${attr(site.href(g.path))}"><span class="model-name">${esc(short)}</span><span class="model-meta">${meta?.facet ? `<span>${esc(meta.facet.name)}</span>` : `<span>${esc(g.task.name)}</span>`}${meta?.partial ? `<span class="model-partial">${esc(tr('hub.partial'))}</span>` : ''}</span>${icon('arrow-right', 'model-go')}</a></li>`;
  };
  const groups = brands.map((b) => {
    const items = models.filter((x) => x.g.brands.some((gb) => gb.id === b.id))
      .sort((p, q) => (p.meta?.label || p.g.title).localeCompare(q.meta?.label || q.g.title, 'en', { numeric: true }));
    return `<section class="hub-group" data-hub-group aria-labelledby="h-brand-${attr(b.id)}"><h3 class="hub-group-t" id="h-brand-${attr(b.id)}"><a href="${attr(site.href('brand/' + b.id + '/'))}">${esc(b.name)}</a><span class="chip-count">${items.length}</span></h3><ul class="hub-list">${items.map(card).join('')}</ul></section>`;
  }).join('');
  const genericHtml = generic.length ? `<section class="section wrap" aria-labelledby="h-generic">${sectionHead(tr('hub.generic'), { id: 'h-generic', lead: tr('hub.genericLead'), icon: 'star' })}${cardGrid(site, generic)}</section>` : '';
  return `${genericHtml}
<section class="section wrap hub" data-hub aria-labelledby="h-models">
${sectionHead(tr('hub.models'), { id: 'h-models', lead: tr('hub.modelsLead') })}
<div class="hub-filters" data-js>${brandChips}${facetChips}</div>
<div class="hub-groups">${groups}</div>
<p class="hub-none" data-hub-none hidden>${esc(tr('hub.none'))}</p>
</section>`;
}

export function renderDevice(site, device) {
  const { tr } = tools(site);
  const category = site.categories.find((c) => c.id === device.category);
  const guides = site.byDevice?.[device.id] || [];
  const title = device.plural || device.name;
  const crumbItems = [{ name: category.name, path: category.id + '/' }, { name: title, path: 'device/' + device.id + '/' }];
  const lead = tr('listing.deviceLead', { name: device.name.toLowerCase() });
  const kicker = `${tr('listing.kicker.device')} / ${category.name}`;
  let html;
  if (guides.length && isHub(site, device)) {
    const body = `${listingHero(site, { kicker, title, lead, iconHtml: deviceIcon(device, category), accent: category, stats: counts(site, guides), crumbItems })}
${hubBody(site, device, category, guides)}`;
    html = layout(site, { kind: 'device', subject: device, title, description: lead, body, accent: category, crumbs: crumbItems, mainClass: 'listing' });
  } else if (guides.length) {
    html = listingPage(site, { kind: 'device', subject: device, accent: category, kicker, title, lead, iconHtml: deviceIcon(device, category), guides, skip: ['c', 'd'], crumbItems });
  } else {
    html = layout(site, {
      kind: 'device', subject: device, title, description: lead, accent: category, crumbs: crumbItems, mainClass: 'listing',
      body: `${listingHero(site, { kicker, title, lead, iconHtml: deviceIcon(device, category), accent: category, crumbItems })}<section class="section wrap">${emptyState(site, { query: { device: device.name, category: category.id } })}</section>`
    });
  }
  return { path: `device/${device.id}/index.html`, html };
}

export function renderBrand(site, brand) {
  const { tr } = tools(site);
  const guides = site.byBrand?.[brand.id] || [];
  const generic = brand.id === 'generic';
  const lead = generic ? tr('listing.genericLead') : tr('listing.brandLead', { name: brand.name });
  const crumbItems = [{ name: tr('nav.catalog'), path: 'guides/' }, { name: brand.name, path: 'brand/' + brand.id + '/' }];
  const site_ = brand.site ? `<p class="hero-link"><a class="btn btn-soft btn-sm" href="${attr(brand.site)}" rel="noopener" target="_blank">${icon('external')}${esc(tr('listing.brandSite'))}</a></p>` : '';
  const monogram = generic ? icon('tag') : `<span class="monogram">${esc(brand.name.replace(/[^\p{L}\p{N}]/gu, '').slice(0, 2))}</span>`;
  const html = guides.length
    ? listingPage(site, { kind: 'brand', subject: brand, accent: null, kicker: tr('listing.kicker.brand'), title: brand.name, lead, iconHtml: monogram, guides, skip: ['b'], crumbItems, heroAfter: site_ })
    : layout(site, {
      kind: 'brand', subject: brand, title: brand.name, description: lead, crumbs: crumbItems, mainClass: 'listing',
      body: `${listingHero(site, { kicker: tr('listing.kicker.brand'), title: brand.name, lead, iconHtml: monogram, crumbItems, after: site_ })}<section class="section wrap">${emptyState(site, { query: { device: brand.name } })}</section>`
    });
  return { path: `brand/${brand.id}/index.html`, html };
}

export function renderTask(site, task) {
  const { tr } = tools(site);
  const guides = site.byTask?.[task.id] || [];
  const lead = tr('listing.taskLead', { verb: task.verb.toLowerCase() });
  const crumbItems = [{ name: tr('nav.catalog'), path: 'guides/' }, { name: task.name, path: 'task/' + task.id + '/' }];
  const html = guides.length
    ? listingPage(site, { kind: 'task', subject: task, accent: null, kicker: tr('listing.kicker.task'), title: task.name, lead, iconHtml: taskIcon(task), guides, skip: ['k'], crumbItems })
    : layout(site, {
      kind: 'task', subject: task, title: task.name, description: lead, crumbs: crumbItems, mainClass: 'listing',
      body: `${listingHero(site, { kicker: tr('listing.kicker.task'), title: task.name, lead, iconHtml: taskIcon(task), crumbItems })}<section class="section wrap">${emptyState(site, { query: { goal: task.verb } })}</section>`
    });
  return { path: `task/${task.id}/index.html`, html };
}

export function renderCatalog(site) {
  const { tr } = tools(site);
  const crumbItems = [{ name: tr('catalog.title'), path: 'guides/' }];
  const taskLinks = `<ul class="task-chips task-chips-hero">${site.tasks.filter((k) => k.count).map((k) => `<li><a class="task-chip" href="${attr(site.href('task/' + k.id + '/'))}">${taskIcon(k)}${esc(k.name)}<span class="chip-count">${k.count}</span></a></li>`).join('')}</ul>`;
  const body = `${listingHero(site, { kicker: tr('site.name'), title: tr('catalog.title'), lead: tr('catalog.lead'), iconHtml: icon('layers'), crumbItems, stats: counts(site, site.guides), after: taskLinks })}
<section class="section wrap" aria-label="${attr(tr('catalog.title'))}">
${facetedList(site, site.guides, standardFacets(site, site.guides), { id: 'catalog' })}
</section>`;
  return { path: 'guides/index.html', html: layout(site, { kind: 'catalog', subject: null, title: tr('catalog.title'), description: tr('catalog.lead'), body, crumbs: crumbItems, mainClass: 'listing catalog' }) };
}
