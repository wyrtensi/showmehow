// Theme switch (system / light / dark), language switch that keeps path and query, and the
// header dropdowns.
import { store } from './core.js';

const root = document.documentElement;
const THEMES = ['system', 'light', 'dark'];
const META = { light: '#fbf7f1', dark: '#141a24' };

function applyTheme(theme) {
  if (theme === 'light' || theme === 'dark') root.setAttribute('data-theme', theme);
  else root.removeAttribute('data-theme');
  for (const m of document.querySelectorAll('meta[name="theme-color"]')) {
    const own = m.media.includes('dark') ? META.dark : META.light;
    m.content = theme === 'system' ? own : META[theme];
  }
  for (const b of document.querySelectorAll('[data-theme-set]')) b.setAttribute('aria-pressed', String(b.dataset.themeSet === theme));
  for (const b of document.querySelectorAll('[data-theme-toggle]')) {
    const l = JSON.parse(b.dataset.labels || '{}');
    b.setAttribute('aria-label', `${l.label}: ${l[theme]}`);
    b.title = l[theme] || '';
  }
}

export function initTheme() {
  const current = () => root.getAttribute('data-theme') || 'system';
  const set = (theme) => {
    store.set('smh-theme', theme === 'system' ? null : theme);
    applyTheme(theme);
  };
  applyTheme(current());
  document.addEventListener('click', (e) => {
    const toggle = e.target.closest('[data-theme-toggle]');
    if (toggle) set(THEMES[(THEMES.indexOf(current()) + 1) % THEMES.length]);
    const pick = e.target.closest('[data-theme-set]');
    if (pick) set(pick.dataset.themeSet);
  });
}

export function initLangSwitch() {
  const links = [...document.querySelectorAll('[data-lang-switch]')];
  const update = () => {
    for (const a of links) {
      const url = new URL(a.getAttribute('data-href') || a.href);
      a.setAttribute('data-href', url.origin + url.pathname);
      a.href = url.pathname + location.search + location.hash;
    }
  };
  update();
  window.addEventListener('hashchange', update);
  window.addEventListener('popstate', update);
  // Filters and search rewrite the query with replaceState, which fires no event.
  document.addEventListener('pointerdown', (e) => { if (e.target.closest('[data-lang-switch]')) update(); });
  document.addEventListener('focusin', (e) => { if (e.target.closest('[data-lang-switch]')) update(); });
}

export function initDropdowns() {
  const all = () => [...document.querySelectorAll('details.dropdown')];
  document.addEventListener('click', (e) => {
    for (const d of all()) if (d.open && !d.contains(e.target)) d.open = false;
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    for (const d of all()) {
      if (d.open) {
        d.open = false;
        d.querySelector('summary')?.focus();
      }
    }
  });
  for (const d of all()) {
    d.addEventListener('toggle', () => {
      if (d.open) for (const o of all()) if (o !== d) o.open = false;
    });
  }
}
