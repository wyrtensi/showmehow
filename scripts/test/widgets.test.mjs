// Tests for the first widgets (docs/spec.md 11.6): wifi-qr, saddle-height, reminder.
// The QR fixtures in fixtures/qr-*.json are matrices produced by python-qrcode (regenerate with
// fixtures/qr-generate.py): error correction M, one byte-mode segment, the version python-qrcode
// picks and a forced mask. The Node test needs no Python.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { encode, toSvg, capacity, versionFor, penalty, penaltyParts, MAX_BYTES } from '../../src/widgets/wifi-qr/qr.js';
import { escapeWifi, wifiString } from '../../src/widgets/wifi-qr/client.js';
import { render as renderWifi } from '../../src/widgets/wifi-qr/render.js';
import { validate as validateWifi } from '../../src/widgets/wifi-qr/schema.js';
import { saddleHeight, parseInseam, formatCm, INSEAM_MIN, INSEAM_MAX, FACTOR } from '../../src/widgets/saddle-height/client.js';
import { render as renderSaddle } from '../../src/widgets/saddle-height/render.js';
import { validate as validateSaddle } from '../../src/widgets/saddle-height/schema.js';
import { buildIcs, foldLine, escapeText, parseDate, rrule, skipsShortMonths, utcStamp, localIsoDate } from '../../src/widgets/reminder/client.js';
import { render as renderReminder } from '../../src/widgets/reminder/render.js';
import { validate as validateReminder, EVERY } from '../../src/widgets/reminder/schema.js';

const fixtures = (name) => JSON.parse(readFileSync(join(import.meta.dirname, 'fixtures', name), 'utf8'));
const EMOJI = /\p{Extended_Pictographic}|\u{FE0F}/u;
const rowsOf = (qr) => qr.modules.map((row) => Array.from(row).join(''));

// ---- QR encoder ----------------------------------------------------------------------------

test('qr: capacity at level M matches the specification table for versions 1-10', () => {
  assert.deepEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(capacity), [14, 26, 42, 62, 84, 106, 122, 152, 180, 213]);
  assert.equal(MAX_BYTES, 213);
  assert.equal(versionFor(14), 1);
  assert.equal(versionFor(15), 2);
  assert.equal(versionFor(180), 9);
  assert.equal(versionFor(181), 10);
  assert.equal(versionFor(213), 10);
  assert.equal(versionFor(214), 0);
});

for (const file of ['qr-masks.json', 'qr-versions.json', 'qr-wifi.json']) {
  for (const entry of fixtures(file)) {
    test(`qr: matrix equals python-qrcode for "${entry.name}" (${file}, version ${entry.version})`, () => {
      assert.equal(versionFor(new TextEncoder().encode(entry.text).length), entry.version, 'smallest fitting version');
      for (const c of entry.cases) {
        const qr = encode(entry.text, { version: entry.version, mask: c.mask });
        assert.equal(qr.version, entry.version);
        assert.equal(qr.size, entry.version * 4 + 17);
        assert.deepEqual(rowsOf(qr), c.rows, `mask ${c.mask}`);
      }
    });
  }
}

