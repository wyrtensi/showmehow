// Renders every page from a hand-built Site fixture (docs/spec.md section 7) and checks the
// document structure: one h1, lang, canonical, root-absolute internal links, no emoji.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as render from '../../src/render/index.js';
import { inlineSvg } from '../../src/lib/svg.js';
import { widgets } from '../../src/widgets/index.js';
import { t, alertLabels, STRINGS } from '../../src/lib/i18n.js';

const root = join(import.meta.dirname, '..', '..');
// Taxonomy and the sample illustration come from the frozen fixture, not live content.
const fixture = join(root, 'scripts', 'test', 'fixtures', 'site');
const json = (p) => JSON.parse(readFileSync(join(fixture, p), 'utf8'));

const ui = (...segs) => `<span class="ui-path">${segs.map((s) => `<span class="ui-seg">${s}</span>`).join('<span class="ui-sep"></span>')}</span>`;
const SVG_ALT = 'Задняя сторона кейса, палец зажимает кнопку';
// As model.js inlines it: the <svg> itself is the image with the alt text.
const SVG = inlineSvg(readFileSync(join(fixture, 'guides/audio/airpods-pair-android/step-3.svg'), 'utf8'), { prefix: 't-s3', label: SVG_ALT }).svg;

function step(n, title, html, image = null) {
  return { n, id: `step-${n}`, title, html, image };
}

