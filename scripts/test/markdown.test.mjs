import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseFrontmatter } from '../../src/lib/frontmatter.js';
import { splitGuide, renderMarkdown, renderInline, plainText, countWords } from '../../src/lib/markdown.js';
import { ROOT, SAMPLE } from './fixtures/content.mjs';

const md = (src, opts) => renderMarkdown(src, opts);
const issuesOf = (src) => {
  const issues = [];
  renderMarkdown(src, { issues });
  return issues;
};

test('splits the sample guide into intro and steps', async () => {
  const text = await readFile(join(ROOT, SAMPLE, 'index.ru.md'), 'utf8');
  const fm = parseFrontmatter(text);
  const g = splitGuide(fm.body, { line: fm.bodyLine, labels: { tip: 'Совет', note: 'Заметка' } });
  assert.deepEqual(g.issues, []);
  assert.match(g.intro.html, /^<p>AirPods подключаются/);
  assert.equal(g.steps.length, 5);
  assert.equal(g.steps[0].title, 'Включите Bluetooth на телефоне');
  assert.equal(g.steps[0].line, 28);
  assert.deepEqual(g.steps[2].image, { src: 'step-3.svg', alt: 'Задняя сторона кейса AirPods, палец зажимает круглую кнопку, индикатор мигает белым', line: 38 });
  assert.ok(!g.steps[2].html.includes('step-3.svg'), 'the illustration is not part of the step HTML');
  assert.match(g.steps[2].html, /<div class="alert alert-tip"><p class="alert-title">Совет<\/p><p>У AirPods/);
  assert.match(g.steps[4].html, /alert-note"><p class="alert-title">Заметка/);
  assert.match(g.steps[0].md, /^Откройте \{\{Настройки > Bluetooth\}\}/);
});

test('CRLF bodies split the same way', () => {
  const body = '\r\nIntro.\r\n\r\n## Step one\r\n\r\nText\r\nmore.\r\n';
  const g = splitGuide(body);
  assert.equal(g.steps.length, 1);
  assert.equal(g.steps[0].html, '<p>Text more.</p>');
});

test('headings inside code fences are not steps; # headings are errors', () => {
  const g = splitGuide('# Title\n\n## One\n\n```\n## not a step\n# not h1\n```\n\n## Two\n\ntext', { line: 10 });
  assert.deepEqual(g.steps.map((s) => s.title), ['One', 'Two']);
  assert.equal(g.issues.length, 1);
  assert.equal(g.issues[0].level, 'error');
  assert.equal(g.issues[0].line, 10);
  assert.match(g.steps[0].html, /<pre><code>## not a step\n# not h1<\/code><\/pre>/);
});

test('images: one per step, not in the intro, not inside lists', () => {
  const g = splitGuide('![intro picture alt](a.svg)\n\n## Step\n\n![first image alt](b.svg)\n\n![second image alt](c.svg)\n\n- ![in a list](d.svg)');
  const messages = g.issues.map((i) => i.message).join('\n');
  assert.match(messages, /not to the introduction/);
  assert.match(messages, /at most one/);
  assert.equal(g.steps[0].image.src, 'b.svg');
  assert.ok(!g.steps[0].html.includes('<img'));
});

test('inline: emphasis, strong, code, kbd, UI path', () => {
  assert.equal(renderInline('*a* _b_ **c** `<d>` snake_case_word'), '<em>a</em> <em>b</em> <strong>c</strong> <code>&lt;d&gt;</code> snake_case_word');
  assert.equal(renderInline('<kbd>Ctrl</kbd> + <KBD>C</KBD>'), '<kbd>Ctrl</kbd> + <kbd>C</kbd>');
  assert.equal(renderInline('{{Настройки > Bluetooth > Добавить}}'),
    '<span class="ui-path"><span class="ui-seg">Настройки</span><span class="ui-sep"></span><span class="ui-seg">Bluetooth</span><span class="ui-sep"></span><span class="ui-seg">Добавить</span></span>');
  assert.equal(renderInline('{{Нажмите <kbd>OK</kbd> > Готово}}'),
    '<span class="ui-path"><span class="ui-seg">Нажмите <kbd>OK</kbd></span><span class="ui-sep"></span><span class="ui-seg">Готово</span></span>');
  assert.equal(renderInline('**bold with *em* inside**'), '<strong>bold with <em>em</em> inside</strong>');
  assert.equal(renderInline('2 * 3 * 4'), '2 * 3 * 4');
  assert.equal(renderInline('\\*not em\\*'), '*not em*');
});

test('links: https and #anchors only, external ones open in a new tab', () => {
  assert.equal(renderInline('[docs](https://example.com/a?b=1&c=2)'), '<a href="https://example.com/a?b=1&amp;c=2" rel="noopener" target="_blank">docs</a>');
  assert.equal(renderInline('[step](#step-2)'), '<a href="#step-2">step</a>');
  const issues = [];
  assert.equal(renderInline('[x](javascript:alert(1))', { issues }), '[x](javascript:alert(1))');
  assert.equal(issues[0].level, 'error');
  assert.equal(renderInline('[x](/relative)'), '[x](/relative)');
  assert.equal(renderInline('[a "quote"](https://e.com/"onmouseover=x)'), '[a &quot;quote&quot;](https://e.com/&quot;onmouseover=x)');
});

test('everything outside the subset is escaped', () => {
  assert.equal(renderInline('<script>alert(1)</script> <b onclick="x">b</b> &amp; \'q\''),
    '&lt;script&gt;alert(1)&lt;/script&gt; &lt;b onclick=&quot;x&quot;&gt;b&lt;/b&gt; &amp;amp; &#39;q&#39;');
  assert.equal(md('<div>raw</div>\n\n#### deep heading'), '<p>&lt;div&gt;raw&lt;/div&gt;</p>\n<p>#### deep heading</p>');
  assert.ok(issuesOf('<div>x</div>').some((i) => /HTML/.test(i.message)));
  assert.equal(md('![alt text](a.svg) inline'), '<p>![alt text](a.svg) inline</p>');
});

test('paragraphs join lines; sub-headings', () => {
  assert.equal(md('one\ntwo\n\nthree'), '<p>one two</p>\n<p>three</p>');
  assert.equal(md('### Sub *x*\ntext'), '<h3>Sub <em>x</em></h3>\n<p>text</p>');
});

test('lists: unordered, ordered with start, one nested level', () => {
  assert.equal(md('- a\n- b\n  - c\n  - d\n- e'), '<ul><li>a</li><li>b<ul><li>c</li><li>d</li></ul></li><li>e</li></ul>');
  assert.equal(md('* a\n  continued\n* b'), '<ul><li>a continued</li><li>b</li></ul>');
  assert.equal(md('3. c\n4. d'), '<ol start="3"><li>c</li><li>d</li></ol>');
  assert.equal(md('1. one\n   - nested\n2. two'), '<ol><li>one<ul><li>nested</li></ul></li><li>two</li></ol>');
  assert.equal(md('text\n- item'), '<p>text</p>\n<ul><li>item</li></ul>');
  const issues = [];
  md('- a\n  - b\n    - c', { issues });
  assert.ok(issues.some((i) => /one level/.test(i.message)));
});

test('alerts take their title from the labels map; plain quotes stay quotes', () => {
  assert.equal(md('> [!WARNING]\n> Hot **surface**.\n>\n> - one', { labels: { warning: 'Attention' } }),
    '<div class="alert alert-warning"><p class="alert-title">Attention</p><p>Hot <strong>surface</strong>.</p>\n<ul><li>one</li></ul></div>');
  assert.equal(md('> just a quote'), '<blockquote><p>just a quote</p></blockquote>');
  assert.match(md('> [!caution]\n> x'), /alert-caution/);
});

test('fenced code is literal and escaped', () => {
  assert.equal(md('```text\n<b>**x**</b> {{a > b}}\n```'), '<pre><code class="language-text">&lt;b&gt;**x**&lt;/b&gt; {{a &gt; b}}</code></pre>');
  assert.ok(issuesOf('```\nunclosed').some((i) => /not closed/.test(i.message)));
});

test('pipe tables with alignment and inline cells', () => {
  const html = md('| Индикатор | Значение |\n|---|:---:|\n| **белый** | готов `a|b` |\n| оранжевый \\| красный | заряд |');
  assert.equal(html, '<div class="table-wrap"><table><thead><tr><th>Индикатор</th><th class="align-center">Значение</th></tr></thead><tbody>' +
    '<tr><td><strong>белый</strong></td><td class="align-center">готов <code>a|b</code></td></tr>' +
    '<tr><td>оранжевый | красный</td><td class="align-center">заряд</td></tr></tbody></table></div>');
});

test('output uses only the allowed elements', () => {
  const html = md('# h1\n\n## h2\n\n> [!NOTE]\n> n\n\n| a |\n|---|\n| b |\n\n- x\n\n1. y\n\n```\nz\n```\n\n**s** *e* `c` <kbd>k</kbd> {{u > v}} [l](https://e.com) <img src=x> <iframe>');
  const allowed = new Set('p h3 ul ol li strong em code pre a kbd span table thead tbody tr th td blockquote figure img div'.split(' '));
  for (const [, tag] of html.matchAll(/<\/?([a-z0-9]+)/g)) assert.ok(allowed.has(tag), `unexpected <${tag}>`);
  assert.ok(!html.includes('<img'));
});

test('plain text and word counts', () => {
  assert.equal(plainText('Open {{Settings > Bluetooth}} and press <kbd>OK</kbd>, **then** wait.\n\n> [!TIP]\n> Fast.'), 'Open Settings > Bluetooth and press OK, then wait.\n\nFast.');
  assert.equal(countWords('Wi-Fi роутер, 2 раза'), 4);
});
