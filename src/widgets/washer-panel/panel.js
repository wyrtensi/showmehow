// HTML and SVG of the washer-panel widget. The panel drawing (panelSVG and its controls) and the
// detergent drawer (trayHTML) are washguide's src/render.js as is: every machine keeps its own look
// (plastic colour, print colour, knob shapes, labels, layout), because the point is that it looks
// like the person's real machine. Their styles live in 61-washer.css, scoped under .wgt-washer.
// The result card, chips and presets around them follow the Show Me How design tokens.
// Shared by render.js (prerender) and client.js (re-render on every change).
import * as E from './engine.js';
import { L } from './strings.js';

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ---------- icons (24x24, stroke = currentColor), washguide's set ----------
const ICONS = {
  power: '<circle cx="12" cy="13" r="7"/><path d="M12 3v9"/>',
  'half-load': '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 12.5h16"/><path d="M4 12.5h16v7.5H4z" fill="currentColor" stroke="none" opacity=".35"/>',
  'water-stop': '<path d="M3 8l2 11h14l2-11"/><path d="M5.5 13c2-1.3 4 1.3 6.5 0s4.5-1.3 6.5 0"/>',
  'no-spin': '<path d="M12 12m-1 0a1 1 0 1 0 2 0a4 4 0 1 0-8 0a7 7 0 1 0 14 0"/><path d="M4 20L20 4"/>',
  spin: '<path d="M12 12m-1 0a1 1 0 1 0 2 0a4 4 0 1 0-8 0a7 7 0 1 0 14 0"/>',
  snowflake: '<path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9"/><path d="M9.5 4.5L12 6l2.5-1.5M9.5 19.5L12 18l2.5 1.5"/>',
  flower: '<circle cx="12" cy="12" r="2.2"/><path d="M12 9.8c-1.8-3.6 1.8-3.6 0 0zM12 14.2c-1.8 3.6 1.8 3.6 0 0zM9.8 12c-3.6-1.8-3.6 1.8 0 0zM14.2 12c3.6-1.8 3.6 1.8 0 0z" stroke-linejoin="round"/><circle cx="12" cy="6.3" r="2.6"/><circle cx="12" cy="17.7" r="2.6"/><circle cx="6.3" cy="12" r="2.6"/><circle cx="17.7" cy="12" r="2.6"/>',
  'triangle-cl': '<path d="M12 3.5L21 20H3z"/><text x="12" y="17.5" font-size="6.5" text-anchor="middle" stroke="none" fill="currentColor" font-weight="700">CL</text>',
  bleach: '<path d="M12 3.5L21 20H3z"/>',
  prewash: '<path d="M3 8l2 11h14l2-11"/><text x="12" y="16" font-size="7" text-anchor="middle" stroke="none" fill="currentColor" font-weight="700">I</text>',
  rinse: '<path d="M3 8l2 11h14l2-11"/><path d="M8 4v3M12 3v4M16 4v3"/>',
  softener: '<circle cx="12" cy="12" r="2.2"/><circle cx="12" cy="6.3" r="2.6"/><circle cx="12" cy="17.7" r="2.6"/><circle cx="6.3" cy="12" r="2.6"/><circle cx="17.7" cy="12" r="2.6"/>',
  eco: '<path d="M5 19c0-8 5-13 14-14-1 9-6 14-14 14z"/><path d="M5 19l7-7"/>',
  intensive: '<path d="M3 8l2 11h14l2-11"/><path d="M8 13h8M12 9v8"/>',
  'extra-rinse': '<path d="M3 8l2 11h14l2-11"/><path d="M8 13h8M12 9v8"/>',
  door: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4.5"/>',
  wool: '<circle cx="12" cy="12" r="7.5"/><path d="M6 9c4 0 8 2 11 7M5 13c3 0 6 2 8 6M9 5c2 2 5 3 9 3"/>',
  delicate: '<path d="M7 20v-7l-2-3 1-1 3 3V5a1.2 1.2 0 0 1 2.4 0v6V4a1.2 1.2 0 0 1 2.4 0v7V5a1.2 1.2 0 0 1 2.4 0v7-4a1.2 1.2 0 0 1 2.4 0v6c0 4-2 6-5 6z"/>',
  drain: '<path d="M12 4v13M6 12l6 6 6-6"/><path d="M4 21h16"/>',
  start: '<path d="M8 5l11 7-11 7z"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3 2"/>',
  alert: '<path d="M12 3.5L21.5 20h-19z"/><path d="M12 10v4.5M12 17.2v.1"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.1"/>',
  check: '<path d="M4.5 12.5l5 5 10-11"/>'
};