// Guide texts are the same in both languages here; `fallback` marks the English stand-ins.
function rawGuides(lang, labels) {
  const en = lang === 'en';
  return [
    {
      slug: 'airpods-pair-android', path: 'audio/airpods-pair-android/', category: 'audio', device: 'earbuds', brands: ['apple'], task: 'pair',
      models: ['AirPods 2', 'AirPods Pro 2'], difficulty: 'easy', time: 3,
      title: en ? 'How to pair AirPods with an Android phone' : 'Как подключить AirPods к телефону на Android',
      summary: en ? 'AirPods work with any phone over Bluetooth. Put the case into pairing mode and pick the earbuds in Bluetooth settings.' : 'AirPods работают с любым телефоном по Bluetooth. Переведите кейс в режим подключения и выберите наушники в настройках.',
      introHtml: '<p>AirPods подключаются к Android как обычные Bluetooth-наушники.</p>',
      tools: ['Телефон на Android', 'AirPods в кейсе'], parts: [], aliases: ['эйрподс'],
      steps: [
        step(1, 'Включите Bluetooth на телефоне', `<p>Откройте ${ui('Настройки', 'Bluetooth')} и включите переключатель.</p>`),
        step(2, 'Откройте кейс с наушниками', '<p>Оба наушника должны лежать в кейсе.</p>'),
        step(3, 'Зажмите кнопку на задней стенке кейса', `<p>Удерживайте кнопку, пока индикатор не начнёт <strong>мигать белым</strong>.</p><div class="alert alert-tip"><p class="alert-title">${labels.tip}</p><p>У AirPods 4 дважды коснитесь кейса.</p></div>`, { kind: 'svg', svg: SVG, alt: SVG_ALT }),
        step(4, 'Выберите AirPods в списке', '<p>Нажмите на имя наушников.</p>'),
        step(5, 'Проверьте звук', `<p>Включите музыку.</p><div class="alert alert-note"><p class="alert-title">${labels.note}</p><p>Нажмите <kbd>OK</kbd>.</p></div>`)
      ],
      faq: [{ q: 'Индикатор не мигает', aHtml: 'Зарядите кейс 10 минут и повторите.' }],
      sources: [{ title: 'Использование AirPods с Android', url: 'https://support.apple.com/ru-ru/111865', publisher: 'Apple' }],
      updated: '2026-10-19', lastmod: '2026-10-19', authors: ['wyrtensi'], widget: null, langs: { ru: true, en: true }, fallback: false
    },
    {
      slug: 'ikea-malm-3-drawer-assemble', path: 'furniture/ikea-malm-3-drawer-assemble/', category: 'furniture', device: 'chest-of-drawers', brands: ['ikea'], task: 'assemble',
      models: ['MALM 3'], difficulty: 'hard', time: 150,
      title: 'Как собрать комод IKEA MALM на 3 ящика', summary: 'Сборка корпуса, направляющих и ящиков, а затем крепление комода к стене, чтобы он не опрокинулся.',
      introHtml: '', tools: ['Крестовая отвёртка PH2', 'Молоток'], aliases: [],
      parts: [{ name: 'Шуруп 4x16', qty: 12, ref: '101345' }, { name: 'Деревянный шкант', qty: 8, ref: '' }],
      steps: [
        step(1, 'Разложите детали', '<p>Проверьте комплект по таблице.</p><div class="table-wrap"><table><thead><tr><th>Деталь</th><th>Кол-во</th></tr></thead><tbody><tr><td>Боковина</td><td>2</td></tr></tbody></table></div>'),
        step(2, 'Соберите корпус', '<ol><li>Вставьте шканты.</li><li>Прикрутите верх.</li></ol>', { kind: 'photo', src: 'frame.webp', alt: 'Собранный корпус комода лежит на полу', width: 1200, height: 800 }),
        step(3, 'Закрепите комод на стене', '<pre><code>wall-anchor</code></pre><p><a href="https://www.ikea.com/" rel="noopener" target="_blank">IKEA</a></p>')
      ],
      faq: [], sources: [{ title: 'MALM assembly instructions', url: 'https://www.ikea.com/', publisher: 'IKEA' }],
      updated: '2026-10-12', lastmod: '2026-10-12', authors: ['wyrtensi', 'helper'],
      widget: { type: 'test-demo', params: { size: 3 }, placement: 'end' }, langs: { ru: true, en: false }, fallback: en
    },
    {
      slug: 'roborock-reset', path: 'appliances/roborock-reset/', category: 'appliances', device: 'robot-vacuum', brands: ['roborock', 'xiaomi'], task: 'reset',
      models: [], difficulty: 'medium', time: 10,
      title: 'Как сбросить робот-пылесос Roborock', summary: 'Сброс сетевых настроек и полный сброс к заводским, когда робот не подключается к Wi-Fi.',
      introHtml: '<p>Два вида сброса.</p>', tools: [], parts: [], aliases: [],
      steps: [step(1, 'Откройте крышку', '<p>Поднимите крышку.</p>'), step(2, 'Зажмите две кнопки', '<p>Держите 5 секунд.</p>'), step(3, 'Дождитесь голосового сообщения', '<p>Робот сообщит о сбросе.</p>')],
      faq: [], sources: [{ title: 'Roborock support', url: 'https://support.roborock.com/', publisher: 'Roborock' }],
      updated: '2026-09-30', lastmod: '2026-09-30', authors: ['wyrtensi'], widget: null, langs: { ru: true, en: false }, fallback: en
    }
  ];
}

