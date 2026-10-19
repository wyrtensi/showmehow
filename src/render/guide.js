import { esc, attr, cls, tools, REPO } from './util.js';
import { icon, catIcon, taskIcon } from './icons.js';
import { translator } from '../lib/i18n.js';
import { widgets } from '../widgets/index.js';
import { crumbs, difficulty, cardGrid, sectionHead, fixIssueHref } from './components.js';
import { layout } from './layout.js';

const CHECK = '<svg class="check-svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';

function imageHtml(site, guide, image) {
  if (!image) return '';
  if (image.kind === 'svg') return `<figure class="step-fig"><div class="ill" role="img" aria-label="${attr(image.alt)}">${image.svg}</div></figure>`;
  const src = /^(\/|https?:)/.test(image.src) ? image.src : site.href(guide.path) + image.src;
  const size = image.width && image.height ? ` width="${image.width}" height="${image.height}"` : '';
  return `<figure class="step-fig step-photo"><img src="${attr(src)}" alt="${attr(image.alt)}"${size} loading="lazy" decoding="async"></figure>`;
}

function step(site, guide, s, total) {
  const { tr } = tools(site);
  return `<li class="${cls('step', s.image && 'has-fig')}" id="${attr(s.id)}" data-step="${s.n}">
<article class="step-card" aria-labelledby="${attr(s.id)}-t">
<header class="step-head">
<span class="step-num" aria-hidden="true"><span class="step-num-n">${s.n}</span>${CHECK}</span>
<h2 class="step-title" id="${attr(s.id)}-t"><span class="step-of">${esc(tr('guide.stepOf', { n: s.n, total }))} </span>${esc(s.title)}</h2>
</header>
<div class="step-content">
${imageHtml(site, guide, s.image)}
<div class="step-body prose">${s.html}</div>
</div>
<footer class="step-foot">
<label class="step-check" data-js><input type="checkbox" class="step-done" data-done="${s.n}" aria-label="${attr(tr('guide.markDone', { n: s.n }))}"><span class="check-box">${CHECK}</span><span class="step-check-text">${esc(tr('guide.done'))}</span></label>
<a class="step-share" href="#${attr(s.id)}" data-share="${s.n}" title="${attr(tr('guide.share', { n: s.n }))}">${icon('link')}<span>${esc(tr('guide.shareShort'))}</span></a>
</footer>
</article>
</li>`;
}

function needs(site, guide) {
  const { tr } = tools(site);
  if (!guide.tools.length && !guide.parts.length) return '';
  const toolsList = guide.tools.length ? `<ul class="needs-list">${guide.tools.map((t, i) => `<li><label class="need"><input type="checkbox" data-tool="${i}"><span class="check-box">${CHECK}</span><span class="need-text">${esc(t)}</span></label></li>`).join('')}</ul>` : '';
  const parts = guide.parts.length ? `<h3 class="needs-sub">${icon('box')}${esc(tr('guide.parts'))}</h3>
<div class="table-wrap"><table class="parts"><thead><tr><th scope="col">${esc(tr('guide.part'))}</th><th scope="col" class="num">${esc(tr('guide.qty'))}</th>${guide.parts.some((p) => p.ref) ? `<th scope="col">${esc(tr('guide.ref'))}</th>` : ''}</tr></thead><tbody>${guide.parts.map((p) => `<tr><td>${esc(p.name)}</td><td class="num"><span class="qty">${esc(p.qty ?? 1)}</span></td>${guide.parts.some((x) => x.ref) ? `<td>${p.ref ? `<code>${esc(p.ref)}</code>` : ''}</td>` : ''}</tr>`).join('')}</tbody></table></div>` : '';
  return `<section class="needs" aria-labelledby="h-needs">
<div class="needs-head"><span class="needs-icon">${icon('tool')}</span><div><h2 class="needs-title" id="h-needs">${esc(tr('guide.need'))}</h2>${guide.tools.length ? `<p class="needs-hint" data-js>${esc(tr('guide.checklist'))}</p>` : ''}</div></div>
${toolsList}${parts}
</section>`;
}

function widgetHtml(site, guide, where) {
  const w = guide.widget;
  if (!w || (w.placement === 'end') !== (where === 'end')) return '';
  const def = widgets[w.type];
  if (!def) throw new Error(`${guide.slug}: unknown widget type "${w.type}"`);
  const ctx = { lang: site.lang, guide, t: translator(site.lang), href: (p, l) => site.href(p, l) };
  return `<section class="widget" data-widget="${attr(w.type)}"${def.client ? ' data-widget-client' : ''} data-params="${attr(JSON.stringify(w.params || {}))}">${def.render(w.params || {}, ctx)}</section>`;
}