test('qr: fixtures cover every version 1-10, all 8 masks, Cyrillic and the 16-bit length field', () => {
  const all = ['qr-masks.json', 'qr-versions.json', 'qr-wifi.json'].flatMap(fixtures);
  assert.deepEqual([...new Set(all.map((e) => e.version))].sort((a, b) => a - b), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  assert.deepEqual([...new Set(all.flatMap((e) => e.cases.map((c) => c.mask)))].sort(), [0, 1, 2, 3, 4, 5, 6, 7]);
  assert.ok(all.some((e) => /[Ѐ-ӿ]/.test(e.text)), 'a Cyrillic string');
  assert.ok(all.some((e) => e.version === 10));
  assert.ok(all.length >= 10);
});

test('qr: mask penalty equals python-qrcode lost_point on its matrices and the lowest penalty wins', () => {
  // Totals of python-qrcode's lost_point for masks 0..7 of the same two strings.
  const expected = { 'wifi ascii': [931, 1014, 660, 932, 835, 747, 782, 923], 'wifi cyrillic ssid': [820, 908, 817, 784, 1016, 854, 764, 816] };
  for (const entry of fixtures('qr-masks.json')) {
    const totals = entry.cases.map((c) => penalty(c.rows.map((row) => Array.from(row, Number))));
    assert.deepEqual(totals, expected[entry.name], entry.name);
    const auto = encode(entry.text);
    assert.equal(auto.mask, totals.indexOf(Math.min(...totals)), 'auto mask = first lowest penalty');
    assert.deepEqual(auto.penalties, totals);
    assert.equal(auto.penalties[auto.mask], penaltyParts(auto.modules).reduce((a, b) => a + b, 0));
  }
});

test('qr: encode rejects what does not fit and bad options', () => {
  assert.throws(() => encode('x'.repeat(214)), RangeError);
  assert.throws(() => encode('x'.repeat(20), { version: 1 }), RangeError);
  assert.throws(() => encode('x', { version: 11 }), RangeError);
  assert.throws(() => encode('x', { mask: 8 }), RangeError);
  assert.equal(encode('').version, 1);
  assert.equal(encode('x'.repeat(213)).version, 10);
  // Multi-byte characters count in UTF-8 bytes: 8 Cyrillic letters = 16 bytes = version 2.
  assert.equal(encode('Привет, м').version, 2);
});

test('qr: finder patterns, timing pattern and dark module are in place', () => {
  const qr = encode('HELLO', { mask: 0 });
  const rows = rowsOf(qr);
  for (const [x, y] of [[0, 0], [qr.size - 7, 0], [0, qr.size - 7]]) {
    assert.equal(rows[y].slice(x, x + 7), '1111111');
    assert.equal(rows[y + 1].slice(x, x + 7), '1000001');
    assert.equal(rows[y + 3].slice(x, x + 7), '1011101');
  }
  for (let i = 8; i < qr.size - 8; i += 1) assert.equal(rows[6][i], i % 2 === 0 ? '1' : '0');
  assert.equal(rows[qr.size - 8][8], '1');
});

test('qr: toSvg draws exactly the dark modules inside a 4-module quiet zone', () => {
  const qr = encode('WIFI:T:WPA;S:Home;P:secret123;;');
  const svg = toSvg(qr, { label: 'code "x"' });
  assert.match(svg, new RegExp(`viewBox="0 0 ${qr.size + 8} ${qr.size + 8}"`));
  assert.ok(svg.startsWith('<svg ') && svg.endsWith('</svg>'));
  assert.match(svg, /aria-label="code &#34;x&#34;"/);
  const drawn = Array.from({ length: qr.size }, () => new Array(qr.size).fill(0));
  const d = /<path d="([^"]+)"/.exec(svg)[1];
  for (const m of d.matchAll(/M(\d+) (\d+)h(\d+)v1h-\d+z/g)) {
    const [x, y, w] = [Number(m[1]) - 4, Number(m[2]) - 4, Number(m[3])];
    for (let i = 0; i < w; i += 1) drawn[y][x + i] = 1;
  }
  assert.deepEqual(drawn.map((r) => r.join('')), rowsOf(qr));
  assert.match(svg, /<rect [^>]*fill="#ffffff"/);
  assert.match(svg, /<path [^>]*fill="#000000"/);
});

// ---- WIFI: string --------------------------------------------------------------------------

test('wifi: escapes backslash, semicolon, comma, colon and double quote in SSID and password', () => {
  assert.equal(escapeWifi('plain'), 'plain');
  assert.equal(escapeWifi('a\\b'), 'a\\\\b');
  assert.equal(escapeWifi('a;b'), 'a\\;b');
  assert.equal(escapeWifi('a,b'), 'a\\,b');
  assert.equal(escapeWifi('a:b'), 'a\\:b');
  assert.equal(escapeWifi('a"b'), 'a\\"b');
  assert.equal(escapeWifi('\\;,:"'), '\\\\\\;\\,\\:\\"');
  assert.equal(escapeWifi('Дом Иванова'), 'Дом Иванова');
  assert.equal(wifiString({ ssid: 'a;b', password: 'p:"q', security: 'WPA' }), 'WIFI:T:WPA;S:a\\;b;P:p\\:\\"q;;');
});