export function makeSite(lang = 'ru', { base = '/showmehow/', siteUrl = 'https://wyrtensi.github.io/showmehow' } = {}) {
  const pick = (x) => x[lang] || x.ru;
  const href = (path = '', l = lang) => base + (l === 'ru' ? '' : l + '/') + String(path).replace(/^\/+/, '');
  const abs = (path = '', l = lang) => (siteUrl ? new URL(href(path, l), siteUrl).href : href(path, l));
  const categories = json('taxonomy/categories.json').map((c) => ({
    id: c.id, hue: c.hue, icon: c.icon, ...pick(c), featured: (c.featured || []).map((f) => ({ url: f.url, ...pick(f) })), count: 0, devices: []
  }));
  const devices = json('taxonomy/devices.json').map((d) => ({ id: d.id, category: d.category, name: pick(d).name, plural: pick(d).plural || pick(d).name, aliases: d.aliases || [], count: 0 }));
  const brands = json('taxonomy/brands.json').map((b) => ({ id: b.id, name: b.name, aliases: b.aliases || [], site: b.site || '', count: 0 }));
  const tasks = json('taxonomy/tasks.json').map((k) => ({ id: k.id, ...pick(k), count: 0 }));
  const find = (list, id) => list.find((x) => x.id === id);
  const guides = rawGuides(lang, alertLabels(lang)).map((g) => ({
    ...g,
    category: find(categories, g.category), device: find(devices, g.device), brands: g.brands.map((b) => find(brands, b)), task: find(tasks, g.task),
    stats: { steps: g.steps.length, illustrations: g.steps.filter((s) => s.image).length, words: 100 }
  }));
  const by = (key) => {
    const out = {};
    for (const g of guides) for (const x of [].concat(g[key])) (out[x.id] ||= []).push(g);
    return out;
  };
  const byCategory = by('category'), byDevice = by('device'), byBrand = by('brands'), byTask = by('task');
  for (const c of categories) { c.count = byCategory[c.id]?.length || 0; c.devices = devices.filter((d) => d.category === c.id); }
  for (const d of devices) d.count = byDevice[d.id]?.length || 0;
  for (const b of brands) b.count = byBrand[b.id]?.length || 0;
  for (const k of tasks) k.count = byTask[k.id]?.length || 0;
  return {
    lang, base, siteUrl, langs: ['ru', 'en'], href, abs,
    categories, devices, brands, tasks, guides, byCategory, byDevice, byBrand, byTask,
    totals: {
      guides: guides.length, steps: guides.reduce((s, g) => s + g.steps.length, 0), illustrations: 2, devices: 3, brands: 4, categories: categories.length,
      withEnglish: guides.filter((g) => g.langs.en).length, sources: 3
    },
    updatedAt: guides[0].updated
  };
}

// The renderer only knows registered widgets; the fixture guide uses this stand-in.
export function withDemoWidget(fn) {
  widgets['test-demo'] = { render: (params, ctx) => `<p class="demo">${ctx.t('guide.done')} ${params.size}</p>`, validate: () => [], client: false };
  try {
    return fn();
  } finally {
    delete widgets['test-demo'];
  }
}

export function renderAll(site) {
  const pages = [
    render.renderHome(site), render.renderCatalog(site), render.renderSearch(site), render.renderStats(site),
    render.renderRequests(site), render.renderContribute(site),
    ...site.guides.map((g) => render.renderGuide(site, g)),
    ...site.categories.map((c) => render.renderCategory(site, c)),
    ...site.devices.filter((d) => d.count || d.id === 'router').map((d) => render.renderDevice(site, d)),
    ...site.brands.filter((b) => b.count || b.id === 'generic' || b.id === 'lg').map((b) => render.renderBrand(site, b)),
    ...site.tasks.map((k) => render.renderTask(site, k))
  ];
  if (site.lang === 'ru') pages.push(render.render404(site));
  return pages;
}

const EMOJI = /[\p{Extended_Pictographic}️]/u;

