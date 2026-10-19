import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import {
  buildIndex,
  createSearcher,
  damerauLevenshtein,
  fixLayout,
  normalize,
  phonetic,
  stem,
  tokenize
} from '../../src/lib/search.js';

const root = new URL('../../', import.meta.url);
const readJson = (path) => JSON.parse(readFileSync(new URL(path, root), 'utf8'));
const synonyms = readJson('data/synonyms.json');

// ---------------------------------------------------------------- synthetic guides (docs/spec.md section 7)

const cat = (id, name) => ({ id, name });
const CATS = {
  audio: cat('audio', 'Наушники и колонки'),
  network: cat('network', 'Роутеры и интернет'),
  computers: cat('computers', 'Компьютеры и принтеры'),
  furniture: cat('furniture', 'Мебель'),
  kitchen: cat('kitchen', 'Кухня'),
  appliances: cat('appliances', 'Бытовая техника'),
  phones: cat('phones', 'Телефоны и часы'),
  tv: cat('tv', 'ТВ и приставки'),
  bikes: cat('bikes', 'Велосипеды и самокаты')
};
const DEVS = {
  earbuds: { id: 'earbuds', name: 'Беспроводные наушники-вкладыши', aliases: ['tws', 'вкладыши'] },
  speaker: { id: 'speaker', name: 'Портативная колонка', aliases: ['bluetooth speaker'] },
  router: { id: 'router', name: 'Wi-Fi роутер', aliases: [] },
  printer: { id: 'printer', name: 'Принтер', aliases: ['мфу'] },
  drawers: { id: 'chest-of-drawers', name: 'Комод', aliases: [] },
  coffee: { id: 'coffee-machine', name: 'Кофемашина', aliases: [] },
  washer: { id: 'washing-machine', name: 'Стиральная машина', aliases: [] },
  band: { id: 'fitness-band', name: 'Фитнес-браслет', aliases: [] },
  bicycle: { id: 'bicycle', name: 'Велосипед', aliases: [] },
  vacuum: { id: 'robot-vacuum', name: 'Робот-пылесос', aliases: [] },
  gamepad: { id: 'gamepad', name: 'Геймпад', aliases: ['джойстик'] }
};
const BRANDS = {
  apple: { id: 'apple', name: 'Apple', aliases: [] },
  jbl: { id: 'jbl', name: 'JBL', aliases: [] },
  tplink: { id: 'tp-link', name: 'TP-Link', aliases: [] },
  canon: { id: 'canon', name: 'Canon', aliases: ['кэнон'] },
  ikea: { id: 'ikea', name: 'IKEA', aliases: [] },
  delonghi: { id: 'delonghi', name: 'DeLonghi', aliases: [] },
  bosch: { id: 'bosch', name: 'Bosch', aliases: [] },
  xiaomi: { id: 'xiaomi', name: 'Xiaomi', aliases: [] },
  samsung: { id: 'samsung', name: 'Samsung', aliases: [] },
  roborock: { id: 'roborock', name: 'Roborock', aliases: [] },
  sony: { id: 'sony', name: 'Sony', aliases: [] },
  generic: { id: 'generic', name: 'Универсальный', aliases: [] }
};
const TASKS = {
  pair: { id: 'pair', name: 'Подключение', verb: 'Подключить' },
  setup: { id: 'setup', name: 'Настройка', verb: 'Настроить' },
  assemble: { id: 'assemble', name: 'Сборка', verb: 'Собрать' },
  reset: { id: 'reset', name: 'Сброс', verb: 'Сбросить' },
  maintain: { id: 'maintain', name: 'Уход и чистка', verb: 'Почистить' }
};

function guide(o) {
  const steps = (o.steps || ['Первый шаг', 'Второй шаг', 'Третий шаг']).map((title, i) => ({ n: i + 1, id: `step-${i + 1}`, title }));
  return {
    slug: o.slug,
    path: `${o.category.id}/${o.slug}/`,
    category: o.category,
    device: o.device,
    brands: o.brands,
    task: o.task,
    models: o.models || [],
    difficulty: o.difficulty || 'easy',
    time: o.time || 5,
    title: o.title,
    summary: o.summary || 'Короткое описание руководства для проверки поиска.',
    tools: o.tools || [],
    aliases: o.aliases || [],
    steps,
    updated: o.updated || '2026-10-01',
    stats: { steps: steps.length }
  };
}

