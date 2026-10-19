// Search for Show Me How: index builder (Node, at build time) and query engine (browser and Node).
// No Node APIs here. Contract: docs/spec.md section 8.
//
// Index shape (JSON):
//   { v, lang, w, voc: [token], docs: [{s,p,t,u,c,d,b,k,f,m,n,y,tok}], tx: {c,d,b,k}, syn: [[term]] }
// tok maps a field to a string of fixed-width base-92 ids into voc (w characters per token), which
// keeps 2000 guides far below the size budget. Taxonomy names are not repeated per guide: the
// engine derives device / brand / category / task tokens from the ids and the tx tables.

const FIELDS = ['title', 'aliases', 'brand', 'device', 'category', 'task', 'steps', 'summary', 'tools'];
const WEIGHTS = [10, 8, 8, 6, 4, 4, 3, 2, 1];
const TOK_FIELD = { t: 0, a: 1, m: 2, s: 6, u: 7, l: 8 };

const F_EXACT = 1;
const F_PREFIX = 0.8;
const F_TYPO = 0.55;
const F_LAYOUT = 0.9;
const F_PHONETIC = 0.85;
const F_SYNONYM = 0.85;
const OR_PENALTY = 0.5;

const STOP = new Set(
  ('как в во на к ко с со и или по для из от до за у о об а ' +
    'the an to of in on for and or how my your with from is are can do')
    .split(' ')
);