function checkPage(site, { path, html }) {
  const where = `${site.lang}:${path}`;
  assert.ok(html.startsWith('<!doctype html>'), `${where}: doctype`);
  assert.match(html, new RegExp(`<html lang="${site.lang}"`), `${where}: lang attribute`);
  assert.equal((html.match(/<h1[\s>]/g) || []).length, 1, `${where}: exactly one h1`);
  assert.match(html, /<title>[^<]+<\/title>/, `${where}: title`);
  assert.match(html, /<meta name="description" content="[^"]+">/, `${where}: description`);
  if (path !== '404.html') {
    assert.match(html, /<link rel="canonical" href="https:\/\/wyrtensi\.github\.io\/showmehow\/[^"]*">/, `${where}: canonical`);
    assert.match(html, /<link rel="alternate" hreflang="x-default"/, `${where}: hreflang`);
  }
  assert.match(html, /<meta property="og:image" content="https:\/\//, `${where}: og:image`);
  assert.match(html, /class="sr-only agent-note"/, `${where}: agent note`);
  for (const [, attrName, url] of html.matchAll(/\s(href|src|action)="([^"]*)"/g)) {
    assert.match(url, /^(\/showmehow\/|https?:\/\/|#|mailto:|data:)/, `${where}: ${attrName}="${url}" is not root-absolute`);
  }
  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) JSON.parse(m[1]);
  const emoji = html.match(EMOJI);
  assert.equal(emoji, null, `${where}: emoji ${emoji?.[0]}`);
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
  const dup = ids.find((id, i) => ids.indexOf(id) !== i);
  assert.equal(dup, undefined, `${where}: duplicate id ${dup}`);
}

test('render: every page of both languages has a sound structure', () => withDemoWidget(() => {
  for (const lang of ['ru', 'en']) {
    const site = makeSite(lang);
    const pages = renderAll(site);
    const paths = new Set(pages.map((p) => p.path));
    assert.equal(paths.size, pages.length, 'unique output paths');
    for (const page of pages) checkPage(site, page);
  }
}));

test('render: output paths follow the URL table', () => withDemoWidget(() => {
  const site = makeSite('ru');
  assert.equal(render.renderHome(site).path, 'index.html');
  assert.equal(render.renderGuide(site, site.guides[0]).path, 'audio/airpods-pair-android/index.html');
  assert.equal(render.renderCategory(site, site.categories[0]).path, 'audio/index.html');
  assert.equal(render.renderDevice(site, site.devices[0]).path, 'device/earbuds/index.html');
  assert.equal(render.renderBrand(site, site.brands[1]).path, 'brand/apple/index.html');
  assert.equal(render.renderTask(site, site.tasks[0]).path, 'task/pair/index.html');
  assert.equal(render.renderCatalog(site).path, 'guides/index.html');
  assert.equal(render.renderSearch(site).path, 'search/index.html');
  assert.equal(render.renderStats(site).path, 'stats/index.html');
  assert.equal(render.renderRequests(site).path, 'requests/index.html');
  assert.equal(render.renderContribute(site).path, 'contribute/index.html');
  assert.equal(render.render404(site).path, '404.html');
}));

test('render: guide page has steps, anchors, checklist, sources and the widget', () => withDemoWidget(() => {
  const site = makeSite('ru');
  const html = render.renderGuide(site, site.guides[0]).html;
  for (let n = 1; n <= 5; n++) assert.match(html, new RegExp(`<li class="[^"]*step[^"]*" id="step-${n}"`));
  assert.match(html, /data-done="5"/);
  assert.match(html, /data-tool="1"/);
  assert.match(html, /class="ill"><svg[^>]* role="img" aria-label="Задняя сторона/);
  assert.match(html, /<body class="[^"]*c-audio/);
  assert.match(html, /href="https:\/\/support\.apple\.com\/ru-ru\/111865" rel="noopener" target="_blank"/);
  assert.match(html, /template=fix-guide\.yml/);
  assert.match(html, /<details class="faq-item"/);
  const malm = render.renderGuide(site, site.guides[1]).html;
  assert.match(malm, /<table class="parts">/);
  assert.match(malm, /<img src="\/showmehow\/furniture\/ikea-malm-3-drawer-assemble\/frame\.webp"[^>]* width="1200" height="800"/);
  assert.match(malm, /data-widget="test-demo"[^>]*><p class="demo">Сделано 3<\/p>/);
  assert.doesNotMatch(malm, /class="faq"/);
}));

test('render: English fallback guide says so and keeps Russian text marked', () => withDemoWidget(() => {
  const site = makeSite('en');
  const html = render.renderGuide(site, site.guides[1]).html;
  assert.match(html, /class="fallback-note"/);
  assert.match(html, /<h1 class="page-title guide-title" lang="ru">/);
  assert.match(html, /<html lang="en"/);
  assert.match(html, /href="\/showmehow\/furniture\/ikea-malm-3-drawer-assemble\/"[^>]*data-lang-switch="ru"/);
}));

test('render: works without a site URL and with the root base', () => withDemoWidget(() => {
  const site = makeSite('ru', { base: '/', siteUrl: '' });
  const html = render.renderHome(site).html;
  assert.doesNotMatch(html, /rel="canonical"/);
  assert.match(html, /href="\/guides\/"/);
}));

test('i18n: ru and en define the same keys and plural forms', () => {
  const ru = Object.keys(STRINGS.ru).sort(), en = Object.keys(STRINGS.en).sort();
  assert.deepEqual(en, ru);
  assert.equal(t('ru', 'count.guides', { n: 1 }), '1 инструкция');
  assert.equal(t('ru', 'count.guides', { n: 3 }), '3 инструкции');
  assert.equal(t('ru', 'count.guides', { n: 11 }), '11 инструкций');
  assert.equal(t('ru', 'count.guides', { n: 22 }), '22 инструкции');
  assert.equal(t('en', 'count.guides', { n: 1 }), '1 guide');
  assert.deepEqual(Object.keys(alertLabels('en')), ['note', 'tip', 'important', 'warning', 'caution']);
  for (const lang of ['ru', 'en']) for (const v of Object.values(STRINGS[lang]).flat()) assert.doesNotMatch(v, EMOJI);
});

// ---------------------------------------------------------------- interactivity (spec 11)

// The AirPods fixture with variants, a timer, a LED, a hotspot and a widget block in a step.
function interactiveSite(lang = 'ru') {
  const site = makeSite(lang);
  const g = site.guides[0];
  g.variants = [{ id: 'with-button', name: 'Кейс с кнопкой' }, { id: 'touch-case', name: 'Сенсорный кейс' }];
  g.steps[1] = { ...g.steps[1], variants: ['with-button'], html: '<p>Держите <button type="button" class="timer" data-seconds="15"><span class="timer-label">15 с</span></button>, индикатор <span class="led led-white led-blink" role="img" aria-label="Мигает белым" data-legend="мигает"></span>.</p>' };
  g.steps[3] = { ...g.steps[3], html: '<div class="variant" data-variant="touch-case"><p class="variant-label">Сенсорный кейс</p><p>Коснитесь.</p></div>\n<div class="widget" data-widget="wifi-qr" data-params="{&quot;security&quot;:&quot;WEP&quot;}"></div>' };
  g.faq = [{ q: 'Индикатор не мигает', aHtml: 'Зарядите кейс.' }, { q: 'Звук в одном ухе', aHtml: 'Переподключите.' }];
  return { site, guide: g };
}

test('render: variants picker, step labels for no-JS and data for the client', () => withDemoWidget(() => {
  const { site, guide } = interactiveSite();
  const html = render.renderGuide(site, guide).html;
  checkPage(site, { path: 'audio/airpods-pair-android/index.html', html });
  assert.match(html, /<div class="variant-picker" data-variant-picker data-js role="group" aria-labelledby="h-variant">/);
  assert.match(html, /data-variant-pick="with-button" aria-pressed="false">Кейс с кнопкой<\/button>/);
  assert.match(html, /data-variant-pick="" aria-pressed="true">Показать всё<\/button>/);
  assert.ok(html.indexOf('data-variant-picker') < html.indexOf('id="step-1"'), 'the picker is above step 1');
  assert.match(html, /<li class="step" id="step-2" data-step="2" data-variants="with-button">/);
  assert.match(html, /<p class="step-for">Только для: Кейс с кнопкой<\/p>/);
  assert.match(html, /<li data-variants="with-button"><a href="#step-2" data-toc="2">/);
  assert.match(html, /<div class="variant" data-variant="touch-case"><p class="variant-label">Сенсорный кейс<\/p>/);
  const plain = render.renderGuide(makeSite('ru'), makeSite('ru').guides[0]).html;
  assert.doesNotMatch(plain, /data-variant-picker|step-for/, 'no picker without variants');
}));

test('render: timer and LED chips pass through; step widgets get their server HTML', () => withDemoWidget(() => {
  const { site, guide } = interactiveSite('en');
  const html = render.renderGuide(site, guide).html;
  checkPage(site, { path: 'audio/airpods-pair-android/index.html', html });
  assert.match(html, /<button type="button" class="timer" data-seconds="15">/);
  assert.match(html, /<span class="led led-white led-blink" role="img" aria-label="[^"]+" data-legend="[^"]+"><\/span>/);
  assert.match(html, /<div class="widget widget-inline" data-widget="wifi-qr" data-widget-client data-params="\{&quot;security&quot;:&quot;WEP&quot;\}"><div class="wgt wgt-wifi">/);
  assert.match(html, /<option value="WEP" selected>/, 'the step widget params reach render()');
  assert.doesNotMatch(html, /<div class="widget" data-widget="wifi-qr" data-params="[^"]*"><\/div>/, 'no empty placeholder left');
  assert.throws(() => render.renderGuide(site, { ...guide, steps: [{ ...guide.steps[0], html: '<div class="widget" data-widget="nope" data-params="{}"></div>' }, ...guide.steps.slice(1)] }), /unknown widget type "nope"/);
}));

test('render: illustrations open enlarged; faq chips with a prefilled "did not help" issue', () => withDemoWidget(() => {
  const { site, guide } = interactiveSite();
  const html = render.renderGuide(site, guide).html;
  assert.match(html, /<figure class="step-fig" data-zoomable><div class="ill"><svg[^>]* role="img" aria-label="[^"]+"[\s\S]*?<\/div><button type="button" class="fig-zoom" data-zoom data-js>[\s\S]*?<span>Увеличить<\/span><\/button><\/figure>/);
  assert.match(html, /data-lightbox-strings data-close="Закрыть"/);
  assert.match(html, /<h2 class="section-title" id="h-faq">Что пошло не так\?<\/h2>/);
  assert.match(html, /<div class="faq-chips" role="group" aria-labelledby="h-faq" data-js><button type="button" class="faq-chip" data-faq-pick="0" aria-expanded="false" aria-controls="faq-0">Индикатор не мигает<\/button>/);
  assert.match(html, /<details class="faq-item" id="faq-1" data-faq-item="1"><summary>Звук в одном ухе/);
  const fix = /<a class="faq-fix" href="([^"]+)"/.exec(html)[1].replace(/&amp;/g, '&');
  const url = new URL(fix);
  assert.equal(url.searchParams.get('template'), 'fix-guide.yml');
  assert.equal(url.searchParams.get('guide'), 'https://wyrtensi.github.io/showmehow/audio/airpods-pair-android/');
  assert.match(url.searchParams.get('problem'), /^Не помогло: «Индикатор не мигает»/);
}));

