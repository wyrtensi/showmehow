import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseFrontmatter, FrontmatterError } from '../../src/lib/frontmatter.js';
import { FIXTURE, SAMPLE } from './fixtures/content.mjs';

const fm = (body) => parseFrontmatter(`---\n${body}\n---\nbody`);
const fails = (body, line, re) => {
  assert.throws(() => fm(body), (e) => {
    assert.ok(e instanceof FrontmatterError, `expected FrontmatterError, got ${e}`);
    assert.equal(e.line, line, `line for ${JSON.stringify(body)}: ${e.message}`);
    if (re) assert.match(e.message, re);
    return true;
  });
};

test('parses the sample guide with line numbers', async () => {
  const text = await readFile(join(FIXTURE, SAMPLE, 'index.ru.md'), 'utf8');
  const r = parseFrontmatter(text);
  assert.equal(r.data.category, 'audio');
  assert.equal(r.data.time, 3);
  assert.deepEqual(r.data.brands, ['apple']);
  assert.equal(r.data.updated, '2026-10-19');
  assert.equal(r.data.sources[0].url, 'https://support.apple.com/ru-ru/111865');
  assert.equal(r.data.faq.length, 2);
  assert.equal(r.lines.title, 2);
  assert.equal(r.lines['sources.0.url'], 15);
  assert.equal(r.lines['faq.1.a'], 21);
  assert.equal(r.bodyLine, 25);
  assert.match(r.body, /^\nAirPods/);
});

test('CRLF and BOM input give the same result as LF', async () => {
  const text = await readFile(join(FIXTURE, SAMPLE, 'index.ru.md'), 'utf8');
  const lf = parseFrontmatter(text);
  const crlf = parseFrontmatter('﻿' + text.replace(/\n/g, '\r\n'));
  assert.deepEqual(crlf.data, lf.data);
  assert.deepEqual(crlf.lines, lf.lines);
  assert.equal(crlf.body, lf.body);
});

test('scalars: quotes, escapes, booleans, numbers, dates, comments', () => {
  const { data } = fm([
    'a: plain text # comment',
    'b: "a: b \\"q\\" \\\\ \\n end"',
    "c: 'it''s # not a comment'",
    'd: true',
    'e: false',
    'f: 42',
    'g: -3.5',
    'h: 2026-10-19',
    'i: 007',
    'j: C#',
    'k: "x" # trailing comment',
    '# a full-line comment',
    'l: https://example.com/a?b=c'
  ].join('\n'));
  assert.deepEqual(data, {
    a: 'plain text', b: 'a: b "q" \\ \n end', c: "it's # not a comment", d: true, e: false, f: 42, g: -3.5,
    h: '2026-10-19', i: '007', j: 'C#', k: 'x', l: 'https://example.com/a?b=c'
  });
});

test('inline lists, block lists, list of maps, block maps', () => {
  const { data, lines } = fm([
    'a: [one, "two, three", \'four\', 5, true]',
    'b: []',
    'c:',
    '  - first',
    '  - "second: quoted"',
    'parts:',
    '  - name: Шуруп 4x16',
    '    qty: 12',
    '    ref: "101345"',
    '  # comment inside a block',
    '  - name: Ключ',
    'widget:',
    '  type: demo',
    '  size: 3'
  ].join('\n'));
  assert.deepEqual(data.a, ['one', 'two, three', 'four', 5, true]);
  assert.deepEqual(data.b, []);
  assert.deepEqual(data.c, ['first', 'second: quoted']);
  assert.deepEqual(data.parts, [{ name: 'Шуруп 4x16', qty: 12, ref: '101345' }, { name: 'Ключ' }]);
  assert.deepEqual(data.widget, { type: 'demo', size: 3 });
  assert.equal(lines['parts.1'], 12);
  assert.equal(lines['parts.0.qty'], 9);
  assert.equal(lines['widget.size'], 15);
});

test('an empty block value is null', () => {
  assert.deepEqual(fm('faq:\ntitle: x').data, { faq: null, title: 'x' });
});

test('errors carry the file line number', () => {
  fails('title: ok\n\tbad: tab', 3, /tabs/);
  fails('title: ok\n  indented: x', 3, /indentation/);
  fails('title: a\ntitle: b', 3, /duplicate/);
  fails('title: "unclosed', 2, /unclosed/);
  fails('title: Совет: так нельзя', 2, /": "/);
  fails('title: {a: b}', 2, /unsupported/);
  fails('title: "bad \\t escape"', 2, /escape/);
  fails('Title: capital key', 2, /key: value/);
  fails('list: [a, [b]]', 2, /nested/);
  fails('list: [a, b', 2, /not closed/);
  fails('list:\n  - a\n   - b', 4, /indentation/);
  fails('parts:\n  - name: x\n      qty: 1', 4, /indentation/);
  fails('map:\n  key: value\n    deeper: x', 4, /indentation/);
  fails('title: "x" tail', 2, /after the quoted value/);
  fails('sources:\n  - title: x\n    url:', 4, /needs a value/);
});

test('the frontmatter must open and close with ---', () => {
  assert.throws(() => parseFrontmatter('title: x\n---\n'), (e) => e.line === 1 && /start with/.test(e.message));
  assert.throws(() => parseFrontmatter('---\ntitle: x\n'), (e) => e.line === 1 && /not closed/.test(e.message));
  const r = parseFrontmatter('---\r\ntitle: x\r\n---\r\nline one\r\nline two');
  assert.equal(r.body, 'line one\nline two');
  assert.equal(r.bodyLine, 4);
});
