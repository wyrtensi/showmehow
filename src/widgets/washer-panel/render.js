// Server HTML of the washer-panel widget (docs/spec.md 11.6): the machine's panel drawing in its
// first everyday setting (presets[0]), what that cycle does and the detergent drawer, prerendered
// so the page reads without JavaScript. client.js fetches the machine data the build copies to
// assets/washers/<id>.json (the data-src link) and makes the knobs, buttons and chips live.
// Machine data: data/washers/<id>.json, read here at build time.
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import * as E from './engine.js';
import { T, localize } from './strings.js';
import { esc, panelSVG, chipsHTML, resultHTML, trayHTML, presetsHTML, presetNote } from './panel.js';

export const DATA_DIR = join(import.meta.dirname, '..', '..', '..', 'data', 'washers');
const cache = new Map();

export const machineFile = (id) => join(DATA_DIR, `${id}.json`);
export const machineExists = (id) => /^[a-z0-9-]+$/.test(String(id || '')) && existsSync(machineFile(id));

// Raw machine data (Russian with the en block); read once per build.
export function loadMachine(id) {
  if (!cache.has(id)) {
    if (!machineExists(id)) throw new Error(`washer-panel: no machine data for "${id}" in data/washers/`);
    cache.set(id, JSON.parse(readFileSync(machineFile(id), 'utf8')));
  }
  return cache.get(id);
}

// What listings need to know about the guide's machine (docs/spec.md 5.2): a short name for
// breadcrumbs and cards, and the control type for the machines hub filter.
export function meta(params, lang = 'ru') {
  if (!machineExists(params?.machine)) return null;
  const m = loadMachine(params.machine);
  const electronic = E.isElectronic(m);
  const name = {
    ru: { mechanical: 'Механический таймер', electronic: 'Электронное управление' },
    en: { mechanical: 'Mechanical timer', electronic: 'Electronic control' }
  }[lang === 'en' ? 'en' : 'ru'];
  const id = electronic ? 'electronic' : 'mechanical';
  return {
    label: `${m.brand} ${m.model}`,
    facet: { key: 'x', label: lang === 'en' ? 'Controls' : 'Управление', id, name: name[id] },
    partial: m.completeness === 'partial'
  };
}

export function render(params, ctx = {}) {
  const lang = ctx.lang === 'en' ? 'en' : 'ru';
  const s = T[lang];
  const m = localize(loadMachine(params.machine), lang);
  const state = E.defaultState(m);
  const preset = m.presets?.[0] || null;
  const name = `${m.brand} ${m.model}`;
  const href = typeof ctx.href === 'function' ? ctx.href(`assets/washers/${m.id}.json`, 'ru') : `/assets/washers/${m.id}.json`;
  const gaps = m.completeness === 'partial' && m.notes?.gaps?.length
    ? `<div class="wp-partial" role="note"><p class="wp-partial-t">${esc(s.partial)} ${esc(s.partialLead)}</p><ul>${m.notes.gaps.map((g) => `<li>${esc(g)}</li>`).join('')}</ul></div>`
    : '';
  const presets = preset ? `<div class="wp-block wp-presets-box" data-js><p class="wp-label" id="wp-presets-${esc(m.id)}">${esc(s.presets)}</p><div data-presets role="group" aria-labelledby="wp-presets-${esc(m.id)}">${presetsHTML(m, preset)}</div><p class="wp-note" data-preset-note>${presetNote(preset)}</p></div>` : '';
  return `<div class="wgt wgt-washer" data-washer data-machine="${esc(m.id)}" data-src="${esc(href)}">
<div class="wgt-head"><h3 class="wgt-title">${esc(s.title)}: ${esc(name)}</h3><p class="wgt-lead">${esc(s.lead)}</p></div>
${gaps}${presets}
<div class="panel-wrap" data-panel>${panelSVG(m, state, { layout: 'machine', uid: 'wp-' + m.id })}</div>
<div class="wp-settings" data-chips data-js>${chipsHTML(m, state)}</div>
<section class="wp-block wp-result-box" aria-labelledby="wp-result-${esc(m.id)}"><h4 class="wp-h" id="wp-result-${esc(m.id)}">${esc(s.result)}</h4><div class="wp-result" data-result aria-live="polite">${resultHTML(m, state)}</div><p class="wp-small">${esc(s.timeNote)}</p></section>
${m.tray ? `<section class="wp-block" aria-labelledby="wp-tray-${esc(m.id)}"><h4 class="wp-h" id="wp-tray-${esc(m.id)}">${esc(s.tray)}</h4><p class="wp-small">${esc(s.trayHint)}</p><div data-tray>${trayHTML(m, E.dosing(m, state), preset?.dose || {})}</div></section>` : ''}
<p class="wgt-nojs">${esc(s.noJs)}</p>
<p class="wp-error" data-error role="alert" hidden>${esc(s.loadError)}</p>
</div>`;
}