test('render: completion banner with the burst, share and the next guide on the device', () => withDemoWidget(() => {
  const site = makeSite('ru');
  const first = site.guides[0];
  const other = { ...site.guides[1], slug: 'airpods-reset', path: 'audio/airpods-reset/', title: 'Как сбросить AirPods', device: first.device, category: first.category };
  site.byDevice[first.device.id] = [first, other];
  const html = render.renderGuide(site, first).html;
  assert.match(html, /<div class="done-banner" data-done-banner hidden tabindex="-1" role="status">/);
  assert.match(html, /<svg class="burst" viewBox="0 0 120 120" aria-hidden="true" focusable="false">/);
  assert.match(html, /<a class="done-next" href="\/showmehow\/audio\/airpods-reset\/"><span class="done-next-k">Следующая для этого устройства<\/span><span class="done-next-t">Как сбросить AirPods<\/span>/);
  assert.match(html, /data-done-share data-text="Получилось по инструкции: [^"]+"/);
  site.byDevice[first.device.id] = [first];
  assert.doesNotMatch(render.renderGuide(site, first).html, /class="done-next"/, 'no next link when the device has one guide');
}));

test('render: home finder, continue box and the data island', () => withDemoWidget(() => {
  const site = makeSite('ru');
  const html = render.renderHome(site).html;
  assert.match(html, /<section class="section wrap finder" aria-labelledby="h-finder" data-finder data-js data-catalog="\/showmehow\/guides\/"/);
  assert.match(html, /<h2 class="section-title" id="h-finder">Что у вас\?<\/h2>/);
  assert.match(html, /<input type="radio" name="c" value="audio"><span class="chip">[\s\S]*?<span class="chip-count" data-count-for="audio">1<\/span>/);
  assert.doesNotMatch(html, /name="c" value="kitchen"/, 'empty categories are not offered');
  assert.match(html, /data-finder-step="d" hidden/);
  assert.match(html, /<section class="section wrap continue" aria-labelledby="h-continue" data-continue hidden data-at="Вы остановились на шаге \{n\} из \{total\}"/);
  const island = JSON.parse(/<script type="application\/json" id="smh-home">([\s\S]*?)<\/script>/.exec(html)[1]);
  assert.deepEqual(island.g[0], ['airpods-pair-android', 'audio/airpods-pair-android/', 'Как подключить AirPods к телефону на Android', 'audio', 'earbuds', 'pair', 3]);
  assert.equal(island.d.earbuds, site.devices.find((d) => d.id === 'earbuds').plural);
  assert.equal(island.k.pair, site.tasks.find((k) => k.id === 'pair').name);
}));

