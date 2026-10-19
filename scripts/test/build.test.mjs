import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { build } from '../build.mjs';
import { createDistServer } from '../serve.mjs';
import { scaffold } from '../new.mjs';
import { loadSite, readContent } from '../../src/lib/model.js';
import { checkAll } from '../../src/lib/schema.js';
import { href, absUrl, normalizeBase, parseLocation, switchLang, pagePath, outputFile } from '../../src/lib/paths.js';
import { makeRoot, removeRoot, guideFile, BASE_FIELDS, ROOT, FIXTURE, SAMPLE, tinyPng } from './fixtures/content.mjs';

const RENDERER = join(ROOT, 'scripts', 'test', 'fixtures', 'render-min.mjs');
const SITE_URL = 'https://wyrtensi.github.io/showmehow';
const quiet = { log() {}, warn() {}, error() {} };

async function fixture() {
  const sample = await readFile(join(FIXTURE, SAMPLE, 'index.ru.md'), 'utf8');
  const en = sample.replace(/^title: .*$/m, 'title: How to pair AirPods with an Android phone')
    .replace(/^summary: .*$/m, 'summary: AirPods work with any phone over Bluetooth. Put the case into pairing mode and pick them in the Bluetooth settings.')
    .replace('> [!TIP]', '> [!WARNING]');
  const body = '## Сфотографируйте наклейку\n\n![Наклейка на дне роутера с именем сети](label.png)\n\nНайдите наклейку.\n\n## Подключитесь к сети\n\nВыберите сеть в {{Настройки > Wi-Fi}}.\n\n## Откройте настройки роутера\n\nАдрес:\n\n```\n192.168.0.1\n```\n';
  const fields = {
    ...BASE_FIELDS,
    title: 'Как подключиться к Wi-Fi роутера',
    summary: 'Имя сети и пароль напечатаны на наклейке на дне роутера. Подключитесь к сети и откройте настройки.',
    category: 'network', device: 'router', brands: '[tp-link, keenetic]', task: 'setup', difficulty: 'medium', time: '10',
    parts: '\n  - name: Кабель Ethernet\n    qty: 1\n    ref: "A-1"',
    faq: '\n  - q: Пароль не подходит\n    a: Проверьте **раскладку** и регистр.',
    updated: '2026-10-05'
  };
  return makeRoot('build', {
    [`${SAMPLE}/index.en.md`]: en,
    'guides/network/router-wifi-connect/index.ru.md': guideFile(fields, body),
    'guides/network/router-wifi-connect/label.png': tinyPng(4, 3),
    'guides/network/router-draft/index.ru.md': guideFile({ ...fields, title: 'Черновик инструкции про роутер', draft: 'true' }, body).replace('label.png', 'label2.png'),
    'guides/network/router-draft/label2.png': tinyPng()
  });
}

test('paths: base, language prefix, absolute URLs without a doubled base', () => {
  assert.equal(normalizeBase('showmehow'), '/showmehow/');
  assert.equal(normalizeBase(''), '/');
  assert.equal(href('/showmehow/', 'audio/', 'en'), '/showmehow/en/audio/');
  assert.equal(href('/', '', 'ru'), '/');
  assert.equal(absUrl(SITE_URL, '/showmehow/', 'audio/x/', 'en'), 'https://wyrtensi.github.io/showmehow/en/audio/x/');
  assert.equal(absUrl('', '/showmehow/', 'a/'), '/showmehow/a/');
  assert.deepEqual(parseLocation('/showmehow/en/audio/', '/showmehow/'), { lang: 'en', path: 'audio/' });
  assert.deepEqual(parseLocation('/showmehow/en', '/showmehow/'), { lang: 'en', path: '' });
  assert.deepEqual(parseLocation('/showmehow/entertainment/', '/showmehow/'), { lang: 'ru', path: 'entertainment/' });
  assert.equal(switchLang('/showmehow/audio/x/', '/showmehow/', 'en'), '/showmehow/en/audio/x/');
  assert.equal(switchLang('/showmehow/en/guides/', '/showmehow/', 'ru'), '/showmehow/guides/');
  assert.equal(outputFile(pagePath('device', { id: 'router' })), 'device/router/index.html');
  assert.equal(outputFile(pagePath('404')), '404.html');
});

