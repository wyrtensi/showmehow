// Guide page: done ticks and the tools checklist kept in localStorage, the step-by-step mode
// (buttons, arrow keys, swipe, progress), table of contents and step links, variants ("your
// model", spec 11.2), living illustrations (11.4), troubleshooting chips and the completion
// celebration (11.5).
import { t, store, toast, isTyping, reducedMotion } from './core.js';

const root = document.documentElement;
const RECENT = 'smh-recent';
const RECENT_MAX = 8;

const idsOf = (node) => (node.dataset.variants ?? node.dataset.variant ?? '').split(' ').filter(Boolean);

export function initGuide(el) {
  const slug = el.dataset.guide;
  const list = el.querySelector('[data-steps]');
  const all = [...list.querySelectorAll(':scope > .step')];
  const nOf = (s) => Number(s.dataset.step);
  const byN = new Map(all.map((s) => [nOf(s), s]));
  const doneKey = `smh-done:${slug}`;
  const toolsKey = `smh-tools:${slug}`;
  const variantKey = `smh-variant:${slug}`;
  const done = new Set(store.get(doneKey, []).filter((n) => byN.has(n)));
  const toc = new Map([...el.querySelectorAll('[data-toc]')].map((a) => [Number(a.dataset.toc), a]));
  const banner = el.querySelector('[data-done-banner]');
  const nav = el.querySelector('.step-nav');
  const prevBtn = nav.querySelector('[data-step-prev]');
  const nextBtn = nav.querySelector('[data-step-next]');
  const countEl = nav.querySelector('[data-step-count]');
  const fill = el.querySelector('[data-step-fill]');
  const resetBtn = el.querySelector('[data-progress-reset]');
  const picks = [...el.querySelectorAll('[data-variant-pick]')];
  const variantIds = picks.map((b) => b.dataset.variantPick).filter(Boolean);

  // `shown` are the steps of the chosen variant (all of them without a choice); positions in it
  // are what the reader sees as "step k of total". Storage and anchors keep the original n.
  let variant = '';
  let shown = all;
  let total = all.length;
  let current = 1;
  let wasComplete = false;

  const fits = (node) => !variant || !idsOf(node).length || idsOf(node).includes(variant);
  const position = (n) => shown.indexOf(byN.get(n)) + 1;
  const doneShown = () => shown.filter((s) => done.has(nOf(s))).length;
  const complete = () => total > 0 && doneShown() === total;

  // ---- variants
  const applyVariant = () => {
    shown = all.filter(fits);
    total = shown.length;
    for (const s of all) s.hidden = !shown.includes(s);
    el.querySelectorAll('.variant[data-variant]').forEach((b) => { b.hidden = !fits(b); });
    for (const [n, a] of toc) a.parentElement.hidden = !shown.includes(byN.get(n));
    shown.forEach((s, k) => {
      const n = s.querySelector('.step-num-n');
      if (n) n.textContent = String(k + 1);
      const of = s.querySelector('.step-of');
      if (of) of.textContent = t('guide.stepOf', { n: k + 1, total }) + ' ';
      s.querySelector('[data-done]')?.setAttribute('aria-label', t('guide.markDone', { n: k + 1 }));
      const tn = toc.get(nOf(s))?.querySelector('.toc-n');
      if (tn) tn.textContent = String(k + 1);
    });
    el.classList.toggle('has-variant', Boolean(variant));
    for (const b of picks) b.setAttribute('aria-pressed', String(b.dataset.variantPick === variant));
  };
  const chooseVariant = (id, { persist = true } = {}) => {
    variant = variantIds.includes(id) ? id : '';
    if (persist) {
      store.set(variantKey, variant || null);
      const url = new URL(location.href);
      if (variant) url.searchParams.set('v', variant); else url.searchParams.delete('v');
      history.replaceState(null, '', url);
    }
    applyVariant();
    wasComplete = complete();
    paint();
    if (stepMode()) go(Math.min(current, total), { scroll: false });
  };
  for (const b of picks) b.addEventListener('click', () => chooseVariant(b.dataset.variantPick));

  // ---- done ticks
  const remember = () => {
    // Home page "continue" list: guides with progress, newest first (spec 11.5).
    const rest = store.get(RECENT, []).filter((r) => r && r.s !== slug);
    const count = doneShown();
    if (count > 0 && count < total) {
      const next = shown.findIndex((s) => !done.has(nOf(s)));
      rest.unshift({ s: slug, n: next + 1, total, step: nOf(shown[next]), v: variant || undefined, at: Date.now() });
    }
    store.set(RECENT, rest.length ? rest.slice(0, RECENT_MAX) : null);
  };
  const paint = () => {
    for (const s of all) {
      const n = nOf(s);
      const on = done.has(n);
      s.classList.toggle('is-done', on);
      const box = s.querySelector('[data-done]');
      if (box) box.checked = on;
      toc.get(n)?.classList.toggle('is-done', on);
    }
    const count = doneShown();
    const text = t('guide.progress', { done: count, total });
    el.querySelectorAll('[data-progress-text]').forEach((p) => { p.textContent = text; });
    el.querySelector('[data-ring]')?.style.setProperty('--p', total ? count / total : 0);
    if (resetBtn) resetBtn.hidden = done.size === 0;
    if (banner) banner.hidden = !complete();
  };
  const celebrate = () => {
    if (!banner) return;
    banner.classList.remove('is-fresh');
    void banner.offsetWidth;
    banner.classList.add('is-fresh');
    banner.scrollIntoView({ block: 'nearest', behavior: reducedMotion() ? 'auto' : 'smooth' });
  };
  const save = () => store.set(doneKey, done.size ? [...done].sort((a, b) => a - b) : null);
  const mark = (n, on) => {
    const had = done.has(n);
    if (on) done.add(n); else done.delete(n);
    save();
    paint();
    remember();
    if (on && !had) {
      const s = byN.get(n);
      s.classList.add('just-done');
      setTimeout(() => s.classList.remove('just-done'), 600);
    }
    const now = complete();
    if (now && !wasComplete) celebrate();
    wasComplete = now;
  };
  list.addEventListener('change', (e) => {
    const box = e.target.closest('[data-done]');
    if (box) mark(Number(box.dataset.done), box.checked);
  });
  resetBtn?.addEventListener('click', () => {
    done.clear();
    save();
    paint();
    remember();
    wasComplete = false;
  });

  banner?.querySelector('[data-done-share]')?.addEventListener('click', async (e) => {
    const url = location.origin + location.pathname + location.search;
    const text = e.currentTarget.dataset.text || document.title;
    if (navigator.share) {
      try {
        await navigator.share({ title: document.title, text, url });
        return;
      } catch (error) {
        if (error?.name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      toast(t('guide.copied'));
    } catch {
      toast(t('guide.copyFailed'));
    }
  });

  // ---- tools checklist
  const tools = new Set(store.get(toolsKey, []));
  el.querySelectorAll('[data-tool]').forEach((box) => {
    box.checked = tools.has(Number(box.dataset.tool));
    box.addEventListener('change', () => {
      const i = Number(box.dataset.tool);
      if (box.checked) tools.add(i); else tools.delete(i);
      store.set(toolsKey, tools.size ? [...tools] : null);
    });
  });

  // ---- living illustrations: animations run only while their step is on screen
  const figs = new Map(all.map((s) => [s, s.querySelector('.step-fig')]).filter(([, f]) => f));
  const setLive = (fig, on) => {
    if (!fig) return;
    if (on) addHotRings(fig);
    fig.classList.toggle('is-live', on);
  };
  let figObserver = null;
  if ('IntersectionObserver' in window) {
    figObserver = new IntersectionObserver((entries) => {
      if (stepMode()) return;
      for (const en of entries) setLive(en.target, en.isIntersecting);
    }, { threshold: 0.2 });
    for (const f of figs.values()) figObserver.observe(f);
  } else {
    for (const f of figs.values()) setLive(f, true);
  }

  // ---- step-by-step mode
  const stepMode = () => root.classList.contains('mode-steps');
  const fromHash = () => {
    const m = /^#step-(\d+)$/.exec(location.hash);
    return m ? position(Number(m[1])) : 0;
  };
  const scrollToSteps = () => {
    const top = list.getBoundingClientRect().top + window.scrollY - 140;
    if (window.scrollY > top || window.scrollY < top - window.innerHeight / 2) window.scrollTo({ top, behavior: reducedMotion() ? 'auto' : 'smooth' });
  };
  const go = (k, { scroll = true, hash = true } = {}) => {
    if (!total) return;
    k = Math.min(Math.max(1, k), total);
    const back = k < current;
    current = k;
    const target = shown[k - 1];
    for (const s of all) {
      s.classList.toggle('is-current', s === target);
      s.classList.toggle('from-left', s === target && back);
      setLive(figs.get(s), s === target);
    }
    list.classList.add('is-ready');
    for (const [n, a] of toc) a.classList.toggle('is-current', n === nOf(target));
    countEl.textContent = t('guide.stepOf', { n: k, total });
    fill?.style.setProperty('--p', k / total);
    prevBtn.disabled = k === 1;
    nextBtn.querySelector('span').textContent = k === total ? nextBtn.dataset.finish : nextBtn.dataset.next;
    if (hash) history.replaceState(null, '', '#step-' + nOf(target));
    if (scroll) scrollToSteps();
  };
  const setMode = (mode, { save: persist = true } = {}) => {
    const on = mode === 'steps';
    root.classList.toggle('mode-steps', on);
    el.querySelectorAll('[data-mode]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === mode)));
    if (persist) store.set('smh-mode', on ? 'steps' : null);
    if (on) {
      const firstOpen = shown.findIndex((s) => !done.has(nOf(s))) + 1;
      go(fromHash() || firstOpen || 1, { hash: !!fromHash() || persist, scroll: persist || !!fromHash() });
    } else {
      all.forEach((s) => s.classList.remove('is-current', 'from-left'));
      list.classList.remove('is-ready');
      // The observer reports the figures again once they are laid out in full mode.
      if (figObserver) for (const f of figs.values()) { figObserver.unobserve(f); figObserver.observe(f); }
    }
  };
  el.querySelectorAll('[data-mode]').forEach((b) => b.addEventListener('click', () => setMode(b.dataset.mode)));
  prevBtn.addEventListener('click', () => go(current - 1));
  nextBtn.addEventListener('click', () => {
    const n = nOf(shown[current - 1]);
    if (!done.has(n)) mark(n, true);
    if (current < total) go(current + 1);
    else banner?.scrollIntoView({ block: 'center', behavior: reducedMotion() ? 'auto' : 'smooth' });
  });
  document.addEventListener('keydown', (e) => {
    if (!stepMode() || e.altKey || e.ctrlKey || e.metaKey || isTyping(document.activeElement) || document.querySelector('dialog[open]')) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); go(current + 1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); go(current - 1); }
  });
  let touch = null;
  list.addEventListener('touchstart', (e) => {
    if (!stepMode() || e.touches.length !== 1 || e.target.closest('.table-wrap, pre, input, label, .widget, .timer')) { touch = null; return; }
    touch = { x: e.touches[0].clientX, y: e.touches[0].clientY, at: Date.now() };
  }, { passive: true });
  list.addEventListener('touchend', (e) => {
    if (!touch) return;
    const dx = e.changedTouches[0].clientX - touch.x;
    const dy = e.changedTouches[0].clientY - touch.y;
    const quick = Date.now() - touch.at < 700;
    touch = null;
    if (quick && Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) go(current + (dx < 0 ? 1 : -1));
  }, { passive: true });
  window.addEventListener('hashchange', () => {
    const k = fromHash();
    if (k && stepMode()) go(k, { hash: false });
  });
  el.addEventListener('click', (e) => {
    const a = e.target.closest('[data-toc]');
    if (a && stepMode()) {
      e.preventDefault();
      const k = position(Number(a.dataset.toc));
      if (k) go(k);
    }
  });

  // ---- table of contents follows the reading position in full mode
  if ('IntersectionObserver' in window) {
    const seen = new Map();
    const io = new IntersectionObserver((entries) => {
      if (stepMode()) return;
      for (const en of entries) seen.set(Number(en.target.dataset.step), en.isIntersecting);
      const n = [...seen].filter(([, v]) => v).map(([k]) => k).sort((a, b) => a - b)[0];
      if (n) for (const [k, a] of toc) a.classList.toggle('is-current', k === n);
    }, { rootMargin: '-30% 0px -55% 0px' });
    all.forEach((s) => io.observe(s));
  }

  // ---- step links
  el.addEventListener('click', async (e) => {
    const a = e.target.closest('[data-share]');
    if (!a) return;
    e.preventDefault();
    const n = Number(a.dataset.share);
    const url = location.origin + location.pathname + location.search + '#step-' + n;
    history.replaceState(null, '', '#step-' + n);
    const title = byN.get(n)?.querySelector('.step-title')?.textContent || document.title;
    if (navigator.share && window.matchMedia('(pointer: coarse)').matches) {
      try {
        await navigator.share({ title, url });
        return;
      } catch (error) {
        if (error?.name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      toast(t('guide.copied'));
    } catch {
      toast(t('guide.copyFailed'));
    }
  });

  initFaq(el);
  window.addEventListener('beforeprint', () => el.querySelectorAll('details').forEach((d) => { d.open = true; }));

  // ---- start: the variant from ?v= wins over the remembered one
  if (variantIds.length) {
    const fromUrl = new URLSearchParams(location.search).get('v');
    const initial = variantIds.includes(fromUrl) ? fromUrl : store.get(variantKey, '');
    if (initial && variantIds.includes(initial)) {
      variant = initial;
      store.set(variantKey, variant);
    }
    applyVariant();
  }
  wasComplete = complete();
  paint();
  if (root.classList.contains('mode-steps')) setMode('steps', { save: false });
  else if (fromHash()) for (const [k, a] of toc) a.classList.toggle('is-current', k === nOf(shown[fromHash() - 1]));
}

// Hotspot rings (spec 11.4): a pulsing circle around every .hot element of an illustration,
// added the first time the figure is on screen (getBBox needs a laid-out SVG).
const SVG_NS = 'http://www.w3.org/2000/svg';
function addHotRings(fig) {
  if (fig.dataset.rings) return;
  const hots = fig.querySelectorAll('svg .hot');
  if (!hots.length) { fig.dataset.rings = '0'; return; }
  let added = 0;
  for (const hot of hots) {
    let box;
    try {
      box = hot.getBBox();
    } catch {
      continue;
    }
    if (!box.width && !box.height) continue;
    const ring = document.createElementNS(SVG_NS, 'circle');
    ring.setAttribute('class', 'hot-ring');
    ring.setAttribute('cx', String(box.x + box.width / 2));
    ring.setAttribute('cy', String(box.y + box.height / 2));
    ring.setAttribute('r', String(Math.max(box.width, box.height) / 2 + 8));
    ring.setAttribute('fill', 'none');
    hot.after(ring);
    added += 1;
  }
  if (added) fig.dataset.rings = String(added);
}

// Troubleshooting chips: one answer at a time; the <details> stay for no-JS and print.
function initFaq(el) {
  const box = el.querySelector('[data-faq]');
  if (!box) return;
  const chips = [...box.querySelectorAll('[data-faq-pick]')];
  const items = new Map([...box.querySelectorAll('[data-faq-item]')].map((d) => [d.dataset.faqItem, d]));
  if (!chips.length) return;
  box.classList.add('faq-chipped');
  const show = (i) => {
    for (const c of chips) c.setAttribute('aria-expanded', String(c.dataset.faqPick === i));
    for (const [k, d] of items) {
      const on = k === i;
      d.classList.toggle('is-active', on);
      d.open = on;
    }
  };
  show(null);
  for (const c of chips) {
    c.addEventListener('click', () => {
      const i = c.dataset.faqPick;
      show(c.getAttribute('aria-expanded') === 'true' ? null : i);
      if (c.getAttribute('aria-expanded') === 'true') items.get(i)?.scrollIntoView({ block: 'nearest', behavior: reducedMotion() ? 'auto' : 'smooth' });
    });
  }
}
