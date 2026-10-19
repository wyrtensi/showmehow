// Shared browser helpers: page context, safe storage, escaping, sprite icons, toast.
import { t as translate } from '../lib/i18n.js';

const root = document.documentElement;
export const lang = root.dataset.lang || 'ru';
export const base = root.dataset.base || '/';
export const iconsUrl = root.dataset.icons || base + 'assets/icons.svg';
export const searchUrl = root.dataset.search || `${base}assets/search.${lang}.json`;

// The build adds ?v=<hash of all browser JS> to every relative import, this module included; a
// module URL built at run time (a widget client) carries the same query to stay cache-busted.
export const version = new URL(import.meta.url).search;
export const t = (key, vars) => translate(lang, key, vars);
export const href = (path = '', l = lang) => base + (l === 'ru' ? '' : l + '/') + String(path).replace(/^\/+/, '');

let island = null;
export function data() {
  if (island) return island;
  try {
    island = JSON.parse(document.getElementById('smh-data')?.textContent || '{}');
  } catch {
    island = {};
  }
  return island;
}

// localStorage can be missing or throw (private mode, blocked storage); progress is a convenience.
export const store = {
  get(key, fallback = null) {
    try {
      const v = localStorage.getItem(key);
      return v === null ? fallback : JSON.parse(v);
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      if (value === null || value === undefined) localStorage.removeItem(key);
      else localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* storage unavailable: the page keeps working without persistence */
    }
  }
};

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ESC[c]);

export const icon = (name, cls = '') => `<svg class="i i-${name}${cls ? ' ' + cls : ''}" aria-hidden="true" focusable="false"><use href="${esc(iconsUrl)}#i-${name}"></use></svg>`;

export const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function debounce(fn, ms) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

let toastTimer;
export function toast(text) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = text;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

export const isTyping = (el) => !!el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));