test('wifi: string layout for WPA, WEP and an open network', () => {
  assert.equal(wifiString({ ssid: 'Home', password: 'secret123', security: 'WPA' }), 'WIFI:T:WPA;S:Home;P:secret123;;');
  assert.equal(wifiString({ ssid: 'Home', password: 'abcde', security: 'WEP' }), 'WIFI:T:WEP;S:Home;P:abcde;;');
  assert.equal(wifiString({ ssid: 'Cafe', password: 'ignored', security: 'nopass' }), 'WIFI:T:nopass;S:Cafe;;');
  assert.equal(wifiString({ ssid: 'Home', password: 'x' }), 'WIFI:T:WPA;S:Home;P:x;;');
  assert.equal(wifiString({ ssid: 'Home', password: 'x', security: 'bogus' }), 'WIFI:T:WPA;S:Home;P:x;;');
});

test('wifi: the longest allowed SSID and password always fit in a QR code', () => {
  const worst = wifiString({ ssid: '\\'.repeat(16) + 'я'.repeat(8), password: ';'.repeat(63), security: 'WPA' });
  const bytes = new TextEncoder().encode(worst).length;
  assert.ok(bytes <= MAX_BYTES, `${bytes} bytes`);
  assert.doesNotThrow(() => encode(worst));
});

// ---- saddle-height -------------------------------------------------------------------------

test('saddle: height is inseam x 0.883 rounded to 0.1 cm', () => {
  assert.equal(FACTOR, 0.883);
  assert.equal(saddleHeight(80), 70.6);
  assert.equal(saddleHeight(100), 88.3);
  assert.equal(saddleHeight(50), 44.2);
  assert.equal(saddleHeight(110), 97.1);
  assert.equal(saddleHeight(72.5), 64);
  assert.equal(saddleHeight(81), 71.5);
});

test('saddle: inseam input accepts 50-110 with dot or comma, rejects the rest', () => {
  assert.equal(INSEAM_MIN, 50);
  assert.equal(INSEAM_MAX, 110);
  assert.equal(parseInseam('50'), 50);
  assert.equal(parseInseam('110'), 110);
  assert.equal(parseInseam('80,5'), 80.5);
  assert.equal(parseInseam(' 80.5 '), 80.5);
  assert.equal(parseInseam('81 cm'), 81);
  assert.equal(parseInseam('81 см'), 81);
  for (const bad of ['', ' ', '49.9', '110.5', '111', '5', '1000', 'abc', '80..5', '8 0', '-80', '80e1', null, undefined]) {
    assert.equal(parseInseam(bad), null, JSON.stringify(bad));
  }
  assert.equal(formatCm(70.6, 'en'), '70.6');
  assert.equal(formatCm(70.6, 'ru'), '70,6');
});

// ---- reminder (.ics) -----------------------------------------------------------------------

const NOW = new Date(Date.UTC(2026, 9, 19, 9, 5, 7));
const ics = (extra = {}) => buildIcs({ title: 'Clean the filter', every: '3m', start: '2026-10-19', now: NOW, uid: 'test-uid@showmehow', ...extra });
const unfold = (text) => text.replace(/\r\n[ \t]/g, '');
const lines = (text) => unfold(text).split('\r\n').slice(0, -1);

test('ics: a complete all-day VEVENT with UID, DTSTAMP in UTC and CRLF line endings', () => {
  const text = ics();
  assert.ok(text.startsWith('BEGIN:VCALENDAR\r\n'));
  assert.ok(text.endsWith('END:VEVENT\r\nEND:VCALENDAR\r\n'));
  assert.ok(!/(?<!\r)\n/.test(text), 'no bare LF');
  assert.ok(!/\r(?!\n)/.test(text), 'no bare CR');
  assert.deepEqual(lines(text), [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Show Me How//Reminder//EN', 'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT', 'UID:test-uid@showmehow', 'DTSTAMP:20261019T090507Z',
    'DTSTART;VALUE=DATE:20261019', 'DTEND;VALUE=DATE:20261020', 'RRULE:FREQ=MONTHLY;INTERVAL=3',
    'SUMMARY:Clean the filter', 'TRANSP:TRANSPARENT', 'END:VEVENT', 'END:VCALENDAR'
  ]);
});

