// Browser part of the washer-panel widget, ported from washguide (src/app.js, machine page):
// turning knobs on the drawing or through the chips, option buttons, presets, the URL state
// ?p=<programme>&t=<temperature>&s=<spin>&o=<buttons>&preset=<id>, and a re-render of the result
// card and the drawer on every change. The machine data comes from data-src (assets/washers/<id>.json).
import * as E from './engine.js';
import { T, localize } from './strings.js';
import { panelSVG, chipsHTML, resultHTML, trayHTML, presetsHTML, presetNote, matchPreset, knobValue } from './panel.js';

// The real left-to-right panel needs room; narrower widgets get the stacked layout.
const WIDE = 640;
const KEYS = ['p', 't', 's', 'o', 'preset'];

export function mount(root, params, ctx = {}) {
  const box = root.querySelector('[data-washer]') || root;
  const src = box.dataset.src;
  if (!src) return;
  fetch(src)
    .then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    })
    .then((raw) => init(box, localize(raw, ctx.lang)))
    .catch((error) => {
      const el = box.querySelector('[data-error]');
      if (el) el.hidden = false;
      console.error('washer-panel:', error);
    });
}

// State from ?preset= or ?p=&t=&s=&o=; null when the query names nothing valid.
export function stateFromQuery(m, search) {
  const q = new URLSearchParams(search);
  const pk = E.knob(m, 'program');
  if (q.get('preset')) {
    const p = m.presets?.find((x) => x.id === q.get('preset'));
    if (p) return { state: E.stateFromPreset(m, p), preset: p };
  }
  if (!q.get('p') || !E.position(pk, q.get('p'))) return null;
  const s = E.withProgramDefaults(m, { prog: q.get('p'), temp: null, spin: null, options: {} });
  const tk = E.knob(m, 'temperature');
  const sk = E.knob(m, 'spin');
  if (q.get('t') && E.position(tk, q.get('t'))) s.temp = q.get('t');
  if (q.get('s') && E.position(sk, q.get('s'))) s.spin = q.get('s');
  const opts = (q.get('o') || '').split(',').filter(Boolean);
  for (const b of E.optionButtons(m)) s.options[b.id] = opts.includes(b.id);
  return { state: s, preset: matchPreset(m, s) };
}

// Writes the widget keys into the query and keeps every other key (the guide's ?v= variant).
export function queryFromState(m, state, preset, search = '') {
  const q = new URLSearchParams(search);
  for (const k of KEYS) q.delete(k);
  if (preset && matchPreset(m, state) === preset) q.set('preset', preset.id);
  else {
    q.set('p', state.prog);
    if (state.temp != null) q.set('t', state.temp);
    if (state.spin != null) q.set('s', state.spin);
    const on = Object.keys(state.options).filter((k) => state.options[k]);
    if (on.length) q.set('o', on.join(','));
  }
  return q.toString();
}