export function icon(name, cls = 'wp-i') {
  const body = ICONS[name];
  if (!body) return '';
  return `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`;
}

function iconInSvg(name, x, y, size, color) {
  const body = ICONS[name];
  if (!body) return '';
  const k = size / 24;
  return `<g transform="translate(${x - size / 2} ${y - size / 2}) scale(${k})" fill="none" stroke="${color}" stroke-width="${1.8 / Math.max(k, .6)}" stroke-linecap="round" stroke-linejoin="round" color="${color}">${body}</g>`;
}

// ---------- colour helpers ----------
function hex(c) { const n = c.replace('#', ''); return [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16)); }
function toHex(rgb) { return '#' + rgb.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join(''); }
export function shade(c, f) { return toHex(hex(c).map((v) => (f < 0 ? v * (1 + f) : v + (255 - v) * f))); }

// ---------- panel ----------
const SIZE = { knob: 230, program: 290, button: 70, lamp: 40, slider: 220 };
const H = 300;

function wrapLabel(text, max = 10) {
  const lines = [];
  for (const w of String(text).split(/\s+/)) {
    const last = lines[lines.length - 1];
    if (last && (last + ' ' + w).length <= max) lines[lines.length - 1] = last + ' ' + w;
    else lines.push(w);
  }
  return lines.slice(0, 3);
}

function ctrlWidth(c) {
  if (c.type === 'knob') return c.role === 'program' ? SIZE.program : SIZE.knob;
  if (c.type === 'button' && (c.label || '').length > 5) return 92;
  return SIZE[c.type] || 60;
}

export function knobValue(state, c) {
  if (c.role === 'program') return state.prog;
  if (c.role === 'temperature') return state.temp;
  if (c.role === 'spin') return state.spin;
  return null;
}