function related(site, guide) {
  const seen = new Set([guide.slug]);
  const out = [];
  for (const list of [site.byDevice?.[guide.device.id], site.byCategory?.[guide.category.id]]) {
    for (const g of list || []) {
      if (out.length >= 3) break;
      if (!seen.has(g.slug)) { seen.add(g.slug); out.push(g); }
    }
  }
  return out;
}

export function renderGuide(site, guide) {
  const { tr, date, minutes } = tools(site);
  const total = guide.steps.length;
  const cat = guide.category;
  const rel = related(site, guide);
  const srcLang = guide.fallback || !guide.langs?.en ? 'ru' : site.lang;
  const editUrl = `${REPO}/edit/main/guides/${guide.path}index.${srcLang}.md`;
  const brands = guide.brands.filter((b) => b.id !== 'generic');

  const meta = [
    `<li class="meta-pill">${icon('clock')}<span>${esc(minutes(guide.time))}</span></li>`,
    `<li class="meta-pill">${icon('steps')}<span>${esc(tr('count.steps', { n: total }))}</span></li>`,
    `<li class="meta-pill">${difficulty(site, guide.difficulty)}</li>`,
    `<li><a class="meta-pill meta-link" href="${attr(site.href('task/' + guide.task.id + '/'))}">${taskIcon(guide.task)}<span>${esc(guide.task.name)}</span></a></li>`,
    ...brands.map((b) => `<li><a class="meta-pill meta-link" href="${attr(site.href('brand/' + b.id + '/'))}">${icon('tag')}<span>${esc(b.name)}</span></a></li>`)
  ].join('');

  const fallback = guide.fallback ? `<div class="fallback-note" lang="${site.lang}">${icon('globe')}<p>${esc(tr('guide.fallback'))} <a href="${attr(site.href('contribute/'))}">${esc(tr('guide.fallbackCta'))}</a></p></div>` : '';

  const body = `
<div class="guide" data-guide="${attr(guide.slug)}" data-total="${total}">
<section class="band guide-hero">
<div class="wrap">
${crumbs(site, [{ name: cat.name, path: cat.id + '/' }, { name: guide.device.plural || guide.device.name, path: 'device/' + guide.device.id + '/' }, { name: guide.title, path: guide.path }])}
<div class="guide-hero-in">
<div class="guide-hero-text">
<a class="cat-chip" href="${attr(site.href(cat.id + '/'))}">${catIcon(cat)}<span>${esc(cat.name)}</span></a>
<h1 class="page-title guide-title"${guide.fallback ? ' lang="ru"' : ''}>${esc(guide.title)}</h1>
<p class="page-lead"${guide.fallback ? ' lang="ru"' : ''}>${esc(guide.summary)}</p>
<ul class="meta-row">${meta}</ul>
${guide.models?.length ? `<p class="models"><span class="models-label">${esc(tr('guide.models'))}:</span> ${guide.models.map((m) => `<span class="model">${esc(m)}</span>`).join('')}</p>` : ''}
</div>
<div class="guide-hero-art" aria-hidden="true"><span class="big-blob">${catIcon(cat, 'big-cat')}</span><span class="big-task">${taskIcon(guide.task)}</span><span class="big-ring"></span></div>
</div>
${fallback}
</div>
</section>

<div class="wrap guide-layout">
<div class="guide-main"${guide.fallback ? ' lang="ru"' : ''}>
${guide.introHtml ? `<div class="intro prose">${guide.introHtml}</div>` : ''}
${needs(site, guide)}
${widgetHtml(site, guide, 'start')}
<div class="mode-bar" data-js>
<div class="seg mode-seg" role="group" aria-label="${attr(tr('guide.modes'))}"><button type="button" class="seg-btn" data-mode="full" aria-pressed="true">${icon('list')}<span>${esc(tr('guide.modeFull'))}</span></button><button type="button" class="seg-btn" data-mode="steps" aria-pressed="false">${icon('play')}<span>${esc(tr('guide.modeSteps'))}</span></button></div>
<span class="mode-progress" data-progress-text>${esc(tr('guide.progress', { done: 0, total }))}</span>
</div>
<div class="step-progress" data-js aria-hidden="true"><div class="step-progress-track"><span class="step-progress-fill" data-step-fill></span></div><span class="step-progress-hint">${esc(tr('guide.swipeHint'))}</span></div>
<ol class="steps" data-steps>
${guide.steps.map((s) => step(site, guide, s, total)).join('\n')}
</ol>
<div class="done-banner" data-done-banner hidden>
<span class="done-burst" aria-hidden="true">${icon('sparkle')}${icon('check-circle')}${icon('sparkle')}</span>
<div><p class="done-title">${esc(tr('guide.allDone'))}</p><p>${esc(tr('guide.allDoneText'))}</p></div>
</div>
${widgetHtml(site, guide, 'end')}
${guide.faq.length ? `<section class="faq" aria-labelledby="h-faq">${sectionHead(tr('guide.faq'), { id: 'h-faq', icon: 'help' })}<div class="faq-list">${guide.faq.map((f, i) => `<details class="faq-item"${i === 0 ? ' open' : ''}><summary>${esc(f.q)}${icon('chevron-down', 'dd-chev')}</summary><div class="faq-a prose">${f.aHtml}</div></details>`).join('')}</div></section>` : ''}
<section class="sources" aria-labelledby="h-sources">
${sectionHead(tr('guide.sources'), { id: 'h-sources', icon: 'book', lead: tr('guide.sourcesNote') })}
<ol class="source-list">${guide.sources.map((s) => `<li><a class="source" href="${attr(s.url)}" rel="noopener" target="_blank">${s.publisher ? `<span class="source-pub">${esc(s.publisher)}</span>` : ''}<span class="source-title">${esc(s.title)}</span><span class="source-host">${esc(host(s.url))}${icon('external')}</span></a></li>`).join('')}</ol>
</section>
<div class="guide-foot">
<p class="guide-checked">${icon('check-circle')}<span>${esc(tr('guide.updated', { date: date(guide.updated) }))}</span></p>
${guide.authors?.length ? `<p class="guide-authors">${esc(tr('guide.authors'))}: ${guide.authors.map((a) => `<a href="https://github.com/${attr(encodeURIComponent(a))}" rel="noopener" target="_blank">@${esc(a)}</a>`).join(', ')}</p>` : ''}
<div class="fix-box"><p>${esc(tr('guide.fix'))}</p><div class="fix-actions"><a class="btn btn-soft btn-sm" href="${attr(fixIssueHref(site, guide))}" rel="noopener" target="_blank">${icon('flag')}${esc(tr('guide.fixCta'))}</a><a class="btn btn-ghost btn-sm" href="${attr(editUrl)}" rel="noopener" target="_blank">${icon('edit')}GitHub</a></div></div>
</div>
</div>
<aside class="guide-aside" aria-label="${attr(tr('guide.toc'))}">
<div class="aside-sticky">
<div class="progress-card" data-js>
<svg class="ring" viewBox="0 0 64 64" aria-hidden="true"><circle class="ring-bg" cx="32" cy="32" r="26"/><circle class="ring-fg" cx="32" cy="32" r="26" pathLength="100" data-ring/></svg>
<div><p class="progress-label">${esc(tr('guide.progressLabel'))}</p><p class="progress-value" data-progress-text>${esc(tr('guide.progress', { done: 0, total }))}</p><button class="link-btn" type="button" data-progress-reset hidden>${esc(tr('guide.resetProgress'))}</button></div>
</div>
<nav class="toc"><p class="toc-title">${esc(tr('guide.toc'))}</p><ol>${guide.steps.map((s) => `<li><a href="#${attr(s.id)}" data-toc="${s.n}"><span class="toc-n">${s.n}</span><span class="toc-t">${esc(s.title)}</span></a></li>`).join('')}</ol></nav>
</div>
</aside>
</div>

<nav class="step-nav" data-js aria-label="${attr(tr('guide.modeSteps'))}">
<button class="btn btn-soft step-prev" type="button" data-step-prev>${icon('arrow-left')}<span>${esc(tr('guide.prev'))}</span></button>
<span class="step-count" data-step-count aria-live="polite">${esc(tr('guide.stepOf', { n: 1, total }))}</span>
<button class="btn btn-primary step-next" type="button" data-step-next data-next="${attr(tr('guide.next'))}" data-finish="${attr(tr('guide.finish'))}"><span>${esc(tr('guide.next'))}</span>${icon('arrow-right')}</button>
</nav>
</div>

${rel.length ? `<section class="section wrap related" aria-labelledby="h-related">${sectionHead(tr('guide.related'), { id: 'h-related' })}${cardGrid(site, rel)}</section>` : ''}`;

  return {
    path: guide.path + 'index.html',
    html: layout(site, {
      kind: 'guide', subject: guide, title: guide.title, description: guide.summary, body, accent: cat, mainClass: 'guide-page',
      crumbs: [{ name: cat.name, path: cat.id + '/' }, { name: guide.title, path: guide.path }],
      bodyClass: 'has-step-nav'
    })
  };
}

function host(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}