const GUIDES = [
  guide({
    slug: 'airpods-pair-android', category: CATS.audio, device: DEVS.earbuds, brands: [BRANDS.apple], task: TASKS.pair,
    title: 'Как подключить AirPods к телефону на Android', models: ['AirPods 2', 'AirPods Pro 2'],
    aliases: ['эйрподс андроид'], steps: ['Включите Bluetooth', 'Откройте кейс', 'Зажмите кнопку на кейсе', 'Выберите наушники в списке'],
    tools: ['Телефон на Android']
  }),
  guide({
    slug: 'jbl-flip-pair', category: CATS.audio, device: DEVS.speaker, brands: [BRANDS.jbl], task: TASKS.pair,
    title: 'Как подключить колонку JBL Flip по Bluetooth', steps: ['Включите колонку', 'Нажмите кнопку Bluetooth']
  }),
  guide({
    slug: 'samsung-buds-pair', category: CATS.audio, device: DEVS.earbuds, brands: [BRANDS.samsung], task: TASKS.pair,
    title: 'Как подключить Samsung Galaxy Buds к телефону', models: ['Galaxy Buds 2']
  }),
  guide({
    slug: 'router-first-setup', category: CATS.network, device: DEVS.router, brands: [BRANDS.tplink], task: TASKS.setup,
    title: 'Как настроить Wi-Fi роутер TP-Link с нуля', difficulty: 'medium', time: 20, updated: '2026-10-05',
    steps: ['Подключите кабель провайдера', 'Откройте страницу настроек', 'Задайте имя сети и пароль', 'Сохраните настройки']
  }),
  guide({
    slug: 'router-reset', category: CATS.network, device: DEVS.router, brands: [BRANDS.tplink], task: TASKS.reset,
    title: 'Как сбросить роутер до заводских настроек', time: 4, updated: '2026-10-07',
    steps: ['Найдите кнопку Reset', 'Зажмите кнопку на десять секунд']
  }),
  guide({
    slug: 'printer-wifi', category: CATS.computers, device: DEVS.printer, brands: [BRANDS.canon], task: TASKS.pair,
    title: 'Как подключить принтер Canon к Wi-Fi', difficulty: 'medium', tools: ['Компьютер или телефон']
  }),
  guide({
    slug: 'malm-assemble', category: CATS.furniture, device: DEVS.drawers, brands: [BRANDS.ikea], task: TASKS.assemble,
    title: 'Как собрать комод IKEA MALM с тремя ящиками', difficulty: 'hard', time: 90, models: ['MALM 3'],
    steps: ['Разложите детали', 'Соберите каркас', 'Прикрутите направляющие', 'Вставьте ящики', 'Закрепите комод у стены'],
    tools: ['Крестовая отвёртка PH2', 'Молоток']
  }),
  guide({
    slug: 'descale-coffee-machine', category: CATS.kitchen, device: DEVS.coffee, brands: [BRANDS.delonghi], task: TASKS.maintain,
    title: 'Как удалить накипь из кофемашины DeLonghi', time: 30, updated: '2026-10-10'
  }),
  guide({
    slug: 'clean-coffee-machine', category: CATS.kitchen, device: DEVS.coffee, brands: [BRANDS.generic], task: TASKS.maintain,
    title: 'Как почистить кофемашину раз в месяц', time: 15,
    steps: ['Снимите поддон', 'Удалите накипь', 'Промойте контейнер']
  }),
  guide({
    slug: 'washing-machine-clean', category: CATS.appliances, device: DEVS.washer, brands: [BRANDS.bosch], task: TASKS.maintain,
    title: 'Как почистить стиральную машину Bosch', summary: 'Очистка барабана, манжеты и фильтра от налёта и запаха.'
  }),
  guide({
    slug: 'mi-band-pair', category: CATS.phones, device: DEVS.band, brands: [BRANDS.xiaomi], task: TASKS.pair,
    title: 'Как подключить фитнес-браслет к телефону', models: ['Mi Band 8']
  }),
  guide({
    slug: 'bike-assemble', category: CATS.bikes, device: DEVS.bicycle, brands: [BRANDS.generic], task: TASKS.assemble,
    title: 'Как собрать велосипед из коробки', difficulty: 'medium', time: 60
  }),
  guide({
    slug: 'roborock-reset', category: CATS.appliances, device: DEVS.vacuum, brands: [BRANDS.roborock], task: TASKS.reset,
    title: 'Как сбросить робот-пылесос Roborock', time: 6
  }),
  guide({
    slug: 'dualsense-tv', category: CATS.tv, device: DEVS.gamepad, brands: [BRANDS.sony], task: TASKS.pair,
    title: 'Как подключить геймпад PlayStation к телевизору', models: ['DualSense']
  })
];

