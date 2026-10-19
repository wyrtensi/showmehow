// Open guide requests from the GitHub API (sorted by thumbs-up), and the request form that opens
// the prefilled GitHub issue form.
import { t, esc, icon, lang } from './core.js';

const CACHE_KEY = 'smh-requests';
const CACHE_MS = 10 * 60 * 1000;
let pending = null;

function cached() {
  try {
    const c = JSON.parse(sessionStorage.getItem(CACHE_KEY) || 'null');
    return c && Date.now() - c.at < CACHE_MS ? c.items : null;
  } catch {
    return null;
  }
}

function fetchRequests(api) {
  const hit = cached();
  if (hit) return Promise.resolve(hit);
  pending ||= fetch(api, { headers: { Accept: 'application/vnd.github+json' } })
    .then((r) => {
      if (!r.ok) throw new Error(`GitHub API: HTTP ${r.status}`);
      return r.json();
    })
    .then((issues) => {
      const items = issues
        .filter((i) => !i.pull_request)
        .map((i) => ({ n: i.number, title: i.title, url: i.html_url, votes: i.reactions?.['+1'] || 0, at: i.created_at }))
        .sort((a, b) => b.votes - a.votes || b.at.localeCompare(a.at));
      try {
        sessionStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), items }));
      } catch {
        /* no session storage: just refetch next time */
      }
      return items;
    });
  return pending;
}

const date = (iso) => new Intl.DateTimeFormat(lang === 'en' ? 'en-GB' : 'ru-RU', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso));

export async function initRequests(box) {
  const status = box.querySelector('[data-requests-status]');
  const list = box.querySelector('[data-requests-list]');
  const labels = JSON.parse(box.dataset.labels || '{}');
  try {
    const items = await fetchRequests(box.dataset.api);
    const shown = box.dataset.requests === 'top' ? items.slice(0, 6) : items;
    if (!shown.length) {
      status.textContent = labels.none || t('req.none');
      return;
    }
    if (box.dataset.requests === 'top') status.textContent = `${labels.open}: ${items.length}`;
    else status.hidden = true;
    list.innerHTML = shown.map((r) => `<li><a class="request" href="${esc(r.url)}" rel="noopener" target="_blank"><span class="request-votes" title="${esc(t('count.votes', { n: r.votes }))}">${icon('thumb')}<b>${r.votes}</b></span><span class="request-text"><span class="request-title">${esc(r.title)}</span><span class="request-meta">#${r.n} · ${esc(date(r.at))}</span></span></a></li>`).join('');
  } catch (error) {
    console.error(error);
    status.classList.add('is-error');
    status.innerHTML = `${icon('warning')}<span>${esc(labels.error || t('req.error'))}</span>`;
  }
}

export function initRequestForm(form) {
  const params = new URLSearchParams(location.search);
  const device = form.querySelector('[name="device"]');
  const goal = form.querySelector('[name="goal"]');
  const category = form.querySelector('[name="category"]');
  if (params.get('device') || params.get('q')) device.value = params.get('device') || params.get('q');
  if (params.get('goal')) goal.value = params.get('goal');
  const cat = params.get('category');
  if (cat) {
    const opt = [...category.options].find((o) => o.dataset.id === cat);
    if (opt) opt.selected = true;
  }
  form.addEventListener('submit', () => {
    const g = goal.value.trim().replace(/\s+/g, ' ');
    const short = g.length > 70 ? g.slice(0, 67).trimEnd() + '...' : g;
    const title = form.querySelector('[data-request-title]');
    title.disabled = false;
    title.value = `${form.dataset.prefix}: ${device.value.trim()}${short ? ' - ' + short : ''}`;
  });
}