// layout: 'machine' = real left-to-right order; 'compact' = buttons on top, knobs stacked (phones).
// uid prefixes the gradient ids, so two drawings on one page do not share them.
export function panelSVG(m, state, { layout = 'machine', uid = 'p', interactive = true, mini = false } = {}) {
  const face = m.panel.face || '#e9e4da';
  const ink = m.panel.ink || '#2b2b2b';
  const byId = Object.fromEntries(m.panel.controls.map((c) => [c.id, c]));
  const order = (m.panel.rows || [m.panel.controls.map((c) => c.id)]).flat().map((id) => byId[id]).filter(Boolean);
  for (const c of m.panel.controls) if (!order.includes(c)) order.push(c);

  let rows;
  if (layout === 'compact') {
    const small = order.filter((c) => c.type !== 'knob' && c.type !== 'slider');
    const knobs = order.filter((c) => (c.type === 'knob' || c.type === 'slider') && c.role !== 'program');
    const prog = order.filter((c) => (c.type === 'knob' || c.type === 'slider') && c.role === 'program');
    rows = [];
    if (small.length) rows.push(small);
    for (let i = 0; i < knobs.length; i += 2) rows.push(knobs.slice(i, i + 2));
    if (prog.length) rows.push(prog);
  } else {
    rows = [order];
  }

  const pad = 18;
  const rowH = (r) => (r.some((c) => c.type === 'knob' || c.type === 'slider') ? H : 150);
  const widths = rows.map((r) => r.reduce((a, c) => a + ctrlWidth(c), 0) + pad * 2);
  const W = Math.max(...widths);
  const totalH = rows.reduce((a, r) => a + rowH(r), 0) + pad * 2;

  let body = '';
  let y = pad;
  rows.forEach((r, ri) => {
    const rw = widths[ri] - pad * 2;
    let x = (W - rw) / 2;
    const h = rowH(r);
    for (const c of r) {
      const w = ctrlWidth(c);
      body += drawControl(m, c, state, { x, y, w, h, ink, face, uid, interactive, mini });
      x += w;
    }
    y += h;
  });

  const grad = `${uid}-face`;
  const role = interactive ? ` role="group" aria-label="${esc(L(m).panelLabel(`${m.brand} ${m.model}`))}"` : ' aria-hidden="true"';
  return `<svg class="panel-svg${mini ? ' mini' : ''}" viewBox="0 0 ${W} ${totalH}" xmlns="http://www.w3.org/2000/svg"${role} data-layout="${layout}">
  <defs>
    <linearGradient id="${grad}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${shade(face, .35)}"/><stop offset=".55" stop-color="${face}"/><stop offset="1" stop-color="${shade(face, -.12)}"/>
    </linearGradient>
    <radialGradient id="${uid}-knob" cx=".35" cy=".3" r=".8">
      <stop offset="0" stop-color="${shade(face, .6)}"/><stop offset=".65" stop-color="${face}"/><stop offset="1" stop-color="${shade(face, -.2)}"/>
    </radialGradient>
    <linearGradient id="${uid}-bar" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${shade(face, -.08)}"/><stop offset=".5" stop-color="${shade(face, .55)}"/><stop offset="1" stop-color="${shade(face, -.12)}"/>
    </linearGradient>
    <linearGradient id="${uid}-btn" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${shade(face, .55)}"/><stop offset=".6" stop-color="${face}"/><stop offset="1" stop-color="${shade(face, -.15)}"/>
    </linearGradient>
  </defs>
  <rect x="2" y="2" width="${W - 4}" height="${totalH - 4}" rx="22" fill="url(#${grad})" stroke="${shade(face, -.25)}" stroke-width="3"/>
  ${body}
</svg>`;
}

function polar(cx, cy, r, deg) {
  const a = (deg - 90) * Math.PI / 180;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
}

function arcPath(cx, cy, r, a0, a1) {
  const [x0, y0] = polar(cx, cy, r, a0);
  const [x1, y1] = polar(cx, cy, r, a1);
  const large = ((a1 - a0 + 360) % 360) > 180 ? 1 : 0;
  return `M${x0.toFixed(1)} ${y0.toFixed(1)} A${r} ${r} 0 ${large} 1 ${x1.toFixed(1)} ${y1.toFixed(1)}`;
}

function drawControl(m, c, state, o) {
  if (c.type === 'knob') return drawKnob(m, c, state, o);
  if (c.type === 'button') return drawButton(c, state, o);
  if (c.type === 'lamp') return drawLamp(c, state, o);
  if (c.type === 'slider') return drawSlider(c, state, o);
  return '';
}