const index = buildIndex(GUIDES, { lang: 'ru' }, synonyms);
const searcher = createSearcher(index);
const bare = createSearcher(index, []); // no synonyms: isolates transliteration, layout and typos

const slugs = (results) => results.map((r) => r.slug);
const top = (s, q, options) => s.search(q, options)[0]?.slug;

// ---------------------------------------------------------------- text helpers

test('search: normalisation folds case, ё, diacritics and punctuation, keeps й', () => {
  assert.equal(normalize('Ёлка, Café!  (Wi-Fi)'), 'елка cafe wi fi');
  assert.equal(normalize('Йога'), 'йога');
  assert.deepEqual(tokenize('Wi-Fi роутер'), ['wi', 'fi', 'wifi', 'роутер']);
});

test('search: stemming of Russian endings and English plurals', () => {
  assert.equal(stem('наушники'), stem('наушников'));
  assert.equal(stem('наушники'), stem('наушник'));
  assert.equal(stem('подключить'), stem('подключение'));
  assert.equal(stem('подключения'), stem('подключиться'));
  assert.equal(stem('кнопками'), stem('кнопка'));
  assert.equal(stem('мышь'), 'мышь'); // stem must stay at least 4 characters
  assert.equal(stem('devices'), stem('device'));
  assert.equal(stem('headphones'), stem('headphone'));
  assert.equal(stem('boxes'), stem('box'));
  assert.equal(stem('pairing'), stem('paired'));
  assert.equal(stem('glass'), 'glass');
});

test('search: wrong layout, both directions', () => {
  assert.equal(fixLayout('yfeiybrb'), 'наушники');
  assert.equal(fixLayout('ghbynth'), 'принтер');
  assert.equal(fixLayout('hjenth'), 'роутер');
  assert.equal(fixLayout('фшкзщвы'), 'airpods');
  assert.equal(fixLayout('cdz;b'), 'свяжи');
  assert.equal(fixLayout('l;jqcnbr'), 'джойстик');
  assert.equal(fixLayout('12345'), null);
});

test('search: phonetic key unifies Russian and Latin spellings', () => {
  const pairs = [['эирподс', 'airpods'], ['принтер', 'printer'], ['роутер', 'router'], ['самсунг', 'samsung'], ['сони', 'sony'], ['тплинк', 'tplink']];
  for (const [ru, lat] of pairs) assert.equal(phonetic(ru), phonetic(lat), `${ru} vs ${lat}`);
  assert.notEqual(phonetic('принтер'), phonetic('роутер'));
});

test('search: Damerau-Levenshtein', () => {
  assert.equal(damerauLevenshtein('airpods', 'airpods'), 0);
  assert.equal(damerauLevenshtein('airpods', 'airpodz'), 1);
  assert.equal(damerauLevenshtein('airpods', 'aripods'), 1); // transposition
  assert.equal(damerauLevenshtein('kitten', 'sitting'), 3);
  assert.ok(damerauLevenshtein('abcdef', 'uvwxyz', 2) > 2);
});

// ---------------------------------------------------------------- index

