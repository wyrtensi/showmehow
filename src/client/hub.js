// Device hub (spec 5.2): a quick filter over the models grouped by brand. One choice per filter
// (brand, and the widget's extra facet such as the control type), kept in ?b= and ?x=. Groups
// without a visible model hide. Without JavaScript every group is shown and the filter is hidden.
const KEYS = ['b', 'x'];

export function initHub(box) {
  const chips = [...box.querySelectorAll('[data-hub-key]')];
  const items = [...box.querySelectorAll('.hub-item')];
  const groups = [...box.querySelectorAll('[data-hub-group]')];
  const none = box.querySelector('[data-hub-none]');
  const state = { b: '', x: '' };

  const apply = ({ push = true } = {}) => {
    for (const c of chips) {
      const on = state[c.dataset.hubKey] === c.dataset.hubVal;
      c.classList.toggle('is-on', on);
      c.setAttribute('aria-pressed', String(on));
    }
    let shown = 0;
    for (const it of items) {
      const ok = (!state.b || it.dataset.b.split(' ').includes(state.b)) && (!state.x || it.dataset.x === state.x);
      it.hidden = !ok;
      if (ok) shown++;
    }
    for (const g of groups) g.hidden = !g.querySelector('.hub-item:not([hidden])');
    if (none) none.hidden = shown > 0;
    if (push) {
      const url = new URL(location.href);
      for (const k of KEYS) {
        if (state[k]) url.searchParams.set(k, state[k]); else url.searchParams.delete(k);
      }
      history.replaceState(history.state, '', url);
    }
  };

  const params = new URLSearchParams(location.search);
  for (const k of KEYS) {
    const v = params.get(k) || '';
    if (chips.some((c) => c.dataset.hubKey === k && c.dataset.hubVal === v)) state[k] = v;
  }
  box.addEventListener('click', (event) => {
    const c = event.target.closest('[data-hub-key]');
    if (!c) return;
    state[c.dataset.hubKey] = c.dataset.hubVal;
    apply();
  });
  apply({ push: false });
}