function drawKnob(m, c, state, { x, y, w, h, ink, face, uid, interactive, mini }) {
  const cx = x + w / 2;
  const cy = y + h / 2 + 10;
  const isProg = c.role === 'program';
  const R = isProg ? 112 : 92; // label ring
  const body = isProg ? 60 : 52;
  const val = knobValue(state, c);
  const cur = E.position(c, val);
  const angle = cur ? cur.angle : 0;
  let s = `<g class="ctrl knob" data-ctrl="${esc(c.id)}" data-role="${esc(c.role)}">`;
  // caption
  const cap = c.label || '';
  s += `<text x="${cx}" y="${y + 18}" class="cap" text-anchor="middle" fill="${ink}">${esc(cap)}</text>`;
  // zones
  if (c.zones) {
    for (const z of c.zones) {
      const ps = c.positions.filter((p) => p.zone === z.id);
      if (!ps.length) continue;
      const a0 = Math.min(...ps.map((p) => p.angle)) - 6;
      const a1 = Math.max(...ps.map((p) => p.angle)) + 6;
      s += `<path d="${arcPath(cx, cy, R - 20, a0, a1)}" fill="none" stroke="${esc(z.color)}" stroke-width="4" stroke-linecap="round" opacity=".7"/>`;
    }
  }
  // ticks + labels; labels closer than ~11 degrees to the previous one move to an outer ring
  const outer = new Set();
  const sorted = [...c.positions].filter((p) => !p.stop).sort((a, b) => a.angle - b.angle);
  sorted.forEach((p, i) => {
    const prev = sorted[i - 1];
    if (prev && !outer.has(prev.value) && p.angle - prev.angle < (isProg ? 11 : 14)) outer.add(p.value);
  });
  for (const p of c.positions) {
    const [lx, ly] = polar(cx, cy, outer.has(p.value) ? R + 17 : (p.stop ? R - 2 : R), p.angle);
    const active = p.value === val;
    const hit = interactive ? ` data-val="${esc(p.value)}" role="button" tabindex="0" aria-label="${esc((c.label || c.role) + ': ' + (p.label))}"` : '';
    if (p.stop) {
      s += `<g class="pos stop${active ? ' on' : ''}"${hit}><circle cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" r="12" fill="transparent"/><circle cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" r="5" fill="#c81e1e"/></g>`;
      continue;
    }
    const text = p.symbol ? '' : esc(p.short || p.label);
    const fs = text.length > 3 ? 12 : 15;
    s += `<g class="pos${active ? ' on' : ''}"${hit}>`
      + `<circle class="hit" cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" r="15"/>`
      + (p.symbol ? iconInSvg(p.symbol, lx, ly, 18, ink)
        : `<text x="${lx.toFixed(1)}" y="${(ly + fs * .36).toFixed(1)}" text-anchor="middle" font-size="${fs}" fill="${ink}">${text}</text>`)
      + '</g>';
  }
  // knob body, rotated group
  s += `<circle cx="${cx}" cy="${cy}" r="${body + 3}" fill="${shade(face, -.3)}" opacity=".35"/>`;
  s += `<g class="rot" data-angle="${angle}" style="transform-origin:${cx}px ${cy}px;transform:rotate(${angle}deg)">`
    + `<circle cx="${cx}" cy="${cy}" r="${body}" fill="url(#${uid}-knob)" stroke="${shade(face, -.3)}" stroke-width="2"/>`
    + `<rect x="${cx - 11}" y="${cy - body + 4}" width="22" height="${body * 2 - 8}" rx="11" fill="url(#${uid}-bar)" stroke="${shade(face, -.3)}" stroke-width="1.5"/>`
    + `<rect x="${cx - 3.5}" y="${cy - body + 9}" width="7" height="22" rx="3.5" fill="${pointerColor(c)}"/>`
    + '</g>';
  if (c.rotation === 'cw-only' && !mini) {
    s += `<path d="${arcPath(cx, cy, body + 12, 300, 345)}" fill="none" stroke="${ink}" stroke-width="2" opacity=".55"/>`;
    s += `<path d="M${polar(cx, cy, body + 12, 345).map((v) => v.toFixed(1)).join(' ')} l-7 -5 m7 5 l-8 3" fill="none" stroke="${ink}" stroke-width="2" opacity=".55"/>`;
  }
  s += '</g>';
  return s;
}

function pointerColor(c) { return c.role === 'program' ? '#3f3f46' : '#57534e'; }