test('search: index is plain JSON and survives a round trip', () => {
  const copy = JSON.parse(JSON.stringify(index));
  const a = createSearcher(copy).search('подключить телефон');
  const b = searcher.search('подключить телефон');
  assert.deepEqual(a, b);
  assert.equal(copy.docs.length, GUIDES.length);
  const doc = copy.docs.find((d) => d.s === 'airpods-pair-android');
  for (const key of ['s', 'p', 't', 'u', 'c', 'd', 'b', 'k', 'f', 'm']) assert.ok(doc[key] !== undefined, key);
  assert.deepEqual(doc.b, ['apple']);
  assert.equal(copy.tx.c.audio, 'Наушники и колонки');
  assert.equal(copy.syn.length, synonyms.length);
});

// ---------------------------------------------------------------- matching

test('search: exact words and stemmed forms', () => {
  assert.equal(top(searcher, 'airpods'), 'airpods-pair-android');
  assert.equal(top(searcher, 'комод'), 'malm-assemble');
  assert.equal(top(searcher, 'комода'), 'malm-assemble');
  assert.ok(slugs(searcher.search('наушников')).includes('airpods-pair-android'));
  assert.deepEqual(searcher.search(''), []);
  assert.deepEqual(searcher.search('   '), []);
});

test('search: prefix matching from two characters', () => {
  assert.equal(top(searcher, 'airp'), 'airpods-pair-android');
  assert.equal(top(searcher, 'кофем'), 'descale-coffee-machine');
  assert.ok(slugs(searcher.search('ро')).includes('router-reset'));
  const exact = searcher.search('airpods')[0].score;
  const prefix = searcher.search('airpo')[0].score;
  assert.ok(prefix < exact, 'prefix scores below exact');
});

test('search: typos of one and two edits', () => {
  assert.equal(top(bare, 'airpodz'), 'airpods-pair-android'); // substitution
  assert.equal(top(bare, 'aripods'), 'airpods-pair-android'); // transposition
  assert.equal(top(bare, 'колнка'), 'jbl-flip-pair'); // deletion in a 6-letter word
  assert.equal(top(bare, 'принтре'), 'printer-wifi'); // transposition-like, 7 letters
  assert.equal(top(bare, 'комоод'), 'malm-assemble'); // insertion
  assert.deepEqual(bare.search('qzxwv'), []);
  const exact = bare.search('airpods')[0].score;
  const typo = bare.search('airpodz')[0].score;
  assert.ok(typo < exact);
});

test('search: wrong keyboard layout in both directions', () => {
  assert.ok(slugs(bare.search('yfeiybrb')).includes('airpods-pair-android')); // наушники
  assert.equal(top(bare, 'ghbynth'), 'printer-wifi'); // принтер
  assert.ok(slugs(bare.search('hjenth')).includes('router-reset')); // роутер
  assert.equal(top(bare, 'фшкзщвы'), 'airpods-pair-android'); // airpods typed in Russian layout
  assert.equal(top(bare, 'ыфьыгтп'), 'samsung-buds-pair'); // samsung
  assert.equal(top(bare, 'rjkjyrf'), 'jbl-flip-pair'); // колонка
  assert.equal(top(bare, 'L;JQCNBR'), 'dualsense-tv'); // джойстик: the ж sits on the semicolon key
});

test('search: transliteration in both directions', () => {
  assert.equal(top(bare, 'эирподс'), 'airpods-pair-android');
  assert.equal(top(bare, 'эйрподс'), 'airpods-pair-android');
  assert.equal(top(bare, 'printer'), 'printer-wifi');
  assert.equal(top(bare, 'самсунг'), 'samsung-buds-pair');
  assert.equal(top(bare, 'тплинк'), 'router-first-setup');
  assert.equal(top(bare, 'ikea'), 'malm-assemble');
  assert.equal(top(bare, 'икеа'), 'malm-assemble');
  assert.equal(top(bare, 'кэнон'), 'printer-wifi'); // brand alias
  assert.equal(top(bare, 'canon'), 'printer-wifi');
});

