import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { checkSvg, inlineSvg, standaloneSvg, MAX_SVG_BYTES } from '../../src/lib/svg.js';
import { ROOT, SAMPLE } from './fixtures/content.mjs';

const wrap = (inner, attrs = '') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 300"${attrs}>${inner}</svg>`;
const errorsOf = (src) => checkSvg(src).errors.map((e) => e.message).join('\n');

test('the sample illustration is clean and inlines with a label', async () => {
  const src = await readFile(join(ROOT, SAMPLE, 'step-3.svg'), 'utf8');
  const check = checkSvg(src);
  assert.deepEqual(check.errors, []);
  assert.deepEqual(check.warnings, []);
  const { svg, errors } = inlineSvg(src, { prefix: 'airpods-pair-android-s3', label: 'Кейс "AirPods" сзади' });
  assert.deepEqual(errors, []);
  assert.match(svg, /^<svg viewBox="0 0 480 300" role="img" aria-label="Кейс &quot;AirPods&quot; сзади" focusable="false">/);
  assert.ok(!svg.includes('<title'), 'the file title is dropped; the alt text labels the image');
  assert.ok(!svg.includes('xmlns'));
  assert.ok(svg.endsWith('</svg>'));
  assert.match(svg, /<circle class="f-accent anim-pulse" cx="240" cy="184" r="7"\/>/);
});

test('ids, href and url(#) references get the prefix', () => {
  const src = wrap('<defs><marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" orient="auto"><path d="M0 0L10 5L0 10z" class="f-hl"/></marker><g id="dot"><circle r="3"/></g></defs>' +
    '<path d="M10 10H100" marker-end="url(#arrow)" class="s-hl"/><use href="#dot" x="5"/><use xlink:href="#dot" x="9"/>', ' xmlns:xlink="http://www.w3.org/1999/xlink"');
  const { svg, errors } = inlineSvg(src, { prefix: 'slug-s2' });
  assert.deepEqual(errors, []);
  assert.match(svg, /<marker id="slug-s2-arrow"/);
  assert.match(svg, /marker-end="url\(#slug-s2-arrow\)"/);
  assert.equal((svg.match(/href="#slug-s2-dot"/g) || []).length, 2);
  assert.ok(!svg.includes('xlink:'));
  assert.match(svg, /aria-hidden="true"/);
});

test('rejects anything outside the allow-list', () => {
  const cases = [
    [wrap('<script>alert(1)</script>'), /<script> is not allowed/],
    [wrap('<foreignObject><div/></foreignObject>'), /<foreignObject> is not allowed/],
    [wrap('<image href="x.png"/>'), /<image> is not allowed/],
    [wrap('<text x="1">Hi</text>'), /<text> is not allowed/],
    [wrap('<rect onclick="x()"/>'), /event handler/],
    [wrap('<rect style="fill:red"/>'), /style attribute/],
    [wrap('<style>rect{}</style>'), /<style> is not allowed/],
    [wrap('<use href="https://evil.example/x.svg#a"/>'), /local #id/],
    [wrap('<rect fill="url(https://evil.example/#a)"/>'), /local ids/],
    [wrap('<rect filter="url(#f)"/>'), /attribute filter is not allowed/],
    [wrap('<a href="#x"><rect/></a>'), /<a> is not allowed/],
    ['<!DOCTYPE svg [<!ENTITY x "y">]>' + wrap(''), /DOCTYPE/],
    [wrap('<rect x=1/>'), /quoted/],
    [wrap('<g><rect/>'), /not closed|unexpected closing/],
    [wrap('<use href="#missing"/>'), /unknown id/],
    [wrap('<rect id="a"/><rect id="a"/>'), /duplicate id/],
    ['<g/>', /root element must be <svg>/],
    ['<svg><rect/></svg>', /viewBox/],
    [wrap('stray text'), /text content/]
  ];
  for (const [src, re] of cases) assert.match(errorsOf(src), re, src);
  assert.equal(inlineSvg(wrap('<script/>')).svg, '');
});

test('warns on hard-coded colours, root size and odd viewBox', () => {
  const r = checkSvg('<svg viewBox="0 0 100 100" width="100" height="100"><rect fill="#ff0000" stroke="red"/><rect fill="none" stroke="currentColor"/></svg>');
  assert.deepEqual(r.errors, []);
  const w = r.warnings.map((x) => x.message).join('\n');
  assert.match(w, /viewBox/);
  assert.match(w, /width\/height/);
  assert.match(w, /fill="#ff0000"/);
  assert.match(w, /stroke="red"/);
  assert.ok(!/currentColor|"none"/.test(w));
  assert.ok(!inlineSvg('<svg viewBox="0 0 300 300" width="10"><rect/></svg>').svg.includes('width'));
});

test('enforces the size limit and reports lines', () => {
  const big = wrap(`<path d="M0 0${' L1 1'.repeat(MAX_SVG_BYTES / 5)}"/>`);
  assert.match(errorsOf(big), /limit is 40 KB/);
  const r = checkSvg('<svg viewBox="0 0 480 300">\n  <rect/>\n  <script/>\n</svg>');
  assert.equal(r.errors[0].line, 3);
});

test('comments and the XML declaration are allowed and dropped', () => {
  const { svg, errors } = inlineSvg('<?xml version="1.0" encoding="UTF-8"?>\n<!-- drawn by hand -->\n' + wrap('<!-- c --><rect width="1" height="1"/>'));
  assert.deepEqual(errors, []);
  assert.ok(!svg.includes('<!--') && !svg.includes('<?xml'));
  assert.match(standaloneSvg(wrap('<title>A &amp; B</title><rect/>')), /<title>A &amp; B<\/title>/);
});
