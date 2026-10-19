// Guide page: done ticks and the tools checklist kept in localStorage, the step-by-step mode
// (buttons, arrow keys, swipe, progress), table of contents and step links.
import { t, store, toast, isTyping, reducedMotion } from './core.js';

const root = document.documentElement;

export function initGuide(el) {
  const slug = el.dataset.guide;
  const total = Number(el.dataset.total) || 0;
  const list = el.querySelector('[data-steps]');
  const steps = [...list.querySelectorAll(':scope > .step')];
  const doneKey = `smh-done:${slug}`;
  const toolsKey = `smh-tools:${slug}`;
  const done = new Set(store.get(doneKey, []).filter((n) => n >= 1 && n <= total));
  const toc = new Map([...el.querySelectorAll('[data-toc]')].map((a) => [Number(a.dataset.toc), a]));
  const banner = el.querySelector('[data-done-banner]');
  const nav = el.querySelector('.step-nav');
  const prevBtn = nav.querySelector('[data-step-prev]');
  const nextBtn = nav.querySelector('[data-step-next]');
  const countEl = nav.querySelector('[data-step-count]');
  const fill = el.querySelector('[data-step-fill]');
  const resetBtn = el.querySelector('[data-progress-reset]');
  let current = 1;

  // ---- done ticks
  const paint = () => {
    for (const s of steps) {
      const n = Number(s.dataset.step);
      const on = done.has(n);
      s.classList.toggle('is-done', on);
      const box = s.querySelector('[data-done]');
      if (box) box.checked = on;
      toc.get(n)?.classList.toggle('is-done', on);
    }
    const text = t('guide.progress', { done: done.size, total });
    el.querySelectorAll('[data-progress-text]').forEach((p) => { p.textContent = text; });
    el.querySelector('[data-ring]')?.style.setProperty('--p', total ? done.size / total : 0);
    if (resetBtn) resetBtn.hidden = done.size === 0;
    if (banner) banner.hidden = !(total && done.size === total);
  };
  const save = () => store.set(doneKey, done.size ? [...done].sort((a, b) => a - b) : null);
  const mark = (n, on) => {
    const had = done.has(n);
    if (on) done.add(n); else done.delete(n);
    save();
    paint();
    if (on && !had) {
      const s = steps[n - 1];
      s.classList.add('just-done');
      setTimeout(() => s.classList.remove('just-done'), 600);
    }
  };
  list.addEventListener('change', (e) => {
    const box = e.target.closest('[data-done]');
    if (box) mark(Number(box.dataset.done), box.checked);
  });
  resetBtn?.addEventListener('click', () => {
    done.clear();
    save();
    paint();
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

  // ---- step-by-step mode
  const stepMode = () => root.classList.contains('mode-steps');
  const fromHash = () => {
    const m = /^#step-(\d+)$/.exec(location.hash);
    const n = m ? Number(m[1]) : 0;
    return n >= 1 && n <= total ? n : 0;
  };
  const scrollToSteps = () => {
    const top = list.getBoundingClientRect().top + window.scrollY - 140;
    if (window.scrollY > top || window.scrollY < top - window.innerHeight / 2) window.scrollTo({ top, behavior: reducedMotion() ? 'auto' : 'smooth' });
  };
  const go = (n, { scroll = true, hash = true } = {}) => {
    n = Math.min(Math.max(1, n), total);
    const back = n < current;
    current = n;
    steps.forEach((s, i) => {
      s.classList.toggle('is-current', i === n - 1);
      s.classList.toggle('from-left', i === n - 1 && back);
    });
    list.classList.add('is-ready');
    for (const [k, a] of toc) a.classList.toggle('is-current', k === n);
    countEl.textContent = t('guide.stepOf', { n, total });
    fill?.style.setProperty('--p', n / total);
    prevBtn.disabled = n === 1;
    nextBtn.querySelector('span').textContent = n === total ? nextBtn.dataset.finish : nextBtn.dataset.next;
    if (hash) history.replaceState(null, '', '#step-' + n);
    if (scroll) scrollToSteps();
  };
  const setMode = (mode, { save: persist = true } = {}) => {
    const steps_ = mode === 'steps';
    root.classList.toggle('mode-steps', steps_);
    el.querySelectorAll('[data-mode]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === mode)));
    if (persist) store.set('smh-mode', steps_ ? 'steps' : null);
    if (steps_) {
      const firstOpen = steps.findIndex((s) => !done.has(Number(s.dataset.step))) + 1;
      go(fromHash() || firstOpen || 1, { hash: !!fromHash() || persist, scroll: persist || !!fromHash() });
    } else {
      steps.forEach((s) => s.classList.remove('is-current', 'from-left'));
      list.classList.remove('is-ready');
    }
  };
  el.querySelectorAll('[data-mode]').forEach((b) => b.addEventListener('click', () => setMode(b.dataset.mode)));
  prevBtn.addEventListener('click', () => go(current - 1));
  nextBtn.addEventListener('click', () => {
    if (!done.has(current)) mark(current, true);
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
    if (!stepMode() || e.touches.length !== 1 || e.target.closest('.table-wrap, pre, input, label')) { touch = null; return; }
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
    const n = fromHash();
    if (n && stepMode()) go(n, { hash: false });
  });
  el.addEventListener('click', (e) => {
    const a = e.target.closest('[data-toc]');
    if (a && stepMode()) {
      e.preventDefault();
      go(Number(a.dataset.toc));
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
    steps.forEach((s) => io.observe(s));
  }

  // ---- step links
  el.addEventListener('click', async (e) => {
    const a = e.target.closest('[data-share]');
    if (!a) return;
    e.preventDefault();
    const n = Number(a.dataset.share);
    const url = location.origin + location.pathname + location.search + '#step-' + n;
    history.replaceState(null, '', '#step-' + n);
    const title = steps[n - 1]?.querySelector('.step-title')?.textContent || document.title;
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

  window.addEventListener('beforeprint', () => el.querySelectorAll('details').forEach((d) => { d.open = true; }));

  paint();
  if (root.classList.contains('mode-steps')) setMode('steps', { save: false });
  else if (fromHash()) for (const [k, a] of toc) a.classList.toggle('is-current', k === fromHash());
}