test('search: transliteration works without aliases and synonyms', () => {
  const base = { category: CATS.audio, device: DEVS.earbuds, task: TASKS.pair };
  const lone = createSearcher(
    buildIndex(
      [
        guide({ ...base, slug: 'only-airpods', brands: [BRANDS.apple], title: 'Как подключить AirPods' }),
        guide({ ...base, slug: 'only-printer', category: CATS.computers, device: { id: 'x', name: 'Устройство' }, brands: [BRANDS.generic], title: 'Как настроить printer' }),
        guide({ ...base, slug: 'only-router', category: CATS.network, device: { id: 'y', name: 'Устройство' }, brands: [BRANDS.generic], title: 'Как сбросить роутер' })
      ],
      {},
      []
    ),
    []
  );
  assert.equal(top(lone, 'эирподс'), 'only-airpods');
  assert.equal(top(lone, 'аирподс'), 'only-airpods');
  assert.equal(top(lone, 'эйрподс'), 'only-airpods');
  assert.equal(top(lone, 'принтер'), 'only-printer');
  assert.equal(top(lone, 'принтеры'), 'only-printer');
  assert.equal(top(lone, 'router'), 'only-router');
  assert.equal(top(lone, 'роутеры'), 'only-router');
  assert.equal(lone.search('xiaomi').length, 0); // not an accident: unrelated words stay unmatched
});

test('search: brand spellings and synonyms from data/synonyms.json', () => {
  assert.equal(top(searcher, 'сяоми'), 'mi-band-pair'); // only the synonym group links it to Xiaomi
  assert.equal(top(searcher, 'ксиаоми'), 'mi-band-pair');
  assert.equal(top(bare, 'сяоми'), undefined);
  assert.ok(slugs(searcher.search('уши')).includes('airpods-pair-android'));
  assert.ok(slugs(searcher.search('headphones')).includes('samsung-buds-pair'));
  assert.ok(slugs(searcher.search('маршрутизатор')).includes('router-reset'));
  assert.ok(slugs(searcher.search('вайфай')).includes('router-first-setup'));
  assert.ok(slugs(searcher.search('обнулить')).includes('router-reset'));
  assert.ok(slugs(searcher.search('factory reset')).includes('router-reset'));
  assert.ok(slugs(searcher.search('спарить')).includes('jbl-flip-pair'));
  assert.ok(slugs(searcher.search('pair')).includes('jbl-flip-pair'));
  assert.ok(slugs(searcher.search('descale')).includes('descale-coffee-machine'));
  assert.ok(slugs(searcher.search('накипь')).includes('clean-coffee-machine'));
  assert.ok(slugs(searcher.search('assemble')).includes('bike-assemble'));
  assert.ok(slugs(searcher.search('блютус колонка')).includes('jbl-flip-pair'));
});

test('search: hyphenated words match with and without the hyphen', () => {
  assert.ok(slugs(bare.search('wifi')).includes('router-first-setup'));
  assert.ok(slugs(bare.search('wi-fi')).includes('printer-wifi'));
  assert.ok(slugs(bare.search('wi fi')).includes('printer-wifi'));
  assert.ok(slugs(bare.search('tp-link')).includes('router-reset'));
  assert.ok(slugs(bare.search('tplink')).includes('router-reset'));
});

test('search: all words must match (AND), otherwise OR with partial: true', () => {
  const both = searcher.search('роутер сбросить');
  assert.equal(both[0].slug, 'router-reset');
  assert.ok(both.every((r) => r.partial === false));
  assert.deepEqual(slugs(both), ['router-reset']);

  const or = searcher.search('роутер кофемашина');
  assert.ok(or.length >= 2);
  assert.ok(or.every((r) => r.partial === true));
  assert.ok(slugs(or).includes('router-reset') && slugs(or).includes('clean-coffee-machine'));

  const junk = searcher.search('роутер qzxwvk');
  assert.ok(junk.length > 0 && junk.every((r) => r.partial === true));
  const anded = searcher.search('роутер настроить');
  assert.equal(anded[0].slug, 'router-first-setup');
  assert.ok(!anded[0].partial);
  assert.deepEqual(searcher.search('qzxwvk'), []);
});

test('search: stop words do not break a natural-language query', () => {
  assert.equal(top(searcher, 'как подключить airpods к андроид'), 'airpods-pair-android');
  assert.equal(top(searcher, 'how to pair airpods'), 'airpods-pair-android');
  assert.ok(searcher.search('как').length === 0 || searcher.search('как').every((r) => r.partial === false));
});

