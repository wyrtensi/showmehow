// Command palette (Ctrl+K and /), the instant results under hero search fields, and the live
// search page. All three share one listbox controller over the same search index.
import { t, href, esc, debounce, isTyping, icon } from './core.js';
import { loadSearch, resultRow, emptyBlock, quickLinks, card } from './search-ui.js';

let uid = 0;

// input + list + status -> live results with arrow-key selection. Returns {run, clear}.
function listbox({ input, list, status, limit, idle, onRender, autoSelect = true }) {
  const prefix = `r${++uid}-`;
  let items = [];
  let active = -1;

  const select = (i) => {
    items.forEach((el, k) => el.setAttribute('aria-selected', String(k === i)));
    active = i;
    if (i >= 0) {
      input.setAttribute('aria-activedescendant', items[i].id);
      items[i].scrollIntoView({ block: 'nearest' });
    } else input.removeAttribute('aria-activedescendant');
  };

  const run = async () => {
    const q = input.value.trim();
    if (!q) {
      list.innerHTML = '';
      status.innerHTML = idle ? idle() : '';
      items = [];
      select(-1);
      onRender?.(q, 0);
      return;
    }
    let ctx;
    try {
      ctx = await loadSearch();
    } catch (error) {
      console.error(error);
      status.textContent = t('search.error');
      return;
    }
    if (input.value.trim() !== q) return;
    const results = ctx.searcher.search(q, { limit });
    if (!results.length) {
      list.innerHTML = '';
      status.innerHTML = emptyBlock(q);
    } else {
      status.textContent = results.some((r) => r.partial) ? t('search.partial') : '';
      list.innerHTML = results.map((r, i) => resultRow(r, ctx.docs.get(r.path), q, prefix + i)).join('') +
        `<li role="presentation"><a class="result result-all" id="${prefix}all" role="option" aria-selected="false" href="${esc(href('search/') + '?q=' + encodeURIComponent(q))}"><span class="result-icon">${icon('search')}</span><span class="result-text"><span class="result-title">${esc(t('search.all'))}</span></span>${icon('arrow-right', 'result-go')}</a></li>`;
    }
    items = [...list.querySelectorAll('[role="option"]')];
    select(autoSelect && items.length ? 0 : -1);
    onRender?.(q, results.length);
  };

  input.addEventListener('input', debounce(run, 70));
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' && items.length) {
      e.preventDefault();
      select((active + 1) % items.length);
    } else if (e.key === 'ArrowUp' && items.length) {
      e.preventDefault();
      select((active - 1 + items.length) % items.length);
    } else if (e.key === 'Enter' && active >= 0 && items[active]) {
      e.preventDefault();
      location.href = items[active].href;
    }
  });
  list.addEventListener('mousemove', (e) => {
    const i = items.indexOf(e.target.closest('[role="option"]'));
    if (i >= 0 && i !== active) select(i);
  });
  return { run };
}

export function initPalette() {
  const dialog = document.getElementById('palette');
  if (!dialog || typeof dialog.showModal !== 'function') return;
  const input = dialog.querySelector('.palette-input');
  const box = listbox({
    input,
    list: dialog.querySelector('.palette-list'),
    status: dialog.querySelector('.palette-status'),
    limit: 8,
    idle: quickLinks
  });

  const open = (q = '') => {
    if (dialog.open) return;
    dialog.showModal();
    input.value = q;
    input.focus();
    box.run();
    loadSearch().catch(() => {});
  };
  const close = () => dialog.open && dialog.close();

  document.addEventListener('click', (e) => {
    const trigger = e.target.closest('[data-palette-open]');
    if (trigger && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
      e.preventDefault();
      open();
    }
  });
  dialog.querySelector('[data-palette-close]').addEventListener('click', close);
  dialog.addEventListener('click', (e) => { if (e.target === dialog) close(); });
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      dialog.open ? close() : open();
    } else if (e.key === '/' && !dialog.open && !isTyping(document.activeElement) && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      open();
    }
  });
  // Warm the index when the user shows intent.
  document.querySelectorAll('[data-palette-open]').forEach((el) => {
    el.addEventListener('pointerenter', () => loadSearch().catch(() => {}), { once: true });
  });
}

// Hero search fields with a dropdown of results; on the search page the field drives the page.
export function initInstant() {
  const page = document.querySelector('[data-search-page]');
  for (const form of document.querySelectorAll('form[data-instant]')) {
    const input = form.querySelector('input[name="q"]');
    const panel = form.querySelector('.instant');
    if (!input || !panel) continue;
    if (page) {
      initSearchPage(form, input, page);
      continue;
    }
    const list = panel.querySelector('.instant-list');
    const status = panel.querySelector('.instant-status');
    const show = (on) => {
      panel.hidden = !on;
      input.setAttribute('aria-expanded', String(on));
    };
    const box = listbox({ input, list, status, limit: 6, autoSelect: false, onRender: (q) => show(!!q) });
    input.addEventListener('focus', () => {
      loadSearch().catch(() => {});
      if (input.value.trim()) box.run();
    });
    input.addEventListener('keydown', (e) => { if (e.key === 'Escape') show(false); });
    document.addEventListener('click', (e) => { if (!form.contains(e.target)) show(false); });
    form.addEventListener('focusout', (e) => { if (!form.contains(e.relatedTarget)) setTimeout(() => { if (!form.contains(document.activeElement)) show(false); }, 120); });
  }
}

function initSearchPage(form, input, page) {
  const summary = page.querySelector('[data-search-summary]');
  const cards = page.querySelector('[data-search-cards]');
  const params = new URLSearchParams(location.search);
  input.value = params.get('q') || '';

  const run = async () => {
    const q = input.value.trim();
    const url = new URL(location.href);
    if (q) url.searchParams.set('q', q); else url.searchParams.delete('q');
    history.replaceState(null, '', url);
    if (!q) {
      summary.textContent = t('search.start');
      cards.innerHTML = '';
      return;
    }
    summary.textContent = t('search.loading');
    let ctx;
    try {
      ctx = await loadSearch();
    } catch (error) {
      console.error(error);
      summary.textContent = t('search.error');
      return;
    }
    if (input.value.trim() !== q) return;
    const results = ctx.searcher.search(q, { limit: 60 });
    if (!results.length) {
      summary.textContent = '';
      cards.innerHTML = `<div class="empty-inline">${emptyBlock(q)}</div>`;
      return;
    }
    summary.textContent = (results.some((r) => r.partial) ? t('search.partial') + '. ' : '') + t('search.found', { n: results.length });
    cards.innerHTML = results.map((r) => card(r, ctx.docs.get(r.path) || {}, ctx.tx)).join('');
  };
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    run();
  });
  input.addEventListener('input', debounce(run, 120));
  run();
}