function drawButton(c, state, { x, y, w, h, ink, uid, interactive }) {
  const cx = x + w / 2;
  const cy = y + h / 2 + 18;
  const on = c.role === 'power' ? false : Boolean(state.options?.[c.id]);
  const hit = interactive && c.role === 'option' ? ` role="button" tabindex="0" aria-pressed="${on}" aria-label="${esc(c.label || c.symbol || c.id)}"` : '';
  let s = `<g class="ctrl btn${on ? ' on' : ''}${c.role === 'power' ? ' power' : ''}" data-ctrl="${esc(c.id)}"${hit}>`;
  const sy = cy - 76;
  if (c.symbol) s += iconInSvg(c.symbol, cx, sy, 24, ink);
  if (c.label) {
    const lines = c.label.length > 5 ? wrapLabel(c.label) : [c.label];
    const fs = lines.length > 1 || c.label.length > 5 ? 11.5 : 13;
    const y0 = sy + (c.symbol ? 26 : 10) - (lines.length - 1) * fs * .55;
    s += lines.map((l, i) => `<text x="${cx}" y="${(y0 + i * fs * 1.1).toFixed(1)}" text-anchor="middle" font-size="${fs}" font-weight="700" fill="${ink}">${esc(l)}</text>`).join('');
  }
  s += `<rect class="cap-shadow" x="${cx - 20}" y="${cy - 28}" width="40" height="64" rx="20" fill="#000" opacity=".12"/>`;
  s += `<rect class="face" x="${cx - 20}" y="${cy - 32}" width="40" height="64" rx="20" fill="url(#${uid}-btn)" stroke="${ink}" stroke-opacity=".35" stroke-width="2"/>`;
  s += '</g>';
  return s;
}

function drawLamp(c, state, { x, y, w, h }) {
  const cx = x + w / 2;
  const cy = y + h / 2 - 22;
  const color = { red: '#dc2626', green: '#16a34a', orange: '#ea580c', yellow: '#eab308' }[c.color] || '#dc2626';
  return `<g class="ctrl lamp" data-ctrl="${esc(c.id)}"><circle cx="${cx}" cy="${cy}" r="8" fill="${color}" stroke="#450a0a" stroke-width="1.5"/><circle cx="${cx - 2.5}" cy="${cy - 2.5}" r="2.4" fill="#fff" opacity=".6"/></g>`;
}

function drawSlider(c, state, { x, y, w, h, ink, interactive }) {
  const val = knobValue(state, c);
  const x0 = x + 20;
  const x1 = x + w - 20;
  const cy = y + h / 2;
  let s = `<g class="ctrl slider" data-ctrl="${esc(c.id)}" data-role="${esc(c.role)}"><text x="${x + w / 2}" y="${y + 18}" class="cap" text-anchor="middle" fill="${ink}">${esc(c.label || '')}</text>`;
  s += `<rect x="${x0}" y="${cy - 4}" width="${x1 - x0}" height="8" rx="4" fill="#000" opacity=".2"/>`;
  for (const p of c.positions) {
    const px = x0 + (x1 - x0) * (p.offset ?? 0);
    const active = p.value === val;
    const hit = interactive ? ` data-val="${esc(p.value)}" role="button" tabindex="0"` : '';
    s += `<g class="pos${active ? ' on' : ''}"${hit}><circle class="hit" cx="${px}" cy="${cy + 30}" r="14"/><text x="${px}" y="${cy + 35}" text-anchor="middle" font-size="13" fill="${ink}">${esc(p.label)}</text></g>`;
    if (active) s += `<rect x="${px - 9}" y="${cy - 16}" width="18" height="32" rx="5" fill="${ink}"/>`;
  }
  return s + '</g>';
}

// ---------- tray (HTML grid), washguide's as is ----------
const MARK_ICON = { flower: 'flower', 'triangle-cl': 'triangle-cl', asterisk: 'snowflake' };

export function trayHTML(m, used, notes = {}) {
  const t = m.tray;
  const tr = L(m);
  if (!t) return '';
  const cols = t.compartments.map((c) => `${c.width || 1}fr`).join(' ');
  const cells = t.compartments.map((c) => {
    const on = used.has(c.id);
    const note = notes[c.id];
    const mark = MARK_ICON[c.mark] ? icon(MARK_ICON[c.mark], 'ic mark') : `<span class="mark-txt">${esc(c.mark)}</span>`;
    return `<div class="slot${on ? ' on' : ''}" data-slot="${esc(c.id)}">
      <div class="slot-mark">${mark}</div>
      <div class="slot-name">${esc(c.label || tr.use[c.use] || '')}</div>
      <div class="slot-state">${on ? esc(note || tr.slotNeeded) : (note ? esc(note) : esc(tr.slotEmpty))}</div>
    </div>`;
  }).join('');
  return `<div class="tray" style="grid-template-columns:${cols}">${cells}</div>
  <div class="tray-front">${esc(tr.trayFront)}</div>`;
}