// ---------------------------------------------------------------- ranking

test('search: a title hit beats a step-title hit', () => {
  const r = searcher.search('накипь');
  assert.equal(r[0].slug, 'descale-coffee-machine');
  assert.ok(r.findIndex((x) => x.slug === 'clean-coffee-machine') > 0);
  const byTitle = r.find((x) => x.slug === 'descale-coffee-machine');
  const bySteps = r.find((x) => x.slug === 'clean-coffee-machine');
  assert.ok(byTitle.score > bySteps.score);
  assert.ok(byTitle.matched.includes('title'));
  assert.ok(bySteps.matched.includes('steps'));
  assert.ok(!bySteps.matched.includes('title'));
});

test('search: field weights order brand, device and summary hits', () => {
  const r = searcher.search('bosch');
  assert.equal(r[0].slug, 'washing-machine-clean');
  assert.ok(r[0].matched.includes('brand') || r[0].matched.includes('title'));
  const summaryOnly = searcher.search('манжеты');
  assert.equal(summaryOnly[0].slug, 'washing-machine-clean');
  assert.deepEqual(summaryOnly[0].matched, ['summary']);
  assert.ok(summaryOnly[0].score < searcher.search('bosch')[0].score);
});

test('search: ties go to fewer steps, then newer', () => {
  const base = { category: CATS.audio, device: DEVS.speaker, brands: [BRANDS.jbl], task: TASKS.pair, title: 'Как подключить квазар' };
  const set = [
    guide({ ...base, slug: 'quasar-long', steps: ['а1', 'б2', 'в3', 'г4', 'д5'], updated: '2026-10-09' }),
    guide({ ...base, slug: 'quasar-old', steps: ['а1', 'б2', 'в3'], updated: '2026-09-01' }),
    guide({ ...base, slug: 'quasar-new', steps: ['а1', 'б2', 'в3'], updated: '2026-10-09' })
  ];
  const s = createSearcher(buildIndex(set, {}, []));
  assert.deepEqual(slugs(s.search('квазар')), ['quasar-new', 'quasar-old', 'quasar-long']);
});

test('search: results carry slug, path, title, summary, score, matched', () => {
  const [r] = searcher.search('airpods');
  assert.equal(r.slug, 'airpods-pair-android');
  assert.equal(r.path, 'audio/airpods-pair-android/');
  assert.equal(r.title, 'Как подключить AirPods к телефону на Android');
  assert.ok(r.summary.length > 10);
  assert.ok(r.score > 0);
  assert.ok(Array.isArray(r.matched) && r.matched.length > 0);
  assert.equal(searcher.search('подключить', { limit: 3 }).length, 3);
});

// ---------------------------------------------------------------- filters

test('search: facet filters by category, device, brand, task, difficulty', () => {
  const all = searcher.search('подключить', { limit: 50 });
  assert.ok(all.length >= 6);
  const network = searcher.search('настройки', { filters: { category: 'network' } });
  assert.ok(network.length > 0 && network.every((r) => r.path.startsWith('network/')));
  assert.deepEqual(slugs(searcher.search('подключить', { filters: { device: 'printer' } })), ['printer-wifi']);
  assert.deepEqual(slugs(searcher.search('подключить', { filters: { brand: 'sony' } })), ['dualsense-tv']);
  assert.ok(slugs(searcher.search('подключить', { filters: { task: 'pair' } })).length >= 6);
  assert.deepEqual(slugs(searcher.search('подключить', { filters: { task: 'reset' } })), []);
  const medium = searcher.search('подключить', { filters: { difficulty: 'medium' } });
  assert.deepEqual(slugs(medium).sort(), ['printer-wifi', 'router-first-setup']);
  const multi = searcher.search('подключить', { filters: { category: ['audio', 'tv'], brand: ['jbl', 'sony'] } });
  assert.deepEqual(slugs(multi).sort(), ['dualsense-tv', 'jbl-flip-pair']);
  const combined = searcher.search('подключить', { filters: { category: 'audio', difficulty: 'hard' } });
  assert.deepEqual(combined, []);
});

