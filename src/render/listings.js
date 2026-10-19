import { esc, attr, tools } from './util.js';
import { icon, catIcon, taskIcon } from './icons.js';
import { listingHero, facetedList, standardFacets, sectionHead, emptyState } from './components.js';
import { layout } from './layout.js';

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

export function renderCategory(site, category) {
  const { tr } = tools(site);
  const guides = site.byCategory?.[category.id] || [];
  const devices = (category.devices || []).filter(Boolean);
  const deviceChips = devices.length ? `<div class="device-strip"><p class="device-strip-title">${esc(tr('listing.devices'))}</p><ul class="device-chips">${devices.map((d) => `<li><a class="device-chip${d.count ? '' : ' is-empty'}" href="${attr(site.href('device/' + d.id + '/'))}"><span>${esc(d.plural || d.name)}</span><span class="device-chip-n">${d.count || 0}</span></a></li>`).join('')}</ul></div>` : '';
  const featured = category.featured?.length ? `<section class="section wrap" aria-labelledby="h-featured">${sectionHead(tr('listing.featured'), { id: 'h-featured' })}<ul class="featured">${category.featured.map((f) => `<li><a class="featured-card" href="${attr(f.url)}" rel="noopener" target="_blank"><span class="featured-icon">${icon('external')}</span><span class="featured-text"><span class="featured-title">${esc(f.title)}</span><span class="featured-desc">${esc(f.desc)}</span><span class="featured-host">${esc(new URL(f.url).hostname)}</span></span></a></li>`).join('')}</ul></section>` : '';
  const crumbItems = [{ name: category.name, path: category.id + '/' }];
  let html;
  if (!guides.length) {
    const body = `${listingHero(site, { kicker: tr('listing.kicker.category'), title: category.name, lead: category.desc, iconHtml: catIcon(category), accent: category, crumbItems, after: deviceChips })}
${featured}
<section class="section wrap">${emptyState(site, { query: { category: category.id } })}</section>`;
    html = layout(site, { kind: 'category', subject: category, title: category.name, description: category.desc, body, accent: category, crumbs: crumbItems, mainClass: 'listing' });
  } else {
    html = listingPage(site, {
      kind: 'category', subject: category, accent: category, kicker: tr('listing.kicker.category'), title: category.name, lead: category.desc,
      iconHtml: catIcon(category), guides, skip: ['c'], crumbItems, extra: featured, heroAfter: deviceChips
    });
  }
  return { path: category.id + '/index.html', html };
}

export function renderDevice(site, device) {
  const { tr } = tools(site);
  const category = site.categories.find((c) => c.id === device.category);
  const guides = site.byDevice?.[device.id] || [];
  const title = device.plural || device.name;
  const crumbItems = [{ name: category.name, path: category.id + '/' }, { name: title, path: 'device/' + device.id + '/' }];
  const lead = tr('listing.deviceLead', { name: device.name.toLowerCase() });
  const html = guides.length
    ? listingPage(site, { kind: 'device', subject: device, accent: category, kicker: `${tr('listing.kicker.device')} / ${category.name}`, title, lead, iconHtml: catIcon(category), guides, skip: ['c', 'd'], crumbItems })
    : layout(site, {
      kind: 'device', subject: device, title, description: lead, accent: category, crumbs: crumbItems, mainClass: 'listing',
      body: `${listingHero(site, { kicker: `${tr('listing.kicker.device')} / ${category.name}`, title, lead, iconHtml: catIcon(category), accent: category, crumbItems })}<section class="section wrap">${emptyState(site, { query: { device: device.name, category: category.id } })}</section>`
    });
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