test('ics: RRULE for every supported interval', () => {
  const expected = {
    '2w': 'FREQ=WEEKLY;INTERVAL=2',
    '1m': 'FREQ=MONTHLY;INTERVAL=1',
    '3m': 'FREQ=MONTHLY;INTERVAL=3',
    '6m': 'FREQ=MONTHLY;INTERVAL=6',
    '1y': 'FREQ=YEARLY;INTERVAL=1'
  };
  assert.deepEqual(Object.keys(expected), EVERY);
  for (const [every, rule] of Object.entries(expected)) {
    assert.equal(rrule(every), rule);
    assert.ok(lines(ics({ every })).includes(`RRULE:${rule}`), every);
  }
  assert.equal(rrule('5d'), null);
  assert.throws(() => ics({ every: '5d' }), RangeError);
});

test('ics: the all-day end date is the next day, across month and year borders', () => {
  assert.ok(lines(ics({ start: '2026-12-31' })).includes('DTEND;VALUE=DATE:20270101'));
  assert.ok(lines(ics({ start: '2026-02-28' })).includes('DTEND;VALUE=DATE:20260301'));
  assert.ok(lines(ics({ start: '2028-02-28' })).includes('DTEND;VALUE=DATE:20280229'));
  assert.ok(lines(ics({ start: '2026-01-05' })).includes('DTSTART;VALUE=DATE:20260105'));
  for (const bad of ['', '2026-13-01', '2026-02-30', '19.10.2026', '2026-1-1', null]) assert.throws(() => ics({ start: bad }), RangeError, String(bad));
  assert.deepEqual(parseDate('2026-10-19'), { y: 2026, m: 10, d: 19 });
  assert.equal(parseDate('2026-02-29'), null);
});

test('ics: DTSTAMP is UTC with a Z suffix and defaults to the current time', () => {
  assert.equal(utcStamp(new Date(Date.UTC(2026, 0, 2, 3, 4, 5))), '20260102T030405Z');
  const real = buildIcs({ title: 't', every: '1m', start: '2026-10-19' });
  assert.match(real, /\r\nDTSTAMP:\d{8}T\d{6}Z\r\n/);
  assert.match(real, /\r\nUID:[^\r\n]+@showmehow\r\n/);
  const other = buildIcs({ title: 't', every: '1m', start: '2026-10-19' });
  assert.notEqual(/UID:(\S+)/.exec(real)[1], /UID:(\S+)/.exec(other)[1], 'unique UID per file');
});

test('ics: text values are escaped (backslash, semicolon, comma, newline)', () => {
  assert.equal(escapeText('a;b,c\\d\ne'), 'a\\;b\\,c\\\\d\\ne');
  assert.equal(escapeText('line1\r\nline2'), 'line1\\nline2');
  const text = ics({ title: 'Filter; wash, dry\\rinse', description: 'First line\nSecond line' });
  assert.ok(lines(text).includes('SUMMARY:Filter\\; wash\\, dry\\\\rinse'));
  assert.ok(lines(text).includes('DESCRIPTION:First line\\nSecond line'));
});

test('ics: lines fold at 75 octets without splitting UTF-8 and unfold to the original', () => {
  const title = 'Промыть фильтр пылесоса и проверить щётку, затем протереть датчики и контейнер для пыли целиком';
  const text = ics({ title, description: 'Инструкция: Как почистить робот-пылесос\nhttps://example.org/' + 'a'.repeat(120), url: 'https://example.org/' + 'b'.repeat(100) });
  const decoder = new TextDecoder('utf-8', { fatal: true });
  let folded = 0;
  for (const physical of text.split('\r\n').slice(0, -1)) {
    const bytes = new TextEncoder().encode(physical);
    assert.ok(bytes.length <= 75, `${bytes.length} octets: ${physical}`);
    assert.doesNotThrow(() => decoder.decode(bytes));
    if (physical.startsWith(' ')) folded += 1;
  }
  assert.ok(folded >= 4, 'long lines were folded');
  assert.ok(lines(text).includes(`SUMMARY:${escapeText(title)}`), 'the comma in the title is escaped');
  assert.ok(lines(text).some((l) => l.startsWith('URL:https://example.org/bbb')));
  // foldLine on its own
  assert.equal(foldLine('x'.repeat(75)), 'x'.repeat(75));
  assert.equal(foldLine('x'.repeat(76)), `${'x'.repeat(75)}\r\n x`);
  assert.equal(foldLine('я'.repeat(38)), `${'я'.repeat(37)}\r\n ${'я'}`, '37 two-byte letters = 74 octets');
  assert.equal(unfold(foldLine('ab'.repeat(100))), 'ab'.repeat(100));
});

