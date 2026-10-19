import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { checkAll, jsonEntryLines } from '../../src/lib/schema.js';
import { makeRoot, removeRoot, guideFile, BASE_FIELDS, STEPS3, ROOT, SAMPLE, tinyPng } from './fixtures/content.mjs';

const G = 'guides/audio/test-guide';
const run = async (files, opts) => {
  const root = await makeRoot('schema', files, opts);
  try {
    return await checkAll(root, { codeRoot: ROOT });
  } finally {
    await removeRoot(root);
  }
};
const find = (list, file, re) => list.find((i) => i.file === file && re.test(i.message));
const has = (list, file, re, line) => {
  const hit = find(list, file, re);
  assert.ok(hit, `expected ${re} in ${file}, got:\n${list.map((i) => `${i.file}:${i.line}: ${i.message}`).join('\n')}`);
  if (line !== undefined) assert.equal(hit.line, line, `line of ${re}`);
};

test('the sample guide and the shipped taxonomy pass with no errors or warnings', async () => {
  const r = await run({});
  assert.deepEqual(r.errors, []);
  assert.deepEqual(r.warnings, []);
  assert.equal(r.content.guides.length, 1);
});

test('a valid minimal guide passes', async () => {
  const r = await run({ [`${G}/index.ru.md`]: guideFile(BASE_FIELDS, STEPS3) }, { sample: false });
  assert.deepEqual(r.errors, []);
});

test('field rules report the line of the field', async () => {
  const f = `${G}/index.ru.md`;
  const r = await run({
    [f]: guideFile({
      ...BASE_FIELDS,
      title: 'Коротко',
      device: 'router',
      brands: '[apple, nokia]',
      difficulty: 'trivial',
      time: '900',
      sources: '\n  - title: Руководство\n    url: http://example.com\n    publisher: Example',
      updated: '2026-13-01',
      authors: '[not a login]',
      colour: 'red'
    }, STEPS3)
  }, { sample: false });
  has(r.errors, f, /title is 7 characters/, 2);
  has(r.errors, f, /device "router" belongs to category "network"/, 5);
  has(r.errors, f, /unknown brand "nokia"/, 6);
  has(r.errors, f, /difficulty must be/, 8);
  has(r.errors, f, /time must be/, 9);
  has(r.errors, f, /url must start with https/, 12);
  has(r.errors, f, /updated must be a date/, 14);
  has(r.errors, f, /not a GitHub login/, 15);
  has(r.errors, f, /unknown field "colour"/, 16);
});

test('required fields, folder mismatch, slug rules', async () => {
  const { summary, ...noSummary } = BASE_FIELDS;
  const r = await run({
    'guides/audio/Bad_Slug/index.ru.md': guideFile(noSummary, STEPS3),
    'guides/network/wrong-folder/index.ru.md': guideFile(BASE_FIELDS, STEPS3),
    'guides/nosuch/x-guide/index.ru.md': guideFile(BASE_FIELDS, STEPS3),
    'guides/audio/airpods-pair-android-copy/index.en.md': guideFile(BASE_FIELDS, STEPS3),
    'guides/phones/airpods-pair-android/index.ru.md': guideFile({ ...BASE_FIELDS, category: 'phones', device: 'smartphone' }, STEPS3)
  });
  has(r.errors, 'guides/audio/Bad_Slug/index.ru.md', /required field "summary"/);
  has(r.errors, 'guides/audio/Bad_Slug', /kebab-case/);
  has(r.errors, 'guides/network/wrong-folder/index.ru.md', /does not match the folder "network"/);
  has(r.errors, 'guides/nosuch/x-guide', /not a category id/);
  has(r.errors, 'guides/audio/airpods-pair-android-copy', /index.ru.md is missing/);
  has(r.errors, 'guides/phones/airpods-pair-android', /duplicate slug/);
});

test('body rules: steps, headings, images, links', async () => {
  const f = `${G}/index.ru.md`;
  const body = '# Заголовок\n\nВступление.\n\n## Шаг\n\n![Короткий](missing.svg)\n\n[ссылка](ftp://x)\n\n## Ок\n\n![Подробное описание картинки](pic.svg)\n';
  const r = await run({
    [f]: guideFile(BASE_FIELDS, body),
    [`${G}/pic.svg`]: '<svg viewBox="0 0 480 300"><rect fill="#123456"/><script/></svg>',
    [`${G}/unused.svg`]: '<svg viewBox="0 0 480 300"/>',
    [`${G}/notes.txt`]: 'x'
  }, { sample: false });
  const bodyLine = 17;
  has(r.errors, f, /"# " headings are not allowed/, bodyLine + 1);
  has(r.errors, f, /3-30 steps/);
  has(r.errors, f, /step title is 2 characters/, bodyLine + 11);
  has(r.errors, f, /alt text is 8 characters/, bodyLine + 7);
  has(r.errors, f, /missing.svg does not exist/, bodyLine + 7);
  has(r.errors, f, /links must be https/, bodyLine + 9);
  has(r.errors, `${G}/pic.svg`, /<script> is not allowed/, 1);
  has(r.warnings, `${G}/pic.svg`, /hard-coded colour/);
  has(r.warnings, `${G}/unused.svg`, /not used by any step/);
  has(r.warnings, `${G}/notes.txt`, /unexpected file/);
});

