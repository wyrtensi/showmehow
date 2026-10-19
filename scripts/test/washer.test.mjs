// washer-panel widget: the washguide engine assertions (scripts/test-engine.mjs there) on the
// Indesit WGS 834 TXR data, a sweep over every programme and preset of every machine
// (scripts/sweep.mjs there), plus the widget's schema, server HTML and URL state.
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import * as E from '../../src/widgets/washer-panel/engine.js';
import * as R from '../../src/widgets/washer-panel/panel.js';
import { localize } from '../../src/widgets/washer-panel/strings.js';
import { render, meta, DATA_DIR } from '../../src/widgets/washer-panel/render.js';
import { validate } from '../../src/widgets/washer-panel/schema.js';
import { stateFromQuery, queryFromState } from '../../src/widgets/washer-panel/client.js';

const readMachine = (id) => JSON.parse(readFileSync(join(DATA_DIR, `${id}.json`), 'utf8'));
const m = readMachine('indesit-wgs-834-txr');
const st = (prog, temp, spin, options = {}) => ({ prog, temp, spin, options: { half: false, waterstop: false, ...options } });
const EMOJI = /[\p{Extended_Pictographic}\u{FE0F}]/u;

// ---- engine (ported assertions) -------------------------------------------------------------

test('washer engine: start on 4 walks 4..7 and stops by itself', () => {
  const r = E.timing(m, st('4', '40', '600'));
  assert.deepEqual(r.path, ['4', '5', '6', '7']);
  assert.equal(r.end, 'stop');
});

test('washer engine: start on 2 is longer than start on 4 at the same temperature', () => {
  const a = E.timing(m, st('2', '40', '600')).total;
  const b = E.timing(m, st('4', '40', '600')).total;
  assert.ok(a - b >= 30, `${a} vs ${b}`);
});

test('washer engine: higher temperature adds heating time', () => {
  const a = E.timing(m, st('2', 'MAX', '600'));
  const b = E.timing(m, st('2', '40', '600'));
  assert.ok(a.phases.heat > b.phases.heat);
  // 12 l from 15 to 40 at 1.8 kW is about 11.6 min
  assert.equal(b.phases.heat, 12);
});

test('washer engine: half load reduces heating time', () => {
  const a = E.timing(m, st('4', '40', '600', { half: true })).phases.heat;
  const b = E.timing(m, st('4', '40', '600')).phases.heat;
  assert.ok(a < b);
});

test('washer engine: cold wash has no heating', () => {
  assert.equal(E.timing(m, st('4', '0', '600')).phases.heat, 0);
});

test('washer engine: synthetics stop with water and suggest 12 to continue', () => {
  const s = st('9', '40', '600');
  assert.equal(E.timing(m, s).end, 'water-stop');
  assert.equal(E.continueAfterWaterStop(m, s).spin, '12');
});

test('washer engine: water-stop button holds before spin on cotton', () => {
  const r = E.timing(m, st('4', '40', '600', { waterstop: true }));
  assert.equal(r.end, 'water-stop');
  assert.ok(!r.path.includes('7'));
});

test('washer engine: no spin uses the short drain time', () => {
  assert.equal(E.timing(m, st('7', '0', '0')).total, 3);
  assert.equal(E.timing(m, st('7', '0', '600')).total, 7);
});

test('washer engine: wool at 90 is an error', () => {
  const c = E.conflicts(m, st('14', 'MAX', '400'));
  assert.ok(c.some((x) => x.level === 'error' && /40/.test(x.message)));
});

test('washer engine: spin above programme limit warns', () => {
  const c = E.conflicts(m, st('9', '40', '800'));
  assert.ok(c.some((x) => x.level === 'warn' && /600/.test(x.message)));
});

test('washer engine: half load on wool warns', () => {
  const c = E.conflicts(m, st('14', '30', '400', { half: true }));
  assert.ok(c.some((x) => x.level === 'warn' && /1\/2/.test(x.message)));
});