// ---------- result card (Show Me How chrome) ----------
const LEVEL_ICON = { error: 'alert', warn: 'alert', info: 'info' };

export function resultHTML(m, state, extra = []) {
  const t = E.timing(m, state);
  const cf = [...extra, ...E.conflicts(m, state)];
  const prog = E.program(m, state.prog);
  const pk = E.knob(m, 'program');
  const after = E.continueAfterWaterStop(m, state);
  const tr = L(m);
  const fm = (v) => E.formatMin(v, m);

  // consecutive sub-steps on the same dial position collapse into one chip
  const groups = [];
  for (const s of t.walked) {
    const g = groups[groups.length - 1];
    if (g && g.pos === s.pos) { if (!g.phases.includes(s.phase)) g.phases.push(s.phase); } else groups.push({ pos: s.pos, phases: [s.phase] });
  }
  const path = groups.length ? groups.map((g) => {
    const names = g.phases.map((ph) => E.phaseText(m, ph));
    return `<li class="ph-${esc(g.phases[g.phases.length - 1])}"><b>${esc(E.label(E.position(pk, g.pos)) || g.pos)}</b><span>${esc(names.length > 2 ? `${names[0]} ... ${names[names.length - 1]}` : names.join(', '))}</span></li>`;
  }).join('') + `<li class="end end-${esc(t.end)}"><b>${t.end === 'water-stop' ? icon('water-stop') : '<i class="wp-end-dot"></i>'}</b><span>${esc(tr.endChip[t.end === 'water-stop' ? 'water-stop' : 'stop'])}</span></li>` : '';

  const bars = Object.entries(t.phases).filter(([, v]) => v > 0).map(([k, v]) => `<span class="wp-bar ph-${k}" style="flex:${v}" title="${esc(E.phaseText(m, k))}: ${esc(fm(v))}"><span>${esc(E.phaseText(m, k))} ${v}</span></span>`).join('');

  const list = cf.length
    ? `<ul class="wp-conflicts">${cf.map((c) => `<li class="lvl-${esc(c.level)}">${icon(LEVEL_ICON[c.level] || 'info')}<span>${esc(c.message)}${c.sourcePage ? ` <small>${esc(tr.page)} ${esc(c.sourcePage)}</small>` : ''}</span></li>`).join('')}</ul>`
    : `<p class="wp-ok">${icon('check')}<span>${esc(tr.ok)}</span></p>`;

  let ending = esc(E.endText(m, t.end));
  if (after) ending += esc(after.viaButton ? tr.viaButton : tr.contAfter(after.spin || after.drain, after.drain && after.spin ? after.drain : null));

  const manual = t.manual ? `<span class="wp-manual">${esc(tr.manual(fm(t.manual.min), t.manual.atC))}</span>` : '';
  const progLine = prog ? `<p class="wp-prog"><b class="wp-prog-n">${esc(E.label(E.position(pk, state.prog)))}</b><span>${esc(prog.name)}${prog.loadKg ? esc(tr.upToKg(tr.num(prog.loadKg))) : ''}</span></p>` : '';

  return `${progLine}
<div class="wp-time">${icon('clock', 'wp-i wp-time-i')}<p><b data-total>${t.missingCycle ? '&ndash;' : '&asymp; ' + esc(fm(t.total))}</b>${t.estimate && !t.missingCycle ? `<em>${esc(tr.estimate)}</em>` : ''}</p>${manual}</div>
${t.missingCycle ? '' : `<div class="wp-bars" aria-hidden="true">${bars}</div>`}
${list}
<p class="wp-ending end-${esc(t.end)}">${ending}</p>
${path ? `<details class="wp-path-box"><summary>${esc(E.isElectronic(m) ? tr.pathStages : tr.pathKnob)}</summary><ol class="wp-path">${path}</ol></details>` : ''}`;
}