test('search: filters alone list matching guides, newest first', () => {
  const r = searcher.search('', { filters: { category: 'kitchen' } });
  assert.deepEqual(slugs(r), ['descale-coffee-machine', 'clean-coffee-machine']);
  assert.deepEqual(searcher.search('', { filters: {} }), []);
  assert.equal(searcher.search('', { filters: { difficulty: 'hard' } })[0].slug, 'malm-assemble');
});

// ---------------------------------------------------------------- suggest

test('search: suggest completes the last word and offers titles', () => {
  const a = searcher.suggest('airp');
  assert.equal(a[0], 'airpods');
  assert.ok(a.includes('Как подключить AirPods к телефону на Android'));
  const b = searcher.suggest('как подкл');
  assert.ok(b[0].startsWith('как подключ'), b[0]);
  assert.ok(searcher.suggest('yfeiy').includes('наушники'));
  assert.deepEqual(searcher.suggest(''), []);
  assert.ok(searcher.suggest('роутер').every((s) => typeof s === 'string'));
  assert.ok(searcher.suggest('роутер').length <= 8);
});

// ---------------------------------------------------------------- data/synonyms.json

test('search: synonyms file is well formed and covers the taxonomy', () => {
  assert.ok(Array.isArray(synonyms) && synonyms.length >= 80, `${synonyms.length} groups`);
  for (const group of synonyms) {
    assert.ok(Array.isArray(group) && group.length >= 2, JSON.stringify(group));
    for (const term of group) assert.ok(typeof term === 'string' && term === term.trim() && term.length > 0);
  }
  const grouped = new Set();
  for (const group of synonyms) for (const term of group) for (const t of tokenize(term)) grouped.add(stem(t));
  const covered = (...texts) => texts.flat().filter(Boolean).some((text) => tokenize(text).some((t) => grouped.has(stem(t))));
  for (const t of readJson('taxonomy/tasks.json')) assert.ok(covered(t.ru.name, t.ru.verb, t.en.name, t.en.verb), `task ${t.id}`);
  for (const c of readJson('taxonomy/categories.json')) assert.ok(covered(c.ru.name, c.en.name), `category ${c.id}`);
  for (const d of readJson('taxonomy/devices.json')) {
    assert.ok(covered(d.ru.name, d.ru.plural, d.en.name, d.en.plural, d.aliases), `device ${d.id}`);
  }
  const some = (word) => synonyms.some((g) => g.some((t) => stem(t) === stem(word)));
  for (const word of ['спарить', 'подключить', 'соединить', 'pair', 'connect', 'сбросить', 'обнулить', 'reset', 'наушники', 'уши', 'headphones', 'earbuds', 'роутер', 'маршрутизатор', 'вайфай', 'router', 'wifi', 'собрать', 'сборка', 'assemble', 'почистить', 'чистка', 'накипь', 'descale', 'clean', 'сяоми', 'xiaomi']) {
    assert.ok(some(word), word);
  }
});

// ---------------------------------------------------------------- performance (2000 guides)