test('ics: a URL property only for http(s) links', () => {
  assert.ok(lines(ics({ url: 'https://example.org/guide/' })).includes('URL:https://example.org/guide/'));
  assert.ok(!lines(ics({ url: 'javascript:alert(1)' })).some((l) => l.startsWith('URL:')));
  assert.ok(!lines(ics()).some((l) => l.startsWith('URL:')));
});

test('ics: monthly rules that would skip short months are flagged', () => {
  assert.equal(skipsShortMonths('3m', '2026-10-31'), true);
  assert.equal(skipsShortMonths('1m', '2026-10-29'), true);
  assert.equal(skipsShortMonths('1m', '2026-10-28'), false);
  assert.equal(skipsShortMonths('2w', '2026-10-31'), false);
  assert.equal(skipsShortMonths('1y', '2028-02-29'), true);
  assert.equal(skipsShortMonths('1y', '2026-10-31'), false);
  assert.equal(skipsShortMonths('1m', ''), false);
  assert.equal(localIsoDate(new Date(2026, 9, 5)), '2026-10-05');
});

// ---- validate() ----------------------------------------------------------------------------

test('validate: wifi-qr accepts nothing or a known security, rejects the rest', () => {
  assert.deepEqual(validateWifi({}), []);
  assert.deepEqual(validateWifi(undefined), []);
  for (const security of ['WPA', 'WEP', 'nopass']) assert.deepEqual(validateWifi({ security }), []);
  assert.equal(validateWifi({ security: 'wpa' }).length, 1);
  assert.equal(validateWifi({ security: 3 }).length, 1);
  assert.match(validateWifi({ ssid: 'x' })[0], /unknown parameter "ssid"/);
});

test('validate: saddle-height takes no parameters', () => {
  assert.deepEqual(validateSaddle({}), []);
  assert.deepEqual(validateSaddle(null), []);
  assert.match(validateSaddle({ inseam: 80 })[0], /unknown parameter "inseam"/);
});

test('validate: reminder needs a known every and a non-empty title', () => {
  for (const every of EVERY) assert.deepEqual(validateReminder({ every, title: 'Clean the filter' }), []);
  assert.match(validateReminder({ title: 'x' }).join(), /every is required/);
  assert.match(validateReminder({ every: '5d', title: 'x' }).join(), /every must be one of/);
  assert.match(validateReminder({ every: '3m' }).join(), /title is required/);
  assert.match(validateReminder({ every: '3m', title: '   ' }).join(), /non-empty/);
  assert.match(validateReminder({ every: '3m', title: 42 }).join(), /non-empty/);
  assert.match(validateReminder({ every: '3m', title: 'x'.repeat(101) }).join(), /at most 100/);
  assert.match(validateReminder({ every: '3m', title: 'x', color: 'red' }).join(), /unknown parameter "color"/);
  assert.equal(validateReminder({}).length, 2);
  assert.equal(validateReminder(undefined).length, 2);
});

// ---- render() ------------------------------------------------------------------------------

const CTX = (lang) => ({ lang, guide: { title: 'How to clean the "filter" <b>', slug: 's' }, t: (k) => k, href: (p) => `/${p}` });
const outputs = () => {
  const out = [];
  for (const lang of ['ru', 'en']) {
    out.push([`wifi-qr ${lang}`, renderWifi({ security: 'WEP' }, CTX(lang))]);
    out.push([`saddle-height ${lang}`, renderSaddle({}, CTX(lang))]);
    for (const every of EVERY) out.push([`reminder ${every} ${lang}`, renderReminder({ every, title: 'Промыть фильтр' }, CTX(lang))]);
  }
  return out;
};

test('render: output is non-empty HTML with no emoji, in Russian and English', () => {
  for (const [name, html] of outputs()) {
    assert.ok(html.length > 300, name);
    assert.ok(!EMOJI.test(html), `${name}: emoji`);
    assert.ok(html.startsWith('<div class="wgt '), name);
    assert.ok(!/<script|javascript:|\son\w+=/i.test(html), `${name}: script or handler`);
  }
  assert.match(renderWifi({}, CTX('ru')), /Название сети/);
  assert.match(renderWifi({}, CTX('en')), /Network name/);
  assert.match(renderWifi({}, {}), /Название сети/, 'defaults to Russian');
});

