// Facet filters and sorting over prerendered guide cards, kept in the query string
// (?c=audio,phones&k=pair&sort=quick). OR inside a facet, AND across facets.
import { t } from './core.js';

const KEYS = ['c', 'd', 'b', 'k', 'f'];
const values = (card, key) => (key === 'b' ? card.dataset.b.split(' ') : [card.dataset[key]]);

export function initFacets(box) {
  const grid = box.querySelector('[data-cards]');
  const cards = [...grid.children];
  const form = box.querySelector('[data-filter-form]');
  const details = box.querySelector('[data-filters]');
  const sortSel = box.querySelector('[data-sort]');
  const shown = box.querySelector('[data-shown]');
  const none = box.querySelector('[data-none]');
  const badge = box.querySelector('[data-active-count]');
  const keys = KEYS.filter((k) => form?.querySelector(`[name="${k}"]`));
  const order = new Map(cards.map((c, i) => [c, i]));

  const state = () => {
    const s = {};
    for (const k of keys) s[k] = new Set([...form.querySelectorAll(`[name="${k}"]:checked`)].map((i) => i.value));
    return s;
  };
  const matches = (card, s, skip) => keys.every((k) => k === skip || !s[k].size || values(card, k).some((v) => s[k].has(v)));

  const sorters = {
    new: (a, b) => order.get(a) - order.get(b),
    az: (a, b) => a.dataset.t.localeCompare(b.dataset.t, document.documentElement.lang),
    quick: (a, b) => Number(a.dataset.m) - Number(b.dataset.m) || order.get(a) - order.get(b)
  };

  const apply = ({ push = true } = {}) => {
    const s = state();
    let n = 0;
    for (const card of cards) {
      const on = matches(card, s);
      card.classList.toggle('is-hidden', !on);
      if (on) n++;
    }
    const sort = sortSel?.value || 'new';
    [...cards].sort(sorters[sort] || sorters.new).forEach((c) => grid.appendChild(c));
    // Counts for each chip given the other facets' selections.
    for (const k of keys) {
      for (const input of form.querySelectorAll(`[name="${k}"]`)) {
        const count = cards.filter((c) => matches(c, s, k) && values(c, k).includes(input.value)).length;
        const label = input.closest('.chip-check');
        label.querySelector('[data-count-for]').textContent = count;
        label.classList.toggle('is-zero', count === 0 && !input.checked);
      }
    }
    const active = keys.reduce((sum, k) => sum + s[k].size, 0);
    if (badge) badge.textContent = active ? String(active) : '';
    shown.textContent = active ? shown.dataset.template.replace('{n}', n).replace('{total}', cards.length) : t('count.guides', { n: cards.length });
    none.hidden = n > 0;
    grid.hidden = n === 0;
    if (push) {
      const url = new URL(location.href);
      for (const k of keys) {
        if (s[k].size) url.searchParams.set(k, [...s[k]].join(',')); else url.searchParams.delete(k);
      }
      if (sort !== 'new') url.searchParams.set('sort', sort); else url.searchParams.delete('sort');
      history.replaceState(null, '', url);
    }
  };

  // Restore from the query string.
  const params = new URLSearchParams(location.search);
  for (const k of keys) {
    const want = new Set((params.get(k) || '').split(',').filter(Boolean));
    form.querySelectorAll(`[name="${k}"]`).forEach((i) => { i.checked = want.has(i.value); });
  }
  if (sortSel && sorters[params.get('sort')]) sortSel.value = params.get('sort');
  // Narrow screens start with the filters folded so the guides come first; the badge on the
  // toggle shows how many filters the link brought along.
  if (details && window.matchMedia('(max-width: 999px)').matches) details.open = false;

  form?.addEventListener('change', () => apply());
  form?.addEventListener('submit', (e) => e.preventDefault());
  sortSel?.addEventListener('change', () => apply());
  box.querySelectorAll('[data-filter-reset]').forEach((b) => b.addEventListener('click', (e) => {
    e.preventDefault();
    form?.querySelectorAll('input:checked').forEach((i) => { i.checked = false; });
    apply();
  }));
  apply({ push: false });
}