function mulberry32(seed) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function syntheticCorpus(count) {
  const rand = mulberry32(20261019);
  const syl = ['ба', 'ве', 'го', 'да', 'же', 'зу', 'ки', 'ла', 'мо', 'ну', 'по', 'ре', 'си', 'ту', 'фе', 'ха', 'це', 'чи', 'шу', 'ра', 'ти', 'ко', 'ль', 'ми', 'на', 'ст', 'вр', 'ск'];
  const endings = ['', '', 'а', 'ы', 'ов', 'ами', 'ить', 'ение', 'ный'];
  const pool = new Set();
  while (pool.size < 6000) {
    let word = '';
    for (let n = 2 + Math.floor(rand() * 3); n > 0; n--) word += syl[Math.floor(rand() * syl.length)];
    pool.add(word + endings[Math.floor(rand() * endings.length)]);
  }
  const words = [...pool];
  const pick = () => words[Math.floor(words.length * rand() ** 1.6)];
  const phrase = (n) => Array.from({ length: n }, pick).join(' ');
  const cats = readJson('taxonomy/categories.json');
  const devices = readJson('taxonomy/devices.json');
  const brands = readJson('taxonomy/brands.json');
  const tasks = readJson('taxonomy/tasks.json');
  const catById = Object.fromEntries(cats.map((c) => [c.id, { id: c.id, name: c.ru.name }]));
  const guides = [];
  for (let i = 0; i < count; i++) {
    const dev = devices[i % devices.length];
    const brand = brands[Math.floor(rand() * brands.length)];
    const task = tasks[Math.floor(rand() * tasks.length)];
    const stepCount = 5 + Math.floor(rand() * 8);
    guides.push(
      guide({
        slug: `guide-${i}`,
        category: catById[dev.category],
        device: { id: dev.id, name: dev.ru.name, aliases: dev.aliases },
        brands: [{ id: brand.id, name: brand.name, aliases: brand.aliases || [] }],
        task: { id: task.id, name: task.ru.name, verb: task.ru.verb },
        title: `Как ${task.ru.verb.toLowerCase()} ${dev.ru.name.toLowerCase()} ${brand.name} ${phrase(2)}`,
        summary: `${phrase(6)}. ${phrase(8)}, ${phrase(7)}.`,
        models: [`${pick()} ${i % 9}`, `${pick()} Pro`],
        aliases: [phrase(2), phrase(2), phrase(1)],
        tools: [phrase(2), phrase(3), phrase(2)],
        steps: Array.from({ length: stepCount }, () => phrase(3 + Math.floor(rand() * 2))),
        difficulty: ['easy', 'medium', 'hard'][i % 3],
        time: 3 + (i % 60),
        updated: `2026-${String(1 + (i % 10)).padStart(2, '0')}-${String(1 + (i % 27)).padStart(2, '0')}`
      })
    );
  }
  return { guides, pick, rand, words };
}

test('search: 2000 guides - index under 1.5 MB, median query under 10 ms', () => {
  const { guides, pick } = syntheticCorpus(2000);

  const started = performance.now();
  const idx = buildIndex(guides, { lang: 'ru' }, synonyms);
  const json = JSON.stringify(idx);
  const buildMs = performance.now() - started;
  assert.ok(json.length < 1_500_000, `index is ${json.length} bytes`);

  const loaded = performance.now();
  const s = createSearcher(JSON.parse(json));
  const loadMs = performance.now() - loaded;

  const swap = (w) => (w.length > 5 ? w.slice(0, 2) + w[3] + w[2] + w.slice(4) : w + w[w.length - 1]);
  const queries = [
    'подключить наушники', 'airpods', 'роутер сбросить', 'yfeiybrb', 'ghbynth', 'эирподс', 'сяоми', 'как собрать комод',
    'wifi', 'принтер canon', 'маршрутизатор', 'накипь', 'headphones pair', 'кофемашина bosch', 'настроить', 'bluetooth колонка',
    'xyzqq роутер', 'сброс', 'ро', 'airpodz'
  ];
  for (let i = 0; i < 12; i++) {
    const w = pick();
    queries.push(w, swap(w), `${w} ${pick()}`, w.slice(0, 4));
  }
  for (let i = 0; i < 4; i++) queries.push(`${pick()} ${pick()} ${pick()}`);

  for (const q of queries) s.search(q); // warm up
  const times = [];
  for (let round = 0; round < 3; round++) {
    for (const q of queries) {
      const t = performance.now();
      s.search(q, { limit: 20 });
      times.push(performance.now() - t);
    }
  }
  times.sort((a, b) => a - b);
  const median = times[Math.floor(times.length / 2)];
  const p95 = times[Math.floor(times.length * 0.95)];
  console.log(
    `  search perf (2000 guides): index ${json.length} bytes, build ${buildMs.toFixed(0)} ms, load ${loadMs.toFixed(0)} ms, ` +
      `median ${median.toFixed(2)} ms, p95 ${p95.toFixed(2)} ms, max ${times[times.length - 1].toFixed(2)} ms`
  );
  assert.ok(median < 10, `median ${median.toFixed(2)} ms`);

  // The big index still finds things.
  const g = guides[137];
  assert.equal(s.search(g.title, { limit: 1 })[0].slug, g.slug);
});