test('render: stats bars open the filtered catalog and carry their numbers', () => withDemoWidget(() => {
  const site = makeSite('ru');
  const html = render.renderStats(site).html;
  assert.match(html, /<a class="bar-row c-audio bar-link" href="\/showmehow\/guides\/\?c=audio" aria-describedby="tip-c-audio" data-bar>/);
  assert.match(html, /<span class="bar-tip" role="tooltip" id="tip-c-audio">1 инструкция, 33% от всех<\/span>/);
  assert.match(html, /href="\/showmehow\/guides\/\?k=pair"/);
  assert.match(html, /href="\/showmehow\/guides\/\?d=earbuds"/);
  assert.match(html, /href="\/showmehow\/guides\/\?b=apple"/);
  assert.match(html, /<a class="legend-link" href="\/showmehow\/guides\/\?f=easy"/);
  assert.match(html, /<span class="bar-row c-kitchen is-zero">/, 'a category without guides is not a link');
}));

// ---- category subcategories, device hub, machine breadcrumbs (spec 5.2) ----------------------

// Seven model guides of one device from three brands plus one for any brand: enough for a hub.
function hubSite() {
  const site = makeSite('ru');
  const base = site.guides[0];
  const brand = (id) => site.brands.find((b) => b.id === id);
  const make = (i, brandId) => ({
    ...base, slug: `earbuds-model-${i}`, path: `audio/earbuds-model-${i}/`, title: `Как пользоваться моделью ${i}`, brands: [brand(brandId)],
    widget: { type: 'test-meta', params: { n: i }, placement: 'start' }, label: `${brand(brandId).name} M${i}`
  });
  const models = [make(1, 'apple'), make(2, 'apple'), make(3, 'samsung'), make(4, 'samsung'), make(5, 'xiaomi'), make(6, 'xiaomi'), make(7, 'xiaomi')];
  const any = { ...base, slug: 'earbuds-any', path: 'audio/earbuds-any/', title: 'Как почистить любые наушники', brands: [brand('generic')], widget: null };
  site.guides = [...site.guides, ...models, any];
  site.byDevice[base.device.id] = [base, ...models, any];
  site.byCategory.audio = site.guides.filter((g) => g.category.id === 'audio');
  base.device.count = site.byDevice[base.device.id].length;
  return { site, device: base.device, models };
}