function init(box, m) {
  const $ = (s) => box.querySelector(s);
  const tr = T[m._lang];
  const pk = E.knob(m, 'program');
  const panelEl = $('[data-panel]');
  const chipsEl = $('[data-chips]');
  const resultEl = $('[data-result]');
  const trayEl = $('[data-tray]');
  const presetsEl = $('[data-presets]');
  const noteEl = $('[data-preset-note]');
  if (!panelEl || !resultEl || !pk) return;

  const angles = {}; // cumulative rotation per knob, so clockwise-only knobs always turn forward
  let preset = m.presets?.[0] || null;
  let lastWarn = null;
  let layout = '';
  const fromUrl = stateFromQuery(m, location.search);
  let state = fromUrl ? fromUrl.state : E.defaultState(m);
  if (fromUrl) preset = fromUrl.preset;

  function drawPanel() {
    const want = box.clientWidth >= WIDE ? 'machine' : 'compact';
    if (want === layout) return;
    layout = want;
    panelEl.innerHTML = panelSVG(m, state, { layout, uid: 'wp-' + m.id });
    for (const g of panelEl.querySelectorAll('.knob')) angles[g.dataset.ctrl] = Number(g.querySelector('.rot').dataset.angle);
  }

  function turn(c, value) {
    const target = E.position(c, value)?.angle ?? 0;
    const cur = angles[c.id] ?? target;
    const curMod = ((cur % 360) + 360) % 360;
    let delta = target - curMod;
    if (c.rotation === 'cw-only') delta = (delta + 360) % 360;
    else if (delta > 180) delta -= 360;
    else if (delta < -180) delta += 360;
    angles[c.id] = cur + delta;
    return angles[c.id];
  }

  function syncPanel() {
    for (const g of panelEl.querySelectorAll('.knob, .slider')) {
      const c = E.control(m, g.dataset.ctrl);
      const val = knobValue(state, c);
      const rot = g.querySelector('.rot');
      if (rot) rot.style.transform = `rotate(${turn(c, val)}deg)`;
      for (const p of g.querySelectorAll('.pos')) {
        const on = p.dataset.val === val;
        p.classList.toggle('on', on);
        p.setAttribute('aria-pressed', String(on));
      }
    }
    // Sliders draw their handle at the active mark: redraw them whole.
    if (panelEl.querySelector('.slider')) {
      layout = '';
      drawPanel();
    }
    for (const g of panelEl.querySelectorAll('.btn[aria-pressed]')) {
      const on = Boolean(state.options[g.dataset.ctrl]);
      g.classList.toggle('on', on);
      g.setAttribute('aria-pressed', String(on));
    }
  }

  function update({ initial = false } = {}) {
    syncPanel();
    if (chipsEl) chipsEl.innerHTML = chipsHTML(m, state);
    resultEl.innerHTML = resultHTML(m, state, lastWarn ? [{ level: 'info', message: lastWarn }] : []);
    if (trayEl) trayEl.innerHTML = trayHTML(m, E.dosing(m, state), preset?.dose || {});
    if (presetsEl) presetsEl.innerHTML = presetsHTML(m, preset);
    if (noteEl) noteEl.innerHTML = presetNote(preset);
    if (!initial) {
      const q = queryFromState(m, state, preset, location.search);
      history.replaceState(history.state, '', `${location.pathname}?${q}${location.hash}`);
    }
  }

  function setKnob(ctrlId, value) {
    const c = E.control(m, ctrlId);
    if (!c || !E.position(c, value)) return;
    lastWarn = null;
    if (c.role === 'program') {
      const before = E.position(c, state.prog);
      const after = E.position(c, value);
      if (c.rotation === 'cw-only' && before && after && after.angle < before.angle) lastWarn = tr.cwWarn(E.label(before), E.label(after));
      if (m.panel.programChangeWhenOff) {
        const pw = m.panel.controls.find((x) => x.role === 'power');
        if (pw) lastWarn = (lastWarn ? lastWarn + ' ' : '') + tr.offWarn(pw.label || tr.powerWord);
      }
      state = E.withProgramDefaults(m, { ...state, prog: value });
    } else if (c.role === 'temperature') state = { ...state, temp: value };
    else if (c.role === 'spin') state = { ...state, spin: value };
    preset = matchPreset(m, state);
    update();
  }

  function toggleOption(id) {
    state = { ...state, options: { ...state.options, [id]: !state.options[id] } };
    lastWarn = null;
    preset = matchPreset(m, state);
    update();
  }

  const onPanel = (event) => {
    const pos = event.target.closest('.pos[data-val]');
    if (pos) {
      setKnob(pos.closest('.knob, .slider').dataset.ctrl, pos.dataset.val);
      return true;
    }
    const btn = event.target.closest('.btn[aria-pressed]');
    if (btn) {
      toggleOption(btn.dataset.ctrl);
      return true;
    }
    return false;
  };
  panelEl.addEventListener('click', onPanel);
  panelEl.addEventListener('keydown', (event) => {
    if ((event.key === 'Enter' || event.key === ' ') && onPanel(event)) {
      event.preventDefault();
      // The panel was redrawn only in parts; keep focus on the same mark.
      const val = event.target.closest('.pos')?.dataset.val;
      const ctrl = event.target.closest('[data-ctrl]')?.dataset.ctrl;
      const again = val != null && panelEl.querySelector(`[data-ctrl="${CSS.escape(ctrl)}"] .pos[data-val="${CSS.escape(val)}"]`);
      if (again) again.focus();
    }
  });

  chipsEl?.addEventListener('click', (event) => {
    const chip = event.target.closest('.wp-chip');
    if (!chip) return;
    const focus = chip.dataset.opt ? `[data-opt="${CSS.escape(chip.dataset.opt)}"]` : `[data-ctrl="${CSS.escape(chip.closest('[data-ctrl]').dataset.ctrl)}"] [data-val="${CSS.escape(chip.dataset.val)}"]`;
    if (chip.dataset.opt) toggleOption(chip.dataset.opt);
    else setKnob(chip.closest('[data-ctrl]').dataset.ctrl, chip.dataset.val);
    chipsEl.querySelector(focus)?.focus();
  });

  box.addEventListener('click', (event) => {
    const b = event.target.closest('[data-preset]');
    if (!b) return;
    preset = m.presets.find((p) => p.id === b.dataset.preset) || null;
    if (!preset) return;
    state = E.stateFromPreset(m, preset);
    lastWarn = null;
    update();
    box.querySelector(`[data-preset="${CSS.escape(preset.id)}"]`)?.focus();
  });

  let timer = 0;
  const onResize = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      const before = layout;
      drawPanel();
      if (layout !== before) syncPanel();
    }, 120);
  };
  if (typeof ResizeObserver === 'function') new ResizeObserver(onResize).observe(box);
  else window.addEventListener('resize', onResize);

  layout = '';
  drawPanel();
  update({ initial: true });
  box.classList.add('is-live');
}