test('emoji, placeholders and warnings for long easy guides and repeated summaries', async () => {
  const f = `${G}/index.ru.md`;
  const r = await run({
    [f]: guideFile({ ...BASE_FIELDS, time: '150', summary: '"Как подключить наушники к телефону: всё, что нужно знать для подключения по Bluetooth."', models: '[__MODEL__]' }, STEPS3 + '\nГотово \u{1F44D}\n')
  }, { sample: false });
  has(r.errors, f, /emoji/, 31);
  has(r.errors, f, /placeholder __MODEL__/, 16);
  has(r.warnings, f, /long for difficulty "easy"/);
  has(r.warnings, f, /summary repeats the title/);
});

test('photos: size and width limits', async () => {
  const body = '## Сфотографируйте наклейку\n\n![Наклейка на дне роутера с паролем](photo.png)\n\n## Шаг два\n\nТекст.\n\n## Шаг три\n\nТекст.\n';
  const ok = await run({ [`${G}/index.ru.md`]: guideFile(BASE_FIELDS, body), [`${G}/photo.png`]: tinyPng() }, { sample: false });
  assert.deepEqual(ok.errors, []);
  const wide = await run({ [`${G}/index.ru.md`]: guideFile(BASE_FIELDS, body), [`${G}/photo.png`]: tinyPng(2000, 10) }, { sample: false });
  has(wide.errors, `${G}/photo.png`, /2000 px wide/);
});

test('English file: same steps and images; ignored fields warn', async () => {
  const sample = await readFile(join(ROOT, SAMPLE, 'index.ru.md'), 'utf8');
  const enGood = sample.replace('title: Как подключить AirPods к телефону на Android', 'title: How to pair AirPods with an Android phone')
    .replace(/^summary: .*$/m, 'summary: AirPods work with any phone over Bluetooth. Put the case into pairing mode with the back button and pick them in Bluetooth settings.');
  const good = await run({ [`${SAMPLE}/index.en.md`]: enGood });
  assert.deepEqual(good.errors, []);
  assert.deepEqual(good.warnings, []);

  const enBad = enGood.replace('time: 3', 'time: 4').replace('(step-3.svg)', '(step-3.svg)\n\n## Extra step\n\nText.');
  const bad = await run({ [`${SAMPLE}/index.en.md`]: enBad });
  has(bad.errors, `${SAMPLE}/index.en.md`, /English has 6 steps, Russian has 5/);
  has(bad.warnings, `${SAMPLE}/index.en.md`, /"time" is read from index.ru.md only/, 10);

  const moved = enGood.replace('![Задняя сторона кейса AirPods, палец зажимает круглую кнопку, индикатор мигает белым](step-3.svg)\n', '')
    .replace('## Выберите AirPods в списке устройств\n', '## Выберите AirPods в списке устройств\n\n![The back of the AirPods case, a finger presses the button](step-3.svg)\n');
  const r = await run({ [`${SAMPLE}/index.en.md`]: moved });
  has(r.errors, `${SAMPLE}/index.en.md`, /step 3 uses no image but the Russian step uses step-3.svg/);
  has(r.errors, `${SAMPLE}/index.en.md`, /step 4 uses step-3.svg/);
});

test('frontmatter syntax errors are reported with their line', async () => {
  const r = await run({ [`${G}/index.ru.md`]: '---\ntitle: ok\n\tbad: x\n---\n' }, { sample: false });
  has(r.errors, `${G}/index.ru.md`, /tabs/, 3);
});

test('taxonomy rules', async () => {
  const cats = JSON.parse(await readFile(join(ROOT, 'taxonomy/categories.json'), 'utf8'));
  cats.push({ id: 'stats', hue: 10, icon: 'cat-audio', ru: { name: 'x', desc: 'x' }, en: { name: 'x', desc: 'x' } });
  cats.push({ id: 'audio', hue: 400, icon: 'no-such-icon', ru: { name: 'x' }, en: {} });
  const devices = JSON.parse(await readFile(join(ROOT, 'taxonomy/devices.json'), 'utf8'));
  devices.push({ id: 'orphan', category: 'nowhere', ru: { name: 'x' }, en: { name: 'x' } });
  const brands = JSON.parse(await readFile(join(ROOT, 'taxonomy/brands.json'), 'utf8'));
  brands.push({ id: 'Bad Id', name: 'x' }, { id: 'nosite', name: 'n', site: 'ftp://x' }, { id: 'emoji', name: 'Star ⭐' });
  const r = await run({
    'taxonomy/categories.json': JSON.stringify(cats, null, 2),
    'taxonomy/devices.json': JSON.stringify(devices, null, 2),
    'taxonomy/brands.json': JSON.stringify(brands, null, 2)
  });
  const cf = 'taxonomy/categories.json';
  has(r.errors, cf, /reserved path/);
  has(r.errors, cf, /duplicate id "audio"/);
  has(r.errors, cf, /hue must be/);
  has(r.errors, cf, /en.name is required/);
  has(r.warnings, cf, /icon src\/icons\/no-such-icon.svg does not exist/);
  has(r.errors, 'taxonomy/devices.json', /"orphan": unknown category "nowhere"/);
  has(r.errors, 'taxonomy/brands.json', /kebab-case/);
  has(r.errors, 'taxonomy/brands.json', /site must be an https/);
  has(r.errors, 'taxonomy/brands.json', /emoji/);
  const bad = await run({ 'taxonomy/tasks.json': '[\n  {"id": "pair",\n  }\n]' });
  has(bad.errors, 'taxonomy/tasks.json', /invalid JSON/, 3);
});

test('json entry lines', () => {
  assert.deepEqual(jsonEntryLines('[\n {"id": "a", "x": {"y": "[{"}},\n {"id": "b"}\n]'), [2, 3]);
});