function withMetaWidget(fn) {
  widgets['test-meta'] = {
    render: () => '<p>panel</p>', validate: () => [], client: false,
    meta: (params) => ({ label: `M${params.n}`, facet: { key: 'x', label: 'Управление', id: params.n % 2 ? 'mechanical' : 'electronic', name: params.n % 2 ? 'Механика' : 'Электроника' }, partial: params.n === 5 })
  };
  try {
    return withDemoWidget(fn);
  } finally {
    delete widgets['test-meta'];
  }
}

test('render: category page shows device tiles first and guides grouped by device', () => withMetaWidget(() => {
  const { site, device } = hubSite();
  const html = render.renderCategory(site, site.categories.find((c) => c.id === 'audio')).html;
  assert.doesNotMatch(html, /data-faceted/, 'no facet filters on the category page');
  const tiles = html.indexOf('class="sub-tiles"');
  const group = html.indexOf('class="section wrap device-group"');
  assert.ok(tiles > 0 && group > tiles, 'tiles come before the groups');
  assert.match(html, new RegExp(`<a class="sub-tile" href="/showmehow/device/${device.id}/">`));
  assert.match(html, /<a class="sub-tile is-empty" href="\/showmehow\/requests\/\?device=/, 'a device without guides links to a prefilled request');
  const section = html.slice(group, html.indexOf('</section>', group));
  assert.equal((section.match(/<article class="gcard/g) || []).length, 3, 'three cards per device group');
  assert.match(section, /Все 9/, '"All N" links to the device page');
  assert.ok(section.includes('earbuds-any'), 'guides for any brand come first');
}));

test('render: a device with many models from several brands is a hub grouped by brand', () => withMetaWidget(() => {
  const { site, device } = hubSite();
  const html = render.renderDevice(site, device).html;
  assert.match(html, /<section class="section wrap hub" data-hub/);
  const generic = html.indexOf('id="h-generic"');
  assert.ok(generic > 0 && generic < html.indexOf('data-hub'), '"for any model" sits above the models');
  assert.equal((html.match(/data-hub-group/g) || []).length, 3, 'one group per brand');
  assert.match(html, /data-hub-key="b" data-hub-val="samsung" aria-pressed="false">Samsung<span class="chip-count">2<\/span>/);
  assert.match(html, /data-hub-key="x" data-hub-val="electronic"/, 'the widget facet becomes a filter');
  assert.match(html, /<span class="model-name">M5<\/span>.*?<span class="model-partial">данные неполные<\/span>/s);
  const small = makeSite('ru');
  assert.doesNotMatch(render.renderDevice(small, small.devices[0]).html, /data-hub/, 'a small device keeps the plain list');
}));

test('render: a machine guide breadcrumb ends with its short name and passes the device', () => withMetaWidget(() => {
  const { site, models } = hubSite();
  const html = render.renderGuide(site, models[0]).html;
  const start = html.indexOf('<nav class="crumbs"');
  const nav = html.slice(start, html.indexOf('</nav>', start));
  assert.match(nav, /href="\/showmehow\/device\/earbuds\/"/);
  assert.match(nav, /<span aria-current="page">Apple M1<\/span>/);
  const ld = [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)].map((m) => JSON.parse(m[1])).find((o) => o['@type'] === 'BreadcrumbList');
  assert.deepEqual(ld.itemListElement.map((i) => i.name).slice(-2), [models[0].device.plural || models[0].device.name, 'Apple M1']);
}));
