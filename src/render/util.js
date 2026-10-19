// Small string helpers shared by the templates.
import { t as translate, formatDate, formatMinutes } from '../lib/i18n.js';

export const REPO = 'https://github.com/wyrtensi/showmehow';

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ESC[c]);
export const attr = esc;

// Conditional class list: cls('a', on && 'b') -> 'a b'.
export const cls = (...parts) => parts.filter(Boolean).join(' ');

// Language-bound helpers for one site: tr('key', vars), date(iso), minutes(n).
export function tools(site) {
  const lang = site.lang;
  return {
    lang,
    tr: (key, vars) => translate(lang, key, vars),
    date: (iso) => formatDate(lang, iso),
    minutes: (n) => formatMinutes(lang, n)
  };
}

// Language-neutral files at the dist root (CSS, JS, JSON, images). The build may provide
// site.asset(path) to add the ?v= cache-busting hash; otherwise the plain root path is used.
export function asset(site, path) {
  return typeof site.asset === 'function' ? site.asset(path) : (site.base || '/') + path;
}

// JSON for <script type="application/ld+json"> and data islands: no way to close the tag.
export function jsonScript(value) {
  return JSON.stringify(value).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
}

export function issueUrl(params) {
  const q = Object.entries(params).filter(([, v]) => v != null && v !== '').map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
  return `${REPO}/issues/new?${q}`;
}

export const ext = (url, text, extra = '') => `<a href="${attr(url)}" rel="noopener" target="_blank"${extra}>${text}</a>`;