test('render: params and guide data are escaped', () => {
  const evil = '<script>alert(1)</script> "quoted" & \'single\'';
  const html = renderReminder({ every: '3m', title: evil }, CTX('en'));
  assert.ok(!html.includes('<script'));
  assert.ok(!html.includes(evil));
  assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
  assert.match(html, /data-title="&lt;script&gt;alert\(1\)&lt;\/script&gt; &quot;quoted&quot; &amp; &#39;single&#39;"/);
  assert.match(html, /data-guide="How to clean the &quot;filter&quot; &lt;b&gt;"/);
  // Unknown values never reach the markup unescaped.
  const wifi = renderWifi({ security: '"><script>x</script>' }, CTX('en'));
  assert.ok(!wifi.includes('<script'));
  assert.match(wifi, /<option value="WPA" selected>/, 'unknown security falls back to WPA');
  const rem = renderReminder({ every: '"><img src=x>', title: 'ok' }, CTX('en'));
  assert.ok(!rem.includes('<img'));
  assert.match(rem, /data-every="3m"/, 'unknown every falls back');
});

test('render: wifi-qr presets security, has labelled fields, a print button and a no-JS explanation', () => {
  const html = renderWifi({ security: 'nopass' }, CTX('en'));
  assert.match(html, /<option value="nopass" selected>No password<\/option>/);
  assert.match(html, /<label for="(wgt-wifi-\d+)-ssid">Network name<\/label><input id="\1-ssid"/);
  assert.match(html, /<label for="(wgt-wifi-\d+)-pass">Password<\/label>/);
  assert.match(html, /data-toggle aria-pressed="false" data-show="Show" data-hide="Hide">Show<\/button>/);
  assert.match(html, /<button type="button" class="btn btn-primary btn-lg wgt-main" data-print disabled>Print card<\/button>/);
  assert.match(html, /<form class="wgt-form" data-js /);
  assert.match(html, /class="wgt-nojs"/);
  assert.match(html, /WIFI:T:WPA;S:&lt;name&gt;;P:&lt;password&gt;;;/);
  assert.match(html, /autocomplete="off"/);
  assert.equal((html.match(/<input /g) || []).length, 2);
  assert.match(renderWifi({}, CTX('en')), /<option value="WPA" selected>/);
});

test('render: saddle-height is useful without JavaScript and mentions the heel check', () => {
  const en = renderSaddle({}, CTX('en'));
  assert.match(en, /Formula: inseam × 0\.883\./);
  assert.match(en, /starting point/);
  assert.match(en, /Heel check/);
  assert.match(en, /<svg class="wgt-art"[^>]*role="img"/);
  assert.match(en, /<td>80<\/td><td>70\.6<\/td>/);
  assert.match(en, /From 50 to 110/);
  assert.match(en, /inputmode="decimal"/);
  const ru = renderSaddle({}, CTX('ru'));
  assert.match(ru, /Формула: длина ноги × 0\.883\./);
  assert.match(ru, /Проверка пяткой/);
  assert.match(ru, /<td>80<\/td><td>70,6<\/td>/);
});

test('render: reminder states the schedule in words and offers the download', () => {
  const expected = { '2w': 'every 2 weeks', '1m': 'every month', '3m': 'every 3 months', '6m': 'every 6 months', '1y': 'every year' };
  for (const [every, words] of Object.entries(expected)) {
    const html = renderReminder({ every, title: 'Descale the kettle' }, CTX('en'));
    assert.match(html, new RegExp(`<span class="wgt-chip">${words}</span>`));
    assert.match(html, new RegExp(`add a repeating event to your calendar by hand: &quot;Descale the kettle&quot;, ${words}\\.`));
    assert.match(html, new RegExp(`data-every="${every}"`));
  }
  const ru = renderReminder({ every: '6m', title: 'Промыть фильтр' }, CTX('ru'));
  assert.match(ru, /каждые 6 месяцев/);
  assert.match(ru, /Скачать напоминание \(\.ics\)/);
  assert.match(ru, /<input id="wgt-rem-start" name="start" type="date" required data-start>/);
  assert.match(ru, /<button type="submit" class="btn btn-primary btn-lg wgt-main">/);
});
