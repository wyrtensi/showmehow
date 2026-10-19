// Home page (spec 11.5): the finder ("What do you have?": category, then device, then task, with
// live counts and the state in the query string ?c=&d=&k=, the same keys the catalog filters
// use) and "continue where you left off" from the progress the guide pages remember.
import { t, href, esc, icon, store } from './core.js';
import { formatMinutes } from '../lib/i18n.js';

const lang = document.documentElement.dataset.lang || 'ru';

function homeData() {
  try {
    const raw = JSON.parse(document.getElementById('smh-home')?.textContent || '{}');
    const guides = (raw.g || []).map(([slug, path, title, c, d, k, m]) => ({ slug, path, title, c, d, k, m }));
    return { guides, devices: raw.d || {}, tasks: raw.k || {} };
  } catch {
    return { guides: [], devices: {}, tasks: {} };
  }
}

export function initFinder(box) {
  const data = homeData();
  const form = box.querySelector('[data-finder-form]');
  const stepD = box.querySelector('[data-finder-step="d"]');
  const stepK = box.querySelector('[data-finder-step="k"]');
  const chipsD = box.querySelector('[data-finder-chips="d"]');
  const chipsK = box.querySelector('[data-finder-chips="k"]');
  const count = box.querySelector('[data-finder-count]');
  const list = box.querySelector('[data-finder-list]');
  const none = box.querySelector('[data-finder-none]');
  const actions = box.querySelector('[data-finder-actions]');
  const all = box.querySelector('[data-finder-all]');
  const catalog = box.dataset.catalog;
  const startText = count.textContent;
  if (!form || !data.guides.length) return;

  const picked = (name) => form.querySelector(`input[name="${name}"]:checked`)?.value || '';
  const radio = (name, value, label, n, checked) => `<label class="chip-check${n ? '' : ' is-zero'}"><input type="radio" name="${name}" value="${esc(value)}"${checked ? ' checked' : ''}><span class="chip"><span class="chip-name">${esc(label)}</span><span class="chip-count">${n}</span></span></label>`;
  const tally = (list, key) => {
    const out = new Map();
    for (const g of list) out.set(g[key], (out.get(g[key]) || 0) + 1);
    return out;
  };

  const render = ({ push = true, focusStep = null } = {}) => {
    const c = picked('c');
    let d = picked('d');
    let k = picked('k');
    const inCat = data.guides.filter((g) => g.c === c);
    // Devices of the category, then tasks of the category and device, each with live counts.
    if (c) {
      const devs = tally(inCat, 'd');
      if (d && !devs.has(d)) d = '';
      chipsD.innerHTML = radio('d', '', box.dataset.any, inCat.length, !d) +
        [...devs].sort((a, b) => b[1] - a[1]).map(([id, n]) => radio('d', id, data.devices[id] || id, n, id === d)).join('');
      const inDev = inCat.filter((g) => !d || g.d === d);
      const tasks = tally(inDev, 'k');
      if (k && !tasks.has(k)) k = '';
      chipsK.innerHTML = radio('k', '', box.dataset.anyTask, inDev.length, !k) +
        [...tasks].sort((a, b) => b[1] - a[1]).map(([id, n]) => radio('k', id, data.tasks[id] || id, n, id === k)).join('');
    }
    stepD.hidden = !c;
    stepK.hidden = !c;
    const hits = c ? inCat.filter((g) => (!d || g.d === d) && (!k || g.k === k)) : [];
    count.textContent = c ? t('count.guides', { n: hits.length }) : startText;
    list.innerHTML = hits.slice(0, 6).map((g) => `<li><a class="finder-hit" href="${esc(href(g.path))}"><span class="finder-hit-t">${esc(g.title)}</span><span class="finder-hit-m">${icon('clock')}${esc(formatMinutes(lang, g.m))}</span></a></li>`).join('');
    none.hidden = !c || hits.length > 0;
    actions.hidden = !c;
    const q = new URLSearchParams();
    if (c) q.set('c', c);
    if (d) q.set('d', d);
    if (k) q.set('k', k);
    all.href = catalog + (q.toString() ? '?' + q : '');
    all.hidden = !hits.length;
    if (push) {
      const url = new URL(location.href);
      for (const key of ['c', 'd', 'k']) url.searchParams.delete(key);
      for (const [key, v] of q) url.searchParams.set(key, v);
      history.replaceState(null, '', url);
    }
    if (focusStep) form.querySelector(`[data-finder-step="${focusStep}"] input:checked`)?.focus();
  };

  form.addEventListener('change', (e) => {
    const name = e.target.name;
    // A new category starts the device and task over; a new device keeps a task that still fits.
    if (name === 'c') { chipsD.innerHTML = ''; chipsK.innerHTML = ''; }
    // Device and task chips are redrawn, so keyboard focus is put back on the checked one.
    render({ focusStep: name === 'd' || name === 'k' ? name : null });
  });
  form.addEventListener('submit', (e) => e.preventDefault());
  form.addEventListener('reset', () => {
    setTimeout(() => {
      chipsD.innerHTML = '';
      chipsK.innerHTML = '';
      render();
      form.querySelector('input[name="c"]')?.focus();
    });
  });

  // Restore from the query string.
  const params = new URLSearchParams(location.search);
  const c = params.get('c');
  const input = c && form.querySelector(`input[name="c"][value="${CSS.escape(c)}"]`);
  if (input) {
    input.checked = true;
    render({ push: false });
    for (const key of ['d', 'k']) {
      const v = params.get(key);
      const el = v && form.querySelector(`input[name="${key}"][value="${CSS.escape(v)}"]`);
      if (el) { el.checked = true; render({ push: false }); }
    }
  }
}

export function initContinue(box) {
  const data = homeData();
  const bySlug = new Map(data.guides.map((g) => [g.slug, g]));
  const listEl = box.querySelector('[data-continue-list]');
  const draw = () => {
    const recent = store.get('smh-recent', []).filter((r) => r && bySlug.has(r.s) && r.n >= 1 && r.n <= r.total).slice(0, 3);
    listEl.innerHTML = recent.map((r) => {
      const g = bySlug.get(r.s);
      const url = href(g.path) + (r.v ? `?v=${encodeURIComponent(r.v)}` : '') + `#step-${Number(r.step) || 1}`;
      const at = box.dataset.at.replace('{n}', r.n).replace('{total}', r.total);
      const p = Math.round(((r.n - 1) / r.total) * 100);
      return `<li class="continue-item" style="--p:${p / 100}"><a class="continue-link" href="${esc(url)}"><span class="continue-t">${esc(g.title)}</span><span class="continue-at">${esc(at)}</span><span class="continue-bar" aria-hidden="true"><span></span></span><span class="continue-go">${esc(box.dataset.open)}${icon('arrow-right')}</span></a><button type="button" class="continue-forget" data-forget="${esc(r.s)}" aria-label="${esc(box.dataset.forget)}: ${esc(g.title)}" title="${esc(box.dataset.forget)}">${icon('close')}</button></li>`;
    }).join('');
    box.hidden = recent.length === 0;
  };
  listEl.addEventListener('click', (e) => {
    const b = e.target.closest('[data-forget]');
    if (!b) return;
    store.set('smh-recent', store.get('smh-recent', []).filter((r) => r && r.s !== b.dataset.forget));
    draw();
  });
  draw();
}