// ---------- chips: touch-friendly input mirroring the panel ----------
export function chipsHTML(m, state) {
  const tr = L(m);
  let s = '';
  for (const c of m.panel.controls) {
    if (c.type !== 'knob' && c.type !== 'slider') continue;
    const val = knobValue(state, c);
    const title = tr.roleTitle[c.role] || c.label;
    s += `<div class="wp-group" data-ctrl="${esc(c.id)}" role="group" aria-label="${esc(title)}"><p class="wp-group-t">${esc(title)}${c.label && c.label !== title ? ` <span>${esc(c.label)}</span>` : ''}</p><div class="wp-chips">`;
    const counts = {};
    for (const p of c.positions) if (!p.stop) counts[p.label] = (counts[p.label] || 0) + 1;
    for (const p of c.positions) {
      if (p.stop || (p.timerOnly && p.value !== val)) continue;
      const zone = c.zones?.find((z) => z.id === p.zone);
      const zl = counts[p.label] > 1 && zone?.label;
      const extra = zl ? ` <small>${esc(zl.split(/[\s,(]/)[0])}</small>` : '';
      const zc = zone?.color ? ` style="--zc:${esc(zone.color)}"` : '';
      const inner = p.symbol ? `${icon(p.symbol)}<span class="sr-only">${esc(p.label)}</span>` : esc(p.label);
      s += `<button type="button" class="wp-chip${p.value === val ? ' on' : ''}${zone ? ' has-zone' : ''}" data-val="${esc(p.value)}"${zc} aria-pressed="${p.value === val}">${inner}${extra}</button>`;
    }
    s += '</div></div>';
  }
  const opts = E.optionButtons(m);
  if (opts.length) {
    s += `<div class="wp-group" role="group" aria-label="${esc(tr.buttons)}"><p class="wp-group-t">${esc(tr.buttons)}</p><div class="wp-chips">`;
    for (const b of opts) {
      const on = Boolean(state.options[b.id]);
      s += `<button type="button" class="wp-chip wp-opt${on ? ' on' : ''}" data-opt="${esc(b.id)}" aria-pressed="${on}">${b.symbol ? icon(b.symbol) : ''}<span>${esc(E.controlTitle(b, m))}</span></button>`;
    }
    s += '</div></div>';
  }
  return s;
}

// ---------- presets: everyday scenarios ----------
// The first few presets show as chips; the rest wait behind "more", so a phone sees one short row.
export const PRESETS_SHOWN = 4;

export function presetsHTML(m, active) {
  const list = m.presets || [];
  if (!list.length) return '';
  const chip = (p) => `<button type="button" class="wp-preset${p.id === active?.id ? ' on' : ''}" data-preset="${esc(p.id)}" aria-pressed="${p.id === active?.id}">${esc(p.title)}</button>`;
  const first = list.slice(0, PRESETS_SHOWN);
  const rest = list.slice(PRESETS_SHOWN);
  const open = rest.some((p) => p.id === active?.id) ? ' open' : '';
  return `<div class="wp-presets">${first.map(chip).join('')}</div>${rest.length ? `<details class="wp-more"${open}><summary>${esc(L(m).more(rest.length))}</summary><div class="wp-presets">${rest.map(chip).join('')}</div></details>` : ''}`;
}

export function presetNote(active) {
  return active?.note ? esc(active.note) : '';
}

// Same state as a preset: the preset chip stays lit while the knobs match it.
export function matchPreset(m, s) {
  return m.presets?.find((p) => {
    const ps = E.stateFromPreset(m, p);
    return ps.prog === s.prog && ps.temp === s.temp && ps.spin === s.spin
      && Object.keys(ps.options).every((k) => ps.options[k] === Boolean(s.options[k]));
  }) || null;
}