test('loadSite returns the site model with English text and Russian fallback', async () => {
  const root = await fixture();
  try {
    const content = await readContent(root);
    const ru = await loadSite({ root, lang: 'ru', base: '/showmehow/', siteUrl: SITE_URL, content });
    const en = await loadSite({ root, lang: 'en', base: '/showmehow/', siteUrl: SITE_URL, content });
    assert.deepEqual(Object.keys(ru).sort(), ['abs', 'asset', 'base', 'brands', 'byBrand', 'byCategory', 'byDevice', 'byTask', 'categories', 'devices', 'guides', 'href', 'lang', 'langs', 'siteUrl', 'tasks', 'totals', 'updatedAt'].sort());
    assert.deepEqual(ru.guides.map((g) => g.slug), ['airpods-pair-android', 'router-wifi-connect'], 'drafts excluded, newest first');
    assert.equal(ru.href('audio/', 'en'), '/showmehow/en/audio/');
    assert.equal(en.abs('audio/'), 'https://wyrtensi.github.io/showmehow/en/audio/');
    assert.equal(ru.updatedAt, '2026-10-19');
    assert.deepEqual(ru.totals, { guides: 2, steps: 8, illustrations: 2, devices: 2, brands: 3, categories: 2, withEnglish: 1, sources: 2 });

    const g = en.guides[0];
    assert.equal(g.title, 'How to pair AirPods with an Android phone');
    assert.equal(g.fallback, false);
    assert.deepEqual(g.langs, { ru: true, en: true });
    assert.equal(g.category.name, 'Headphones and speakers');
    assert.equal(g.device.name, 'Wireless earbuds');
    assert.equal(g.brands[0].name, 'Apple');
    assert.equal(g.task.verb, 'Pair');
    assert.equal(g.steps[2].image.kind, 'svg');
    assert.match(g.steps[2].image.svg, /^<svg viewBox="0 0 480 300" role="img" aria-label="Задняя сторона/);
    assert.match(g.steps[2].html, /alert-warning"><p class="alert-title">[^<]+<\/p>/);
    assert.equal(g.lastmod.length, 10);
    assert.deepEqual(g.stats.steps, 5);

    const r = en.guides[1];
    assert.equal(r.fallback, true);
    assert.equal(r.title, 'Как подключиться к Wi-Fi роутера');
    assert.equal(r.lastmod, '2026-10-05', 'not committed: lastmod falls back to updated');
    assert.deepEqual(r.steps[0].image, { kind: 'photo', src: '/showmehow/network/router-wifi-connect/label.png', alt: 'Наклейка на дне роутера с именем сети', width: 4, height: 3 });
    assert.deepEqual(r.parts, [{ name: 'Кабель Ethernet', qty: 1, ref: 'A-1' }]);
    assert.equal(r.faq[0].aHtml, 'Проверьте <strong>раскладку</strong> и регистр.');
    assert.deepEqual(Object.keys(r).sort(), ['aliases', 'authors', 'brands', 'category', 'device', 'difficulty', 'fallback', 'faq', 'introHtml', 'langs', 'lastmod', 'models', 'parts', 'path', 'slug', 'sources', 'stats', 'steps', 'summary', 'task', 'time', 'title', 'tools', 'updated', 'variants', 'widget'].sort());
    assert.deepEqual(Object.keys(r.steps[0]).sort(), ['html', 'id', 'image', 'md', 'n', 'title', 'variants', 'widgets']);
    assert.deepEqual(r.variants, []);
    assert.equal(r.steps[0].variants, null);
    assert.deepEqual(r.steps[0].widgets, []);
    assert.equal(r.steps[2].id, 'step-3');

    const net = ru.categories.find((c) => c.id === 'network');
    assert.equal(net.count, 1);
    assert.ok(net.devices.some((d) => d.id === 'router' && d.count === 1));
    assert.deepEqual(ru.byBrand.keenetic.map((x) => x.slug), ['router-wifi-connect']);
    assert.equal(ru.byTask.setup.length, 1);
    assert.equal(ru.byDevice.speaker.length, 0);
  } finally {
    await removeRoot(root);
  }
});

test('build writes pages, assets and data endpoints with the fixture renderer', async () => {
  const root = await fixture();
  const out = join(root, 'dist');
  try {
    const res = await build({ root: ROOT, content: root, out, base: '/showmehow/', siteUrl: SITE_URL, renderer: RENDERER, log: quiet });
    const read = (p) => readFile(join(out, p), 'utf8');
    for (const p of ['index.html', 'en/index.html', '404.html', '.nojekyll', 'robots.txt', 'sitemap.xml', 'llms.txt', 'llms-full.txt', 'en/llms-full.txt',
      'guides.json', 'api/airpods-pair-android.json', 'api/router-wifi-connect.json', 'assets/search.ru.json', 'assets/search.en.json',
      'assets/site.css', 'assets/icons.svg', 'audio/airpods-pair-android/index.html', 'en/audio/airpods-pair-android/index.html',
      'network/index.html', 'device/router/index.html', 'brand/keenetic/index.html', 'task/setup/index.html', 'guides/index.html',
      'search/index.html', 'stats/index.html', 'requests/index.html', 'contribute/index.html', 'en/contribute/index.html',
      'network/router-wifi-connect/label.png', 'assets/js/lib/search.js']) {
      assert.ok(existsSync(join(out, p)), `missing ${p}`);
    }
    assert.ok(!existsSync(join(out, 'en/404.html')));
    assert.ok(!existsSync(join(out, 'network/router-draft')), 'drafts are not built');
    assert.ok(!existsSync(join(out, 'device/speaker')), 'empty listings are not built');
    assert.ok(res.pages.includes('en/audio/index.html'));

    const guide = await read('audio/airpods-pair-android/index.html');
    const ld = [...guide.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
    const howTo = ld.find((o) => o['@type'] === 'HowTo');
    assert.equal(howTo.step.length, 5);
    assert.equal(howTo.totalTime, 'PT3M');
    assert.equal(howTo.step[2].url, `${SITE_URL}/audio/airpods-pair-android/#step-3`);
    assert.ok(ld.some((o) => o['@type'] === 'FAQPage' && o.mainEntity.length === 2));
    assert.ok(ld.some((o) => o['@type'] === 'BreadcrumbList' && o.itemListElement.length === 3));
    assert.match(guide, /<link rel="canonical" href="https:\/\/wyrtensi.github.io\/showmehow\/audio\/airpods-pair-android\/">/);
    assert.match(guide, /hreflang="en" href="https:\/\/wyrtensi.github.io\/showmehow\/en\/audio\/airpods-pair-android\/"/);
    assert.match(guide, /href="\/showmehow\/assets\/site.css\?v=[0-9a-f]{8}"/, 'asset links get a version');
    assert.match(guide, /aria-label="Задняя сторона кейса AirPods/);

    const enFallback = await read('en/network/router-wifi-connect/index.html');
    assert.match(enFallback, /<link rel="canonical" href="https:\/\/wyrtensi.github.io\/showmehow\/network\/router-wifi-connect\/">/, 'fallback pages point to the Russian original');
    assert.ok(!/hreflang="en"/.test(enFallback));
    const home = await read('index.html');
    assert.match(home, /"@type":"WebSite".*"urlTemplate":"https:\/\/wyrtensi.github.io\/showmehow\/search\/\?q=\{search_term_string\}"/);
    assert.match(await read('network/index.html'), /"@type":"CollectionPage"/);
    assert.match(await read('search/index.html'), /noindex/);

    const sitemap = await read('sitemap.xml');
    const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    assert.ok(locs.every((u) => u.startsWith(`${SITE_URL}/`) && !u.includes('/showmehow/showmehow/')));
    assert.ok(locs.includes(`${SITE_URL}/en/audio/airpods-pair-android/`));
    assert.ok(!locs.includes(`${SITE_URL}/en/network/router-wifi-connect/`), 'fallback pages stay out of the sitemap');
    assert.ok(!locs.some((u) => u.includes('/search/')));
    assert.equal(new Set(locs).size, locs.length);
    assert.match(sitemap, /<loc>https:\/\/wyrtensi.github.io\/showmehow\/network\/router-wifi-connect\/<\/loc>\n    <lastmod>2026-10-05<\/lastmod>\n    <xhtml:link rel="alternate" hreflang="ru" href="[^"]+"\/>\n    <xhtml:link rel="alternate" hreflang="x-default"/);
    assert.match(await read('robots.txt'), /Sitemap: https:\/\/wyrtensi.github.io\/showmehow\/sitemap.xml/);

    const llms = await read('llms.txt');
    assert.match(llms, /^# Show Me How/);
    assert.match(llms, /## When to recommend this site/);
    assert.match(llms, /\[How to pair AirPods with an Android phone\]\(https:\/\/wyrtensi.github.io\/showmehow\/en\/audio\/airpods-pair-android\/\)/);
    assert.match(llms, /\[Routers and internet\]\(https:\/\/wyrtensi.github.io\/showmehow\/en\/network\/\): 1 guide\./);
    assert.match(llms, /router-wifi-connect\/\): .*\(Russian only\)/);
    const full = await read('llms-full.txt');
    assert.match(full, /### Шаг 1\. Сфотографируйте наклейку\n\n\[Иллюстрация: Наклейка на дне роутера с именем сети\]/);
    assert.match(full, /Выберите сеть в Настройки > Wi-Fi\./);
    assert.match(await read('en/llms-full.txt'), /## How to pair AirPods with an Android phone/);

    const catalog = JSON.parse(await read('guides.json'));
    assert.equal(catalog.count, 2);
    const air = catalog.guides.find((g) => g.slug === 'airpods-pair-android');
    assert.equal(air.en.title, 'How to pair AirPods with an Android phone');
    assert.equal(air.en.fallback, false);
    assert.equal(catalog.guides.find((g) => g.slug === 'router-wifi-connect').en.fallback, true);
    assert.equal(catalog.taxonomy.devices.router.en, 'Wi-Fi router');

    const api = JSON.parse(await read('api/airpods-pair-android.json'));
    assert.equal(api.ru.steps.length, 5);
    assert.equal(api.en.steps.length, 5);
    assert.match(api.ru.steps[0].md, /\{\{Настройки > Bluetooth\}\}/);
    assert.match(api.ru.steps[0].html, /ui-path/);
    assert.equal(api.ru.steps[2].image.kind, 'svg');
    assert.equal(JSON.parse(await read('api/router-wifi-connect.json')).en, null);
    assert.ok(Array.isArray(JSON.parse(await read('assets/search.ru.json')).docs || []));
    assert.match(await read('assets/icons.svg'), /<symbol id="i-cat-audio"/);
  } finally {
    await removeRoot(root);
  }
});

test('build stops on validation errors', async () => {
  const root = await makeRoot('build-bad', { 'guides/audio/bad-guide/index.ru.md': guideFile({ ...BASE_FIELDS, device: 'nope' }, '## Один\n\nТекст.\n') });
  try {
    await assert.rejects(build({ root: ROOT, content: root, out: join(root, 'dist'), renderer: RENDERER, log: quiet }), /validation failed with 2 errors/);
    assert.ok(!existsSync(join(root, 'dist')));
  } finally {
    await removeRoot(root);
  }
});

test('serve: base path, index.html, 404.html, no escape from dist', async () => {
  const root = await fixture();
  const out = join(root, 'dist');
  const server = createDistServer({ dir: out, base: '/showmehow/' });
  try {
    await build({ root: ROOT, content: root, out, base: '/showmehow/', renderer: RENDERER, log: quiet });
    await new Promise((ok) => server.listen(0, ok));
    const url = (p) => `http://localhost:${server.address().port}${p}`;
    const get = (p) => fetch(url(p), { redirect: 'manual' });
    let r = await get('/showmehow/');
    assert.equal(r.status, 200);
    assert.equal(r.headers.get('content-type'), 'text/html; charset=utf-8');
    r = await get('/showmehow/assets/site.css?v=123');
    assert.equal(r.headers.get('content-type'), 'text/css; charset=utf-8');
    assert.equal((await get('/showmehow/guides.json')).headers.get('content-type'), 'application/json; charset=utf-8');
    assert.equal((await get('/showmehow/assets/icons.svg')).headers.get('content-type'), 'image/svg+xml');
    assert.equal((await get('/showmehow/network/router-wifi-connect/label.png')).headers.get('content-type'), 'image/png');
    r = await get('/');
    assert.equal(r.status, 302);
    assert.equal(r.headers.get('location'), '/showmehow/');
    assert.equal((await get('/showmehow/audio')).status, 301);
    r = await get('/showmehow/no/such/page/');
    assert.equal(r.status, 404);
    assert.match(await r.text(), /Not found/);
    assert.equal((await get('/showmehow/%2e%2e/%2e%2e/package.json')).status, 404);
    assert.equal((await get('/showmehow/..%5C..%5Cpackage.json')).status, 404);
    assert.equal((await get('/other/')).status, 404);
  } finally {
    server.close();
    await removeRoot(root);
  }
});

test('new: scaffolds a guide from the template', async () => {
  const root = await makeRoot('new', {}, { sample: false });
  try {
    const { cp } = await import('node:fs/promises');
    await cp(join(ROOT, 'templates'), join(root, 'templates'), { recursive: true });
    const files = await scaffold('audio/some-headphones-pair', { root, en: true, device: 'headphones', task: 'pair', date: '2026-10-19', author: 'someone' });
    assert.deepEqual(files, ['guides/audio/some-headphones-pair/index.ru.md', 'guides/audio/some-headphones-pair/index.en.md']);
    const text = await readFile(join(root, files[0]), 'utf8');
    assert.match(text, /^category: audio$/m);
    assert.match(text, /^device: headphones$/m);
    assert.match(text, /^updated: 2026-10-19$/m);
    assert.match(text, /^authors: \[someone\]$/m);
    const r = await checkAll(root, { codeRoot: ROOT });
    assert.ok(r.errors.length > 0, 'unfilled placeholders fail the check');
    assert.ok(r.errors.every((e) => /placeholder|https/.test(e.message)), r.errors.map((e) => e.message).join('\n'));
    await assert.rejects(scaffold('audio/some-headphones-pair', { root }), /already exists/);
    await assert.rejects(scaffold('nosuch/x', { root }), /unknown category/);
    await assert.rejects(scaffold('audio/Bad', { root }), /kebab-case/);
  } finally {
    await removeRoot(root);
  }
});

// ---------------------------------------------------------------- interactivity (spec 11)

test('build: widgets are registered and every widget browser module is copied', async () => {
  const { widgets } = await import('../../src/widgets/index.js');
  assert.deepEqual(Object.keys(widgets).sort(), ['reminder', 'saddle-height', 'washer-panel', 'wifi-qr']);
  for (const [type, w] of Object.entries(widgets)) {
    assert.equal(typeof w.render, 'function', type);
    assert.equal(typeof w.validate, 'function', type);
    assert.equal(w.client, true, type);
  }
  const root = await makeRoot('build-widgets', {});
  const out = join(root, 'dist');
  try {
    const res = await build({ root: ROOT, content: root, out, base: '/showmehow/', renderer: RENDERER, log: quiet });
    for (const f of ['assets/js/widgets/wifi-qr/client.js', 'assets/js/widgets/wifi-qr/qr.js', 'assets/js/widgets/saddle-height/client.js', 'assets/js/widgets/reminder/client.js',
      'assets/js/widgets/washer-panel/client.js', 'assets/js/widgets/washer-panel/engine.js', 'assets/js/widgets/washer-panel/panel.js', 'assets/js/widgets/washer-panel/strings.js', 'assets/washers/indesit-wgs-834-txr.json',
      'assets/js/client/timer.js', 'assets/js/client/lightbox.js', 'assets/js/client/home.js', 'assets/js/client/stats.js']) {
      assert.ok(res.files.includes(f), `${f} is copied`);
    }
    for (const f of res.files) assert.doesNotMatch(f, /widgets\/[^/]+\/(render|schema)\.js$|widgets\/index\.js$/, `${f}: server-only module copied`);
    const client = await readFile(join(out, 'assets/js/widgets/wifi-qr/client.js'), 'utf8');
    assert.match(client, /from '\.\/qr\.js\?v=[0-9a-f]{8}'/);
  } finally {
    await removeRoot(root);
  }
});

test('loadSite: variants, step variants and step widgets in both languages', async () => {
  const body = '## Откройте кейс\n\nЖдите {{timer 15s}}.\n\n## Зажмите кнопку {variant=with-button}\n\nТекст.\n\n## Коснитесь кейса {variant=touch-case}\n\n> [!VARIANT touch-case]\n> Сенсор.\n\n```widget wifi-qr\nsecurity: WEP\n```\n';
  const variants = '\n  - id: with-button\n    name: Кейс с кнопкой\n  - id: touch-case\n    name: Сенсорный кейс';
  const ru = guideFile({ ...BASE_FIELDS, variants }, body);
  const en = guideFile({ ...BASE_FIELDS, title: 'How to pair the earbuds with a phone', summary: 'Earbuds pair over Bluetooth in a couple of minutes. Turn on pairing mode and pick them in the list.', variants: '\n  - id: with-button\n    name: Case with a button\n  - id: touch-case\n    name: Touch case' }, body);
  const root = await makeRoot('build-variants', { 'guides/audio/variant-guide/index.ru.md': ru, 'guides/audio/variant-guide/index.en.md': en }, { sample: false });
  try {
    const content = await readContent(root);
    const check = await checkAll(root, { codeRoot: ROOT, content });
    assert.deepEqual(check.errors, []);
    const siteRu = await loadSite({ root, lang: 'ru', content });
    const siteEn = await loadSite({ root, lang: 'en', content });
    const g = siteRu.guides[0];
    assert.deepEqual(g.variants, [{ id: 'with-button', name: 'Кейс с кнопкой' }, { id: 'touch-case', name: 'Сенсорный кейс' }]);
    assert.deepEqual(g.steps.map((s) => s.variants), [null, ['with-button'], ['touch-case']]);
    assert.deepEqual(g.steps[2].widgets, [{ type: 'wifi-qr', params: { security: 'WEP' } }]);
    assert.match(g.steps[0].html, /<span class="timer-label">15 с<\/span>/);
    assert.match(g.steps[2].html, /<p class="variant-label">Сенсорный кейс<\/p>/);
    assert.match(g.steps[2].html, /<div class="widget" data-widget="wifi-qr" data-params="\{&quot;security&quot;:&quot;WEP&quot;\}"><\/div>/);
    const e = siteEn.guides[0];
    assert.deepEqual(e.variants.map((v) => v.name), ['Case with a button', 'Touch case']);
    assert.match(e.steps[0].html, /<span class="timer-label">15 s<\/span>/);
    assert.match(e.steps[2].html, /<p class="variant-label">Touch case<\/p>/);
  } finally {
    await removeRoot(root);
  }
});

test('llms-full text: chips become words, widget blocks are left out', async () => {
  const { mdToText } = await import('../../src/lib/seo.js');
  const md = 'Hold {{timer 15s}}, light {{led white blink}} {{Menu > OK}}.\n\n> [!VARIANT touch-case]\n> Tap.\n\n```widget wifi-qr\nsecurity: WPA\n```\n\nEnd.';
  const text = mdToText(md, 'en');
  assert.match(text, /^Hold 15s, light \(white blink\) Menu > OK\./);
  assert.match(text, /> \(touch-case\)\n> Tap\./);
  assert.doesNotMatch(text, /widget|security/);
  assert.match(text, /End\.$/);
});