test('washer engine: stop position is an error', () => {
  const c = E.conflicts(m, st('stop-a', '40', '600'));
  assert.equal(c[0].level, 'error');
});

test('washer engine: temperature on rinse is info, not error', () => {
  const c = E.conflicts(m, st('5', '60', '600'));
  assert.ok(c.every((x) => x.level !== 'error'));
});

test('washer engine: dosing follows the walk', () => {
  assert.deepEqual([...E.dosing(m, st('1', '60', '600'))].sort(), ['1', '2', '4']);
  assert.deepEqual([...E.dosing(m, st('6', '0', '600'))], ['4']);
});

test('washer engine: programme defaults pick manual temperature and max spin', () => {
  const s = E.withProgramDefaults(m, st('14', 'MAX', '800'));
  assert.equal(s.temp, '30');
  assert.equal(s.spin, '400');
});

test('washer engine: search normalisation maps Cyrillic brand', () => {
  assert.ok(E.searchKeys('Индезит WGS-834').includes('indesitwgs834'));
});

test('washer engine: English messages come from the en strings', () => {
  const en = localize(m, 'en');
  const c = E.conflicts(en, st('stop-a', '40', '600'));
  assert.match(c[0].message, /stop mark/);
  assert.equal(E.formatMin(75, en), '1 h 15 min');
  assert.equal(E.formatMin(75, localize(m, 'ru')), '1 ч 15 мин');
});

// ---- sweep over every machine ----------------------------------------------------------------

const machines = readdirSync(DATA_DIR).filter((f) => f.endsWith('.json')).sort().map((f) => readMachine(f.slice(0, -5)));

test('washer sweep: 21 machines, file name equals id', () => {
  assert.equal(machines.length, 21);
  for (const x of machines) assert.ok(readdirSync(DATA_DIR).includes(`${x.id}.json`), x.id);
});

test('washer sweep: every programme and preset of every machine runs clean', () => {
  const issues = [];
  let states = 0;
  for (const raw of machines) {
    for (const lang of ['ru', 'en']) {
      const mm = localize(raw, lang);
      const list = [
        ...mm.programs.map((p) => ['prog ' + p.pos, E.withProgramDefaults(mm, { prog: p.pos, temp: null, spin: null, options: {} })]),
        ...(mm.presets || []).map((p) => ['preset ' + p.id, E.stateFromPreset(mm, p)])
      ];
      for (const [name, s] of list) {
        states++;
        const where = `${mm.id} ${lang} ${name}`;
        try {
          const t = E.timing(mm, s);
          const c = E.conflicts(mm, s);
          for (const html of [R.resultHTML(mm, s), R.panelSVG(mm, s, { layout: 'compact' }), R.panelSVG(mm, s), R.chipsHTML(mm, s), R.trayHTML(mm, E.dosing(mm, s)), R.presetsHTML(mm, null)]) {
            if (EMOJI.test(html)) issues.push(`${where}: emoji in HTML`);
            if (/undefined|NaN/.test(html)) issues.push(`${where}: undefined or NaN in HTML`);
          }
          if (!Number.isFinite(t.total)) issues.push(`${where}: total ${t.total}`);
          if (t.missingCycle) issues.push(`${where}: no cycle steps`);
          else if (t.total === 0) issues.push(`${where}: 0 min`);
          if (name.startsWith('preset') && c.some((x) => x.level === 'error')) issues.push(`${where}: preset has error: ${c.find((x) => x.level === 'error').message}`);
          if (t.manual && !t.missingCycle && Math.abs(t.total - t.manual.min) / t.manual.min > 0.35) issues.push(`${where}: estimate ${t.total} vs manual ${t.manual.min}`);
        } catch (error) {
          issues.push(`${where}: throws ${error.message}`);
        }
      }
    }
  }
  assert.ok(states > 1000, `${states} states`);
  assert.deepEqual(issues, []);
});

