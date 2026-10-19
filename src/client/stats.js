// Stats page bars (spec 11.5): hover or focus shows the numbers through CSS; on a touch screen the
// first tap on a bar shows them and the second one opens the filtered catalog.
export function initStats(scope = document) {
  const bars = [...scope.querySelectorAll('[data-bar]')];
  if (!bars.length) return;
  const coarse = window.matchMedia('(hover: none)');
  const clear = (except) => bars.forEach((b) => { if (b !== except) b.classList.remove('is-tip'); });
  for (const bar of bars) {
    bar.addEventListener('click', (e) => {
      if (!coarse.matches || bar.classList.contains('is-tip')) return;
      e.preventDefault();
      clear(bar);
      bar.classList.add('is-tip');
    });
  }
  document.addEventListener('click', (e) => { if (!e.target.closest('[data-bar]')) clear(null); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') clear(null); });
}