const CHUNK = /[^\p{L}\p{N}\-‐‑]+/u;
const INNER_PUNCT = /[a-z][;'[\],.`]+[a-z]/;

// ---------------------------------------------------------------- normalisation

export function fold(text) {
  return String(text ?? '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/й/g, '\u0001')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\u0001/g, 'й');
}

export function normalize(text) {
  return fold(text).replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

function splitWord(chunk) {
  const parts = chunk.split(/[\-‐‑]+/u).filter(Boolean);
  const joined = parts.length > 1 && parts[0].length <= 3 ? parts.join('') : null;
  return { parts, joined };
}

// Tokens of a text: normalised words; a hyphenated word also yields its joined form
// when the first part is short ("wi-fi" -> wi, fi, wifi).
export function tokenize(text) {
  const out = [];
  for (const chunk of fold(text).split(CHUNK)) {
    if (!chunk) continue;
    const { parts, joined } = splitWord(chunk);
    for (const p of parts) out.push(p);
    if (joined) out.push(joined);
  }
  return out;
}

function keep(token) {
  return token.length <= 32 && (token.length >= 2 || /\d/.test(token)) && !STOP.has(token);
}

const indexTokens = (text) => tokenize(text).filter(keep);

// ---------------------------------------------------------------- stemming

const RU_SUFFIXES = (
  'ениями ениям ениях ением ении ения ение ений аниями аниям аниях анием ании ания ание аний ' +
  'ыми ими ами ями ого его ому ему ать ять ить еть уть ают яют ает яет ует уют ите ете ишь ешь ьте йте ' +
  'ов ев ей ах ях ом ем ой ый ий ая яя ое ее ые ие ых их ую юю ым им ть ут ют ат ят ит ет ла ли ло ' +
  'ы и а я у ю е о ь й'
)
  .split(' ')
  .sort((a, b) => b.length - a.length);

function stemRu(word) {
  let w = word;
  if (/(ся|сь)$/.test(w) && w.length - 2 >= 4) w = w.slice(0, -2);
  for (const suffix of RU_SUFFIXES) {
    if (w.endsWith(suffix) && w.length - suffix.length >= 4) return w.slice(0, -suffix.length);
  }
  return w;
}

function undouble(w) {
  const n = w.length;
  return n > 1 && w[n - 1] === w[n - 2] && !'lsz'.includes(w[n - 1]) ? w.slice(0, -1) : w;
}

function stemEn(word) {
  let w = word;
  if (w.length > 3) {
    if (w.length > 4 && w.endsWith('ies')) w = w.slice(0, -3) + 'y';
    else if (/(ches|shes|xes|sses|zes)$/.test(w)) w = w.slice(0, -2);
    else if (w.endsWith('s') && !/(ss|us|is)$/.test(w)) w = w.slice(0, -1);
  }
  if (w.endsWith('ing') && w.length - 3 >= 4) w = undouble(w.slice(0, -3));
  else if (w.endsWith('ed') && w.length - 2 >= 4) w = undouble(w.slice(0, -2));
  if (w.length > 4 && w.endsWith('e')) w = w.slice(0, -1);
  return w;
}

export function stem(word) {
  if (/^[Ѐ-ӿ]+$/.test(word)) return stemRu(word);
  if (/^[a-z]+$/.test(word)) return stemEn(word);
  return word;
}

// ---------------------------------------------------------------- transliteration and layout

const RU2LAT = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l',
  м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch',
  ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya'
};

// Russian -> Latin transliteration (ё is already folded to е).
export function toLatin(text) {
  let out = '';
  for (const ch of String(text)) out += RU2LAT[ch] ?? ch;
  return out;
}

const KEYS_EN = "qwertyuiop[]asdfghjkl;'zxcvbnm,.`";
const KEYS_RU = 'йцукенгшщзхъфывапролджэячсмитьбюё';
const EN2RU = new Map([...KEYS_EN].map((ch, i) => [ch, KEYS_RU[i]]));
const RU2EN = new Map([...KEYS_RU].map((ch, i) => [ch, KEYS_EN[i]]));

// Text typed on the wrong keyboard layout, converted back: "ghbynth" -> "принтер", "фшкзщвы" -> "airpods".
// Returns null when the text has no letters to convert.
export function fixLayout(text) {
  const s = String(text).toLowerCase();
  const toRu = /[a-z]/.test(s);
  if (!toRu && !/[Ѐ-ӿ]/.test(s)) return null;
  const map = toRu ? EN2RU : RU2EN;
  let out = '';
  for (const ch of s) out += map.get(ch) ?? ch;
  return out === s ? null : out;
}

// Phonetic key: Cyrillic and Latin spellings of one sound sequence collapse to the same key
// ("эирподс" and "airpods", "принтер" and "printer", "самсунг" and "samsung").
export function phonetic(word) {
  let s = toLatin(String(word));
  s = s
    .replace(/shch|sch/g, 'S')
    .replace(/sh/g, 'S')
    .replace(/tch|ch/g, 'C')
    .replace(/ph/g, 'f')
    .replace(/ck/g, 'k')
    .replace(/kh/g, 'h')
    .replace(/th/g, 't')
    .replace(/zh/g, 'J')
    .replace(/c(?=[eiy])/g, 's')
    .replace(/c/g, 'k')
    .replace(/x/g, 'ks')
    .replace(/q/g, 'k')
    .replace(/w/g, 'v')
    .replace(/y/g, 'i')
    .replace(/[ae]i/g, 'ai')
    .replace(/ee/g, 'i')
    .replace(/oo/g, 'u')
    .replace(/(.)\1+/g, '$1');
  return s;
}

// Damerau-Levenshtein distance (optimal string alignment); returns max + 1 as soon as it is exceeded.
export function damerauLevenshtein(a, b, max = Infinity) {
  const n = a.length;
  const m = b.length;
  if (Math.abs(n - m) > max) return max + 1;
  if (!n) return m;
  if (!m) return n;
  let prev2 = null;
  let prev = new Array(m + 1);
  for (let j = 0; j <= m; j++) prev[j] = j;
  for (let i = 1; i <= n; i++) {
    const cur = new Array(m + 1);
    cur[0] = i;
    let rowMin = i;
    for (let j = 1; j <= m; j++) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      let v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      if (prev2 && i > 1 && j > 1 && cost && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        v = Math.min(v, prev2[j - 2] + 1);
      }
      cur[j] = v;
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > max) return max + 1;
    prev2 = prev;
    prev = cur;
  }
  return prev[m];
}

// ---------------------------------------------------------------- id packing

// Printable ASCII without the double quote and the backslash: stored as is inside a JSON string.
let ALPHABET = '';
for (let c = 33; c < 127; c++) if (c !== 34 && c !== 92) ALPHABET += String.fromCharCode(c);
const BASE = ALPHABET.length;
const ALPHA_INDEX = new Map([...ALPHABET].map((ch, i) => [ch, i]));

function widthFor(count) {
  let w = 1;
  for (let cap = BASE; count > cap; cap *= BASE) w += 1;
  return w;
}

function packIds(ids, w) {
  let out = '';
  for (const id of ids) {
    let part = '';
    let n = id;
    for (let i = 0; i < w; i++) {
      part = ALPHABET[n % BASE] + part;
      n = Math.floor(n / BASE);
    }
    out += part;
  }
  return out;
}

function unpackIds(str, w) {
  const out = [];
  for (let i = 0; i + w <= str.length; i += w) {
    let n = 0;
    for (let k = 0; k < w; k++) n = n * BASE + ALPHA_INDEX.get(str[i + k]);
    out.push(n);
  }
  return out;
}

// ---------------------------------------------------------------- index builder

const asObject = (value, list) =>
  value && typeof value === 'object'
    ? value
    : (list || []).find((x) => x.id === value) || { id: value, name: String(value) };

// guides: Guide objects of one language (docs/spec.md section 7); site: that language's Site (optional,
// used to resolve taxonomy ids); synonyms: data/synonyms.json, embedded so the browser needs one file.
export function buildIndex(guides, site = {}, synonyms = []) {
  const voc = [];
  const vid = new Map();
  const tx = { c: {}, d: {}, b: {}, k: {} };
  const staged = [];

  const idOf = (token) => {
    let id = vid.get(token);
    if (id === undefined) {
      id = voc.length;
      vid.set(token, id);
      voc.push(token);
    }
    return id;
  };

  for (const g of guides) {
    const cat = asObject(g.category, site.categories);
    const dev = asObject(g.device, site.devices);
    const brands = (g.brands || []).map((b) => asObject(b, site.brands));
    const task = asObject(g.task, site.tasks);

    tx.c[cat.id] ??= cat.name;
    if (!tx.d[dev.id]) {
      tx.d[dev.id] = { n: dev.name };
      if (dev.plural) tx.d[dev.id].p = dev.plural;
      if (dev.aliases?.length) tx.d[dev.id].a = dev.aliases;
    }
    for (const b of brands) {
      if (tx.b[b.id]) continue;
      tx.b[b.id] = { n: b.name };
      if (b.aliases?.length) tx.b[b.id].a = b.aliases;
    }
    if (!tx.k[task.id]) {
      tx.k[task.id] = { n: task.name };
      if (task.verb) tx.k[task.id].v = task.verb;
    }

    // A token is stored once per guide, in the heaviest field that holds it.
    const seen = new Set();
    const field = (texts) => {
      const ids = [];
      for (const text of texts) {
        for (const token of indexTokens(text)) {
          if (seen.has(token)) continue;
          seen.add(token);
          ids.push(idOf(token));
        }
      }
      return ids;
    };
    const steps = g.steps || [];
    const tok = {
      t: field([g.title]),
      a: field(g.aliases || []),
      m: field(g.models || []),
      s: field(steps.map((s) => s.title)),
      u: field([g.summary]),
      l: field(g.tools || [])
    };

    staged.push({
      doc: {
        s: g.slug,
        p: g.path,
        t: g.title,
        u: g.summary,
        c: cat.id,
        d: dev.id,
        b: brands.map((b) => b.id),
        k: task.id,
        f: g.difficulty,
        m: g.time,
        n: g.stats?.steps ?? steps.length,
        y: g.updated || ''
      },
      tok
    });
  }

  const w = widthFor(voc.length);
  const docs = staged.map(({ doc, tok }) => {
    const packed = {};
    for (const [key, ids] of Object.entries(tok)) if (ids.length) packed[key] = packIds(ids, w);
    return { ...doc, tok: packed };
  });

  const syn = (synonyms || []).filter((group) => Array.isArray(group) && group.length > 1);
  return { v: 1, lang: site.lang || '', w, voc, docs, tx, syn };
}

// ---------------------------------------------------------------- searcher

export function createSearcher(index, synonyms) {
  const docs = index.docs || [];
  const N = docs.length;
  const tx = index.tx || { c: {}, d: {}, b: {}, k: {} };
  const w = index.w || 1;

  // Vocabulary keyed by stem. postings[sid] holds (doc << 4 | field) numbers.
  const stems = [];
  const postings = [];
  const stemSid = new Map();
  const rawSid = new Map();

  const sidOfStem = (st) => {
    let sid = stemSid.get(st);
    if (sid === undefined) {
      sid = stems.length;
      stemSid.set(st, sid);
      stems.push(st);
      postings.push([]);
    }
    return sid;
  };
  const sidOfRaw = (raw) => {
    let sid = rawSid.get(raw);
    if (sid === undefined) {
      sid = sidOfStem(stem(raw));
      rawSid.set(raw, sid);
    }
    return sid;
  };

  const vocSid = (index.voc || []).map(sidOfRaw);

  for (let d = 0; d < N; d++) {
    const tok = docs[d].tok || {};
    for (const key in tok) {
      const field = TOK_FIELD[key];
      if (field === undefined) continue;
      for (const id of unpackIds(tok[key], w)) postings[vocSid[id]].push((d << 4) | field);
    }
  }

  // Taxonomy tokens (device, brand, category, task) come from the tx tables.
  const taxSids = (texts) => {
    const set = new Set();
    for (const text of texts) for (const token of indexTokens(text)) set.add(sidOfRaw(token));
    return [...set];
  };
  const taxCache = { c: {}, d: {}, b: {}, k: {} };
  const taxFor = (kind, id) => {
    const cache = taxCache[kind];
    if (cache[id]) return cache[id];
    const item = tx[kind]?.[id];
    let texts = [];
    if (typeof item === 'string') texts = [item];
    else if (item) texts = [item.n, item.p, item.v, ...(item.a || [])].filter(Boolean);
    return (cache[id] = taxSids(texts));
  };
  for (let d = 0; d < N; d++) {
    const doc = docs[d];
    for (const sid of taxFor('d', doc.d)) postings[sid].push((d << 4) | 3);
    for (const sid of taxFor('c', doc.c)) postings[sid].push((d << 4) | 4);
    for (const sid of taxFor('k', doc.k)) postings[sid].push((d << 4) | 5);
    const brandSids = new Set();
    for (const b of doc.b || []) for (const sid of taxFor('b', b)) brandSids.add(sid);
    for (const sid of brandSids) postings[sid].push((d << 4) | 2);
  }

  // Lookup structures.
  const rawSorted = [...rawSid.keys()].sort();
  const byLen = new Map();
  for (let sid = 0; sid < stems.length; sid++) {
    const len = stems[sid].length;
    if (!byLen.has(len)) byLen.set(len, []);
    byLen.get(len).push(sid);
  }

  // Phonetic keys of the raw words and of the stems, so "эирподс" finds "airpods" and "принтеры" finds "printer".
  const addTo = (map, key, value) => {
    let set = map.get(key);
    if (!set) map.set(key, (set = new Set()));
    set.add(value);
  };
  const phonKeys = (...texts) => {
    const keys = new Set();
    for (const text of texts) if (text.length >= 3) keys.add(phonetic(text));
    return keys;
  };
  const phonMap = new Map();
  for (const [raw, sid] of rawSid) for (const key of phonKeys(raw, stems[sid])) addTo(phonMap, key, sid);

  // Synonym groups: member stems, looked up by stem or by phonetic key of the term.
  const groups = [];
  const synByStem = new Map();
  const synByPhon = new Map();
  for (const group of synonyms || index.syn || []) {
    const gi = groups.length;
    const members = new Set();
    for (const term of group) {
      for (const chunk of fold(term).split(CHUNK)) {
        if (!chunk) continue;
        const { parts, joined } = splitWord(chunk);
        const word = joined || (parts.length === 1 ? parts[0] : null);
        if (!word) continue; // multi-word terms are not supported
        const st = stem(word);
        members.add(st);
        addTo(synByStem, st, gi);
        for (const key of phonKeys(word, st)) addTo(synByPhon, key, gi);
      }
    }
    groups.push([...members]);
  }

  // ------------------------------------------------------------ matching

  const addHit = (hits, sid, f) => {
    if (sid !== undefined && f > (hits.get(sid) || 0)) hits.set(sid, f);
  };

  const lowerBound = (prefix) => {
    let lo = 0;
    let hi = rawSorted.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (rawSorted[mid] < prefix) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  };

  const typoHits = (hits, form, f) => {
    const L = form.word.length;
    const k = L >= 7 ? 2 : L >= 4 ? 1 : 0;
    const st = form.stem;
    if (!k || st.length < 3) return;
    for (let len = st.length - k; len <= st.length + k; len++) {
      const bucket = byLen.get(len);
      if (!bucket) continue;
      for (const sid of bucket) {
        if (damerauLevenshtein(st, stems[sid], k) <= k) addHit(hits, sid, f);
      }
    }
  };

  const formHits = (hits, form, f) => {
    const st = form.stem;
    addHit(hits, stemSid.get(st), f * F_EXACT);
    if (st.length >= 2) {
      for (let i = lowerBound(st); i < rawSorted.length && rawSorted[i].startsWith(st); i++) {
        addHit(hits, rawSid.get(rawSorted[i]), f * F_PREFIX);
      }
    }
    const keys = phonKeys(form.word, st);
    for (const key of keys) for (const sid of phonMap.get(key) || []) addHit(hits, sid, f * F_PHONETIC);
    const gs = new Set(synByStem.get(st));
    for (const key of keys) for (const gi of synByPhon.get(key) || []) gs.add(gi);
    for (const gi of gs) for (const m of groups[gi]) addHit(hits, stemSid.get(m), f * F_SYNONYM);
  };

  const cache = new Map();
  const resolve = (slot) => {
    const key = slot.word + '\u0000' + slot.alts.map((a) => a.word).join('\u0000');
    const cached = cache.get(key);
    if (cached) return cached;
    const hits = new Map();
    formHits(hits, slot, 1);
    for (const alt of slot.alts) formHits(hits, alt, F_LAYOUT);
    if (!hits.size) {
      typoHits(hits, slot, F_TYPO);
      for (const alt of slot.alts) typoHits(hits, alt, F_TYPO * F_LAYOUT);
    }
    if (cache.size > 400) cache.clear();
    cache.set(key, hits);
    return hits;
  };

  // ------------------------------------------------------------ query parsing

  const makeForm = (word) => ({ word, stem: stem(word) });
  const layoutAlts = (word, raw) => {
    const alts = [];
    for (const source of [word, raw]) {
      const fixed = source && fixLayout(source);
      if (!fixed) continue;
      const norm = normalize(fixed).replace(/ /g, '');
      if (norm.length >= 2 && norm !== word && !alts.some((a) => a.word === norm)) alts.push(makeForm(norm));
    }
    return alts;
  };

  const parseQuery = (query) => {
    const slots = [];
    const seen = new Set();
    const push = (word, raw) => {
      if (!word || seen.has(word)) return;
      seen.add(word);
      slots.push({ ...makeForm(word), alts: layoutAlts(word, raw) });
    };
    const all = [];
    for (const raw of String(query ?? '').toLowerCase().split(/\s+/)) {
      if (!raw) continue;
      if (INNER_PUNCT.test(raw) && /^[a-z;'[\],.`\-]+$/.test(raw)) {
        all.push({ word: normalize(raw).replace(/ /g, ''), raw });
        continue;
      }
      for (const chunk of fold(raw).split(CHUNK)) {
        if (!chunk) continue;
        const { parts, joined } = splitWord(chunk);
        if (joined && rawSid.has(joined)) all.push({ word: joined, raw: parts.length === 1 ? raw : '' });
        else for (const p of parts) all.push({ word: p, raw: parts.length === 1 ? raw : '' });
      }
    }
    const useful = all.filter((x) => keep(x.word));
    for (const x of useful.length ? useful : all) push(x.word, x.raw);
    return slots;
  };

  // ------------------------------------------------------------ filters

  const asList = (v) => (Array.isArray(v) ? v : v ? [v] : []);
  const buildAllowed = (filters) => {
    if (!filters) return null;
    const c = asList(filters.category);
    const d = asList(filters.device);
    const b = asList(filters.brand);
    const k = asList(filters.task);
    const f = asList(filters.difficulty);
    if (!c.length && !d.length && !b.length && !k.length && !f.length) return null;
    const allowed = new Uint8Array(N);
    for (let i = 0; i < N; i++) {
      const doc = docs[i];
      allowed[i] =
        (!c.length || c.includes(doc.c)) &&
        (!d.length || d.includes(doc.d)) &&
        (!b.length || (doc.b || []).some((x) => b.includes(x))) &&
        (!k.length || k.includes(doc.k)) &&
        (!f.length || f.includes(doc.f))
          ? 1
          : 0;
    }
    return allowed;
  };

  // ------------------------------------------------------------ search

  const present = (i, score, mask, partial) => {
    const doc = docs[i];
    const matched = [];
    for (let f = 0; f < FIELDS.length; f++) if (mask & (1 << f)) matched.push(FIELDS[f]);
    return {
      slug: doc.s,
      path: doc.p,
      title: doc.t,
      summary: doc.u,
      score: Math.round(score * 1000) / 1000,
      matched,
      partial
    };
  };

  const byRank = (a, b) =>
    b.score - a.score ||
    (docs[a.i].n || 0) - (docs[b.i].n || 0) ||
    (docs[b.i].y > docs[a.i].y ? 1 : docs[b.i].y < docs[a.i].y ? -1 : 0) ||
    (docs[a.i].s < docs[b.i].s ? -1 : 1);

  function search(query, { limit = 20, filters } = {}) {
    const allowed = buildAllowed(filters);
    const slots = parseQuery(query);

    if (!slots.length) {
      if (!allowed) return [];
      const rows = [];
      for (let i = 0; i < N; i++) if (allowed[i]) rows.push({ i, score: 0 });
      rows.sort((a, b) => (docs[b.i].y > docs[a.i].y ? 1 : docs[b.i].y < docs[a.i].y ? -1 : 0) || (docs[a.i].s < docs[b.i].s ? -1 : 1));
      return rows.slice(0, limit).map((r) => present(r.i, 0, 0, false));
    }

    const S = slots.length;
    const best = [];
    const rest = [];
    const mask = [];
    const hitCount = new Uint8Array(N);
    for (const slot of slots) {
      const b = new Float32Array(N);
      const sum = new Float32Array(N);
      const m = new Uint16Array(N);
      for (const [sid, f] of resolve(slot)) {
        const list = postings[sid];
        for (let i = 0; i < list.length; i++) {
          const p = list[i];
          const d = p >> 4;
          if (allowed && !allowed[d]) continue;
          const field = p & 15;
          const v = WEIGHTS[field] * f;
          sum[d] += v;
          if (v > b[d]) b[d] = v;
          m[d] |= 1 << field;
        }
      }
      for (let d = 0; d < N; d++) if (b[d] > 0) hitCount[d] += 1;
      best.push(b);
      rest.push(sum);
      mask.push(m);
    }

    const collect = (needed, penalty) => {
      const rows = [];
      for (let d = 0; d < N; d++) {
        if (hitCount[d] < needed || !hitCount[d]) continue;
        let total = 0;
        let union = 0;
        let allTitle = true;
        for (let s = 0; s < S; s++) {
          const b = best[s][d];
          if (!b) {
            allTitle = false;
            continue;
          }
          total += b + 0.1 * Math.min(rest[s][d] - b, b);
          union |= mask[s][d];
          if (!(mask[s][d] & 1)) allTitle = false;
        }
        if (allTitle) total *= 1.2;
        rows.push({ i: d, score: total * penalty, mask: union });
      }
      return rows;
    };

    let partial = false;
    let rows = collect(S, 1);
    if (!rows.length) {
      partial = true;
      rows = collect(1, OR_PENALTY);
    }
    rows.sort(byRank);
    return rows.slice(0, limit).map((r) => present(r.i, r.score, r.mask, partial));
  }

  // ------------------------------------------------------------ suggest

  function suggest(query, limit = 8) {
    const text = String(query ?? '');
    if (!text.trim()) return [];
    const out = [];
    const push = (s) => {
      if (s && !out.includes(s) && out.length < limit) out.push(s);
    };

    if (!/\s$/.test(text)) {
      const head = text.replace(/\S+$/, '');
      const last = text.slice(head.length);
      const prefixes = new Set();
      const norm = normalize(last).replace(/ /g, '');
      if (norm.length >= 2) prefixes.add(norm);
      const fixed = fixLayout(last);
      if (fixed) {
        const nf = normalize(fixed).replace(/ /g, '');
        if (nf.length >= 2) prefixes.add(nf);
      }
      const found = new Map();
      for (const prefix of prefixes) {
        for (let i = lowerBound(prefix); i < rawSorted.length && rawSorted[i].startsWith(prefix); i++) {
          const raw = rawSorted[i];
          if (raw === prefix || raw.length > 24) continue;
          found.set(raw, postings[rawSid.get(raw)].length);
        }
      }
      const words = [...found.entries()].sort((a, b) => b[1] - a[1] || a[0].length - b[0].length).slice(0, 4);
      for (const [raw] of words) push(head + raw);
    }

    for (const r of search(text, { limit: limit })) push(r.title);
    return out;
  }

  return { search, suggest };
}
