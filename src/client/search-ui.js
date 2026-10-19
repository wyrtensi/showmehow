// Loads the search index once and renders results for the palette, the instant box and the
// search page.
import { createSearcher } from '../lib/search.js';
import { t, href, esc, icon, data, searchUrl } from './core.js';

let pending = null;

export function loadSearch() {
  pending ||= fetch(searchUrl)
    .then((r) => {
      if (!r.ok) throw new Error(`search index: HTTP ${r.status}`);
      return r.json();
    })
    .then((index) => {
      const searcher = createSearcher(index, index.syn || []);
      const docs = new Map((index.docs || []).map((d) => [d.p, d]));
      return { searcher, docs, tx: index.tx || {} };
    })
    .catch((error) => {
      pending = null;
      throw error;
    });
  return pending;
}

const words = (q) => q.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((w) => w.length > 1);

export function highlight(text, q) {
  let out = esc(text);
  for (const w of words(q).sort((a, b) => b.length - a.length)) {
    const safe = esc(w).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    out = out.replace(new RegExp(`(^|[^\\p{L}\\p{N}])(${safe})`, 'giu'), '$1<mark>$2</mark>');
  }
  return out;
}

const minutes = (n) => (n >= 60 ? (n % 60 ? t('unit.hours', { h: Math.floor(n / 60), m: n % 60 }) : t('unit.hoursOnly', { h: n / 60 })) : t('unit.min', { n }));

export function resultRow(r, doc, q, id) {
  const cat = data().cats?.[doc?.c] || {};
  const sub = [cat.n, doc && minutes(doc.m), doc?.n && t('count.steps', { n: doc.n })].filter(Boolean).join(' · ');
  return `<li role="presentation"><a class="result c-${esc(doc?.c || '')}" id="${id}" role="option" aria-selected="false" href="${esc(href(r.path))}"><span class="result-icon">${icon(cat.i || 'layers')}</span><span class="result-text"><span class="result-title">${highlight(r.title, q)}</span><span class="result-sub">${esc(sub)}</span></span>${icon('arrow-right', 'result-go')}</a></li>`;
}

export function requestLink(q) {
  return href('requests/') + '?' + new URLSearchParams({ device: q }).toString();
}

export function emptyBlock(q) {
  return `<div class="result-empty"><p><strong>${esc(t('search.empty', { q }))}</strong><br>${esc(t('search.emptyText'))}</p><a class="btn btn-primary btn-sm" href="${esc(requestLink(q))}">${icon('request')}${esc(t('search.request'))}</a></div>`;
}

export function quickLinks() {
  const d = data();
  const cats = Object.entries(d.cats || {}).map(([id, c]) => `<a class="chip c-${esc(id)}" href="${esc(href(id + '/'))}">${icon(c.i)}${esc(c.n)}</a>`).join('');
  const tasks = Object.entries(d.tasks || {}).filter(([, k]) => k.c).map(([id, k]) => `<a class="chip" href="${esc(href('task/' + id + '/'))}">${icon('task-' + id)}${esc(k.v)}</a>`).join('');
  return `<p class="result-label">${esc(t('nav.categories'))}</p><div class="result-quick">${cats}</div>${tasks ? `<p class="result-label">${esc(t('home.tasks'))}</p><div class="result-quick">${tasks}</div>` : ''}`;
}

const DIFF = { easy: 1, medium: 2, hard: 3 };

// The same card the server renders (src/render/components.js guideCard), built from index data.
export function card(r, doc, tx) {
  const cat = data().cats?.[doc.c] || {};
  const dev = tx.d?.[doc.d]?.n || '';
  const task = tx.k?.[doc.k]?.n || '';
  const level = DIFF[doc.f] || 1;
  return `<article class="gcard c-${esc(doc.c)}">
<div class="gcard-art" aria-hidden="true"><span class="gcard-blob">${icon(cat.i || 'layers', 'gcard-cat')}</span><span class="gcard-task">${icon('task-' + doc.k)}</span><span class="gcard-time">${icon('clock')}${esc(minutes(doc.m))}</span></div>
<div class="gcard-body"><p class="gcard-kicker">${esc(dev)}${dev && task ? '<span class="dot"></span>' : ''}${esc(task)}</p>
<h2 class="gcard-title"><a class="gcard-link" href="${esc(href(r.path))}">${esc(r.title)}</a></h2>
<p class="gcard-sum">${esc(r.summary)}</p>
<p class="gcard-meta"><span>${icon('steps')}${esc(t('count.steps', { n: doc.n }))}</span><span class="diff diff-${esc(doc.f)}"><span class="diff-bars" aria-hidden="true">${[1, 2, 3].map((i) => `<i${i <= level ? ' class="on"' : ''}></i>`).join('')}</span>${esc(t('diff.' + doc.f))}</span></p></div>
</article>`;
}