test('washer sweep: every machine has a preset, a tray and an https or no source url', () => {
  for (const x of machines) {
    assert.ok(x.presets?.length, `${x.id}: presets`);
    assert.ok(x.tray?.compartments?.length, `${x.id}: tray`);
    assert.ok(E.knob(x, 'program'), `${x.id}: programme knob`);
    for (const s of x.sources || []) if (s.url) assert.match(s.url, /^https:\/\//, `${x.id}: ${s.url}`);
  }
});

// ---- widget: schema, server HTML, meta, URL state -------------------------------------------

test('washer widget: validate', () => {
  assert.deepEqual(validate({ machine: 'indesit-wgs-834-txr' }), []);
  assert.match(validate({}).join(), /machine is required/);
  assert.match(validate({ machine: 'Indesit WGS' }).join(), /kebab-case/);
  assert.match(validate({ machine: 'no-such-washer' }).join(), /no machine data/);
  assert.match(validate({ machine: 'indesit-wgs-834-txr', color: 'red' }).join(), /unknown parameter "color"/);
});

const CTX = (lang) => ({ lang, guide: { slug: 's' }, t: (k) => k, href: (p, l) => `/showmehow/${l === 'en' ? 'en/' : ''}${p}` });

test('washer widget: server HTML in both languages, no script, data link is language-neutral', () => {
  for (const raw of machines) {
    for (const lang of ['ru', 'en']) {
      const html = render({ machine: raw.id }, CTX(lang));
      assert.ok(html.startsWith('<div class="wgt wgt-washer"'), raw.id);
      assert.ok(!/<script|javascript:|\son\w+=/i.test(html), `${raw.id}: script or handler`);
      assert.ok(!EMOJI.test(html), `${raw.id}: emoji`);
      assert.match(html, new RegExp(`data-src="/showmehow/assets/washers/${raw.id}\\.json"`));
      assert.match(html, /<svg class="panel-svg"/);
      assert.match(html, /data-result/);
      if (raw.completeness === 'partial') assert.match(html, /wp-partial/, `${raw.id}: partial note`);
    }
  }
  assert.match(render({ machine: 'indesit-wgs-834-txr' }, CTX('ru')), /Что будет/);
  assert.match(render({ machine: 'indesit-wgs-834-txr' }, CTX('en')), /What happens/);
});

test('washer widget: meta gives a short name and the control type', () => {
  assert.deepEqual(meta({ machine: 'indesit-wgs-834-txr' }, 'ru').label, 'Indesit WGS 834 TXR');
  assert.equal(meta({ machine: 'indesit-wgs-834-txr' }, 'ru').facet.id, 'mechanical');
  assert.equal(meta({ machine: 'bosch-wfo-2051' }, 'en').facet.id, 'electronic');
  assert.equal(meta({ machine: 'bosch-wfo-2051' }, 'en').facet.name, 'Electronic control');
  assert.equal(meta({ machine: 'ardo-a-400-x' }).partial, true);
  assert.equal(meta({ machine: 'nope' }), null);
});

test('washer widget: URL state round trip keeps other query keys', () => {
  const ru = localize(m, 'ru');
  const s = st('9', '40', '600');
  const q = queryFromState(ru, s, null, '?v=old&p=1');
  const params = new URLSearchParams(q);
  assert.equal(params.get('v'), 'old');
  assert.equal(params.get('p'), '9');
  assert.deepEqual(stateFromQuery(ru, '?' + q).state, E.withProgramDefaults(ru, { prog: '9', temp: '40', spin: '600', options: { half: false, waterstop: false } }));
  const preset = ru.presets[1];
  const pq = queryFromState(ru, E.stateFromPreset(ru, preset), preset, '');
  assert.equal(pq, `preset=${preset.id}`);
  assert.equal(stateFromQuery(ru, '?' + pq).preset.id, preset.id);
  assert.equal(stateFromQuery(ru, '?p=nope'), null);
  assert.deepEqual(stateFromQuery(ru, '?p=4&o=half').state.options, { half: true, waterstop: false });
});
