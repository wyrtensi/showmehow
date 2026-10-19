// Guide and taxonomy validation (docs/spec.md 4.5). Every issue is {file, line, message};
// file paths are relative to the content root with forward slashes.
import { readFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { readContent, loadWidgets, imageSize, IMAGE_EXT, PHOTO_EXT } from './model.js';
import { checkSvg } from './svg.js';
import { plainText, renderInline, DEFAULT_LABELS } from './markdown.js';

export const RESERVED_IDS = ['en', 'device', 'brand', 'task', 'guides', 'stats', 'requests', 'contribute', 'search', 'assets', 'api'];
export const FIELDS = {
  title: true, summary: true, category: true, device: true, brands: true, models: false, task: true,
  difficulty: true, time: true, tools: false, parts: false, aliases: false, sources: true, faq: false,
  updated: true, authors: true, widget: false, variants: false, draft: false
};
export const EN_FIELDS = ['title', 'summary', 'tools', 'parts', 'aliases', 'faq', 'sources', 'variants'];
export const DIFFICULTY = ['easy', 'medium', 'hard'];
const ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const EMOJI = /[\p{Extended_Pictographic}\u{FE0F}]/u;
const LOGIN = /^[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}$/;
const MAX_PHOTO = 300 * 1024;
const MAX_PHOTO_WIDTH = 1600;

// Reads and validates everything under root. opts: {codeRoot (for src/icons), widgets, content}
export async function checkAll(root, opts = {}) {
  const content = opts.content || (await readContent(root));
  const widgets = opts.widgets || (await loadWidgets());
  const result = await validateContent(content, { ...opts, widgets });
  return { ...result, content };
}

export async function validateContent(content, opts = {}) {
  const errors = [];
  const warnings = [];
  const add = (level, file, line, message) => (level === 'error' ? errors : warnings).push({ file, line: line || 1, message });
  for (const p of content.problems || []) add(p.level, p.file, p.line, p.message);
  const tax = validateTaxonomy(content.taxonomy, { add, codeRoot: opts.codeRoot });
  const slugs = new Map();
  for (const entry of content.guides) {
    await validateGuide(entry, { add, tax, widgets: opts.widgets || {}, slugs, root: content.root });
  }
  const order = (a, b) => (a.file < b.file ? -1 : a.file > b.file ? 1 : a.line - b.line);
  return { errors: errors.sort(order), warnings: warnings.sort(order) };
}

// Line of each top-level array element in a JSON text.
export function jsonEntryLines(text) {
  const lines = [];
  let depth = 0;
  let line = 1;
  let inString = false;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (c === '\n') line += 1;
    if (inString) {
      if (c === '\\') i += 1;
      else if (c === '"') inString = false;
      continue;
    }
    if (c === '"') inString = true;
    else if (c === '[' || c === '{') {
      if (depth === 1) lines.push(line);
      depth += 1;
    } else if (c === ']' || c === '}') depth -= 1;
  }
  return lines;
}

function scanEmoji(text, file, add) {
  String(text).split('\n').forEach((row, k) => {
    const m = EMOJI.exec(row);
    if (m) add('error', file, k + 1, `emoji or pictographic character "${m[0]}" is not allowed`);
  });
}

const isStr = (v) => typeof v === 'string' && v.trim() !== '';
const isHttps = (v) => typeof v === 'string' && /^https:\/\/[^\s/]+\.[^\s]+$/.test(v);

export function validateTaxonomy(taxonomy, { add, codeRoot } = {}) {
  const ids = {};
  for (const [name, entry] of Object.entries(taxonomy)) {
    const file = entry.file;
    ids[name] = new Map();
    if (entry.error) { add('error', file, entry.error.line, entry.error.message); continue; }
    scanEmoji(entry.text, file, add);
    const lines = jsonEntryLines(entry.text);
    entry.data.forEach((item, k) => {
      const line = lines[k] || 1;
      if (!item || typeof item !== 'object' || Array.isArray(item)) { add('error', file, line, 'each entry must be an object'); return; }
      const label = item.id ? `"${item.id}"` : `entry ${k + 1}`;
      if (typeof item.id !== 'string' || !ID.test(item.id)) add('error', file, line, `${label}: id must be kebab-case [a-z0-9-]`);
      else if (ids[name].has(item.id)) add('error', file, line, `duplicate id "${item.id}" (first at line ${ids[name].get(item.id).line})`);
      else ids[name].set(item.id, { item, line });
      const names = (keys) => {
        for (const lang of ['ru', 'en']) {
          for (const key of keys) {
            if (!item[lang] || !isStr(item[lang][key])) add('error', file, line, `${label}: ${lang}.${key} is required`);
          }
        }
      };
      if (name === 'categories') {
        names(['name']);
        for (const lang of ['ru', 'en']) if (item[lang] && !isStr(item[lang].desc)) add('warning', file, line, `${label}: ${lang}.desc is missing`);
        if (RESERVED_IDS.includes(item.id)) add('error', file, line, `${label}: "${item.id}" is a reserved path and cannot be a category id`);
        if (typeof item.hue !== 'number' || item.hue < 0 || item.hue > 360) add('error', file, line, `${label}: hue must be a number 0-360`);
        if (!isStr(item.icon) || !ID.test(item.icon)) add('error', file, line, `${label}: icon must be an icon file name without .svg`);
        else if (codeRoot && !existsSync(join(codeRoot, 'src', 'icons', `${item.icon}.svg`))) add('warning', file, line, `${label}: icon src/icons/${item.icon}.svg does not exist`);
        if (item.featured !== undefined) {
          if (!Array.isArray(item.featured)) add('error', file, line, `${label}: featured must be a list`);
          else item.featured.forEach((f, j) => {
            if (!f || !isHttps(f.url)) add('error', file, line, `${label}: featured[${j}].url must be https://`);
            for (const lang of ['ru', 'en']) if (!f || !f[lang] || !isStr(f[lang].title)) add('error', file, line, `${label}: featured[${j}].${lang}.title is required`);
          });
        }
        unknownKeys(item, ['id', 'hue', 'icon', 'ru', 'en', 'featured']);
      } else if (name === 'devices') {
        names(['name']);
        unknownKeys(item, ['id', 'category', 'ru', 'en', 'aliases']);
      } else if (name === 'brands') {
        if (!isStr(item.name)) add('error', file, line, `${label}: name is required`);
        for (const lang of ['ru', 'en']) if (item[lang] !== undefined && (!item[lang] || !isStr(item[lang].name))) add('error', file, line, `${label}: ${lang}.name must be a non-empty string`);
        if (item.site !== undefined && !isHttps(item.site)) add('error', file, line, `${label}: site must be an https:// URL`);
        unknownKeys(item, ['id', 'name', 'aliases', 'site', 'ru', 'en']);
      } else if (name === 'tasks') {
        names(['name']);
        for (const lang of ['ru', 'en']) if (item[lang] && !isStr(item[lang].verb)) add('warning', file, line, `${label}: ${lang}.verb is missing`);
        unknownKeys(item, ['id', 'ru', 'en']);
      }
      if (item.aliases !== undefined && (!Array.isArray(item.aliases) || item.aliases.some((a) => !isStr(a)))) add('error', file, line, `${label}: aliases must be a list of strings`);
      function unknownKeys(obj, allowed) {
        for (const key of Object.keys(obj)) if (!allowed.includes(key)) add('warning', file, line, `${label}: unknown key "${key}"`);
      }
    });
  }
  const devices = taxonomy.devices ? taxonomy.devices.data : [];
  const lines = taxonomy.devices && !taxonomy.devices.error ? jsonEntryLines(taxonomy.devices.text) : [];
  devices.forEach((d, k) => {
    if (d && d.id && !ids.categories.has(d.category)) add('error', taxonomy.devices.file, lines[k], `"${d.id}": unknown category "${d.category}"`);
  });
  const map = (name) => new Map([...ids[name]].map(([id, v]) => [id, v.item]));
  return { categories: map('categories'), devices: map('devices'), brands: map('brands'), tasks: map('tasks') };
}

async function validateGuide(entry, ctx) {
  const { add, tax, widgets, slugs } = ctx;
  const rel = entry.rel;
  if (!tax.categories.has(entry.category)) add('error', rel, 1, `folder "${entry.category}" is not a category id from taxonomy/categories.json`);
  if (!ID.test(entry.slug)) add('error', rel, 1, `slug "${entry.slug}" must be kebab-case [a-z0-9-]`);
  if (entry.slug.length > 60) add('error', rel, 1, `slug is ${entry.slug.length} characters, at most 60`);
  if (slugs.has(entry.slug)) add('error', rel, 1, `duplicate slug "${entry.slug}", also in ${slugs.get(entry.slug)}`);
  else slugs.set(entry.slug, rel);

  for (const name of entry.files) {
    if (/\.(md|svg)$/i.test(name)) {
      const text = await readFile(join(entry.dir, name), 'utf8');
      scanEmoji(text, `${rel}/${name}`, add);
      text.split('\n').forEach((row, k) => {
        const m = /__[A-Z][A-Z_]*__/.exec(row);
        if (m) add('error', `${rel}/${name}`, k + 1, `template placeholder ${m[0]} is not filled in`);
      });
    } else if (!IMAGE_EXT.test(name)) add('warning', `${rel}/${name}`, 1, 'unexpected file in a guide folder');
  }
  for (const name of entry.files) {
    if (/\.md$/i.test(name) && !/^index\.(ru|en)\.md$/.test(name)) add('warning', `${rel}/${name}`, 1, 'only index.ru.md and index.en.md are read');
  }

  const ru = entry.docs.ru;
  if (!ru) { add('error', rel, 1, 'index.ru.md is missing (Russian is required)'); return; }
  if (ru.error) add('error', ru.file, ru.error.line, ru.error.message);
  const en = entry.docs.en;
  if (en && en.error) add('error', en.file, en.error.line, en.error.message);

  const used = new Set();
  const svgChecked = new Map();
  let ruImages = null;
  if (!ru.error) {
    validateFields(ru, 'ru', entry, ctx);
    ruImages = await validateBody(ru, entry, ctx, used, svgChecked);
  }
  if (en && !en.error) {
    validateFields(en, 'en', entry, ctx);
    const enImages = await validateBody(en, entry, ctx, used, svgChecked);
    if (ruImages) {
      if (enImages.length !== ruImages.length) {
        add('error', en.file, en.bodyLine, `English has ${enImages.length} steps, Russian has ${ruImages.length}; they must match`);
      } else {
        enImages.forEach((img, k) => {
          if (img !== ruImages[k]) add('error', en.file, en.split.steps[k].line, `step ${k + 1} uses ${img || 'no image'} but the Russian step uses ${ruImages[k] || 'no image'}`);
          const tag = (s) => (s.variants ? [...s.variants].sort().join(',') : '');
          const enTag = tag(en.split.steps[k]);
          const ruTag = tag(ru.split.steps[k]);
          if (enTag !== ruTag) add('error', en.file, en.split.steps[k].line, `step ${k + 1} is for ${enTag ? `{variant=${enTag}}` : 'every variant'} but the Russian step is for ${ruTag ? `{variant=${ruTag}}` : 'every variant'}`);
        });
      }
    }
    if (!ru.error) compareIgnored(ru, en, add);
  }
  for (const name of entry.files) {
    if (IMAGE_EXT.test(name) && !used.has(name)) add('warning', `${rel}/${name}`, 1, 'image is not used by any step');
  }

  function validateFields(doc, lang, entry, ctx) {
    const d = doc.data;
    const L = (key) => doc.lines[key] || 1;
    const err = (key, msg) => add('error', doc.file, L(key), msg);
    const warn = (key, msg) => add('warning', doc.file, L(key), msg);
    for (const key of Object.keys(d)) if (!Object.hasOwn(FIELDS, key)) err(key, `unknown field "${key}"`);
    const required = lang === 'ru' ? Object.keys(FIELDS).filter((k) => FIELDS[k]) : ['title', 'summary'];
    for (const key of required) if (d[key] === undefined || d[key] === null) add('error', doc.file, 1, `required field "${key}" is missing`);
    const has = (key) => d[key] !== undefined && d[key] !== null;

    const text = (key, min, max) => {
      if (!has(key)) return;
      if (typeof d[key] !== 'string') return err(key, `${key} must be text`);
      const len = [...d[key].trim()].length;
      if (len < min || len > max) err(key, `${key} is ${len} characters, expected ${min}-${max}`);
    };
    const strList = (key, { min = 0 } = {}) => {
      if (!has(key)) return;
      if (!Array.isArray(d[key])) return err(key, `${key} must be a list, e.g. [a, b]`);
      if (d[key].length < min) err(key, `${key} needs at least ${min} item${min > 1 ? 's' : ''}`);
      d[key].forEach((v, k) => {
        if (typeof v === 'boolean' || (typeof v === 'string' && !v.trim())) add('error', doc.file, doc.lines[`${key}.${k}`] || L(key), `${key}: item ${k + 1} must be text`);
      });
    };
    const mapList = (key, fields, { min = 0, max = Infinity } = {}) => {
      if (!has(key)) return [];
      if (!Array.isArray(d[key])) { err(key, `${key} must be a block list of "  - key: value" items`); return []; }
      if (d[key].length < min) err(key, `${key} needs at least ${min} item${min > 1 ? 's' : ''}`);
      if (d[key].length > max) err(key, `${key} has ${d[key].length} items, at most ${max}`);
      return d[key].map((item, k) => {
        const line = doc.lines[`${key}.${k}`] || L(key);
        if (!item || typeof item !== 'object') { add('error', doc.file, line, `${key}: item ${k + 1} must be a map like "  - ${Object.keys(fields)[0]}: ..."`); return null; }
        for (const sub of Object.keys(item)) if (!Object.hasOwn(fields, sub)) add('error', doc.file, doc.lines[`${key}.${k}.${sub}`] || line, `${key}: unknown field "${sub}"`);
        for (const [sub, req] of Object.entries(fields)) if (req && (item[sub] === undefined || item[sub] === '')) add('error', doc.file, line, `${key}: item ${k + 1} needs "${sub}"`);
        return { item, line, at: (sub) => doc.lines[`${key}.${k}.${sub}`] || line };
      });
    };

    text('title', 10, 90);
    text('summary', 40, 220);
    if (has('title') && has('summary') && typeof d.title === 'string' && typeof d.summary === 'string') {
      const norm = (s) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
      if (norm(d.summary).startsWith(norm(d.title))) warn('summary', 'summary repeats the title; say what the reader gets instead');
    }
    strList('tools');
    strList('aliases');
    mapList('parts', lang === 'ru' ? { name: true, qty: false, ref: false } : { name: true, qty: false, ref: false }).forEach((p) => {
      if (!p) return;
      if (p.item.qty !== undefined && (!Number.isInteger(p.item.qty) || p.item.qty < 1)) add('error', doc.file, p.at('qty'), 'parts: qty must be a positive integer');
      if (typeof p.item.name !== 'string' && p.item.name !== undefined) add('error', doc.file, p.at('name'), 'parts: name must be text');
    });
    mapList('faq', { q: true, a: true }, { max: 8 }).forEach((f) => {
      if (!f) return;
      for (const sub of ['q', 'a']) if (f.item[sub] !== undefined && typeof f.item[sub] !== 'string') add('error', doc.file, f.at(sub), `faq: ${sub} must be text`);
      if (typeof f.item.a === 'string') {
        // Answers allow inline Markdown, so {{timer ...}} / {{led ...}} and links are checked too.
        const issues = [];
        renderInline(f.item.a, { issues, line: f.at('a'), labels: DEFAULT_LABELS[lang] });
        for (const i of issues) add(i.level, doc.file, i.line, `faq: ${i.message}`);
      }
    });
    const variants = mapList('variants', { id: true, name: true }, { min: 2, max: 6 });
    const variantIds = new Set();
    variants.forEach((v) => {
      if (!v) return;
      const { id, name } = v.item;
      if (id !== undefined && (typeof id !== 'string' || !ID.test(id))) add('error', doc.file, v.at('id'), `variants: id "${id}" must be kebab-case [a-z0-9-]`);
      else if (id !== undefined && variantIds.has(id)) add('error', doc.file, v.at('id'), `variants: duplicate id "${id}"`);
      else if (id !== undefined) variantIds.add(id);
      if (name !== undefined && (typeof name !== 'string' || !name.trim())) add('error', doc.file, v.at('name'), 'variants: name must be text');
      else if (typeof name === 'string' && [...name.trim()].length > 40) add('error', doc.file, v.at('name'), `variants: name is ${[...name.trim()].length} characters, at most 40`);
    });
    const sources = mapList('sources', lang === 'ru' ? { title: true, url: true, publisher: true } : { title: true, url: false, publisher: false }, { min: lang === 'ru' ? 1 : 0 });
    sources.forEach((s) => {
      if (s && s.item.url !== undefined && !isHttps(s.item.url)) add('error', doc.file, s.at('url'), `sources: url must start with https:// ("${s.item.url}")`);
    });
    if (lang === 'en') {
      const ruData = entry.docs.ru && entry.docs.ru.data;
      const ruIds = ruData && Array.isArray(ruData.variants) ? ruData.variants.map((v) => v && v.id).filter(Boolean) : [];
      const enIds = [...variantIds];
      if (ruIds.length && !has('variants')) warn('title', 'the Russian file has variants but the English file does not; the Russian names are shown');
      else if (has('variants') && JSON.stringify(enIds) !== JSON.stringify(ruIds)) {
        err('variants', `variants must have the same ids in the same order as the Russian file (${ruIds.join(', ') || 'none'}), got ${enIds.join(', ') || 'none'}`);
      }
      for (const key of ['parts', 'sources']) {
        if (ruData && Array.isArray(d[key]) && Array.isArray(ruData[key]) && d[key].length !== ruData[key].length) {
          warn(key, `${key} has ${d[key].length} items, the Russian file ${ruData[key].length}; they are matched by position`);
        }
      }
      if (ruData && Array.isArray(ruData.faq) && ruData.faq.length && !has('faq')) warn('title', 'the Russian file has faq but the English file does not; the Russian faq is shown');
      return;
    }

    if (has('category')) {
      if (!tax.categories.has(d.category)) err('category', `unknown category "${d.category}"`);
      else if (d.category !== entry.category) err('category', `category "${d.category}" does not match the folder "${entry.category}"`);
    }
    if (has('device')) {
      const dev = tax.devices.get(d.device);
      if (!dev) err('device', `unknown device "${d.device}" (taxonomy/devices.json)`);
      else if (has('category') && dev.category !== d.category) err('device', `device "${d.device}" belongs to category "${dev.category}", not "${d.category}"`);
    }
    strList('brands', { min: 1 });
    if (Array.isArray(d.brands)) {
      d.brands.forEach((b, k) => { if (!tax.brands.has(String(b))) add('error', doc.file, doc.lines[`brands.${k}`] || L('brands'), `unknown brand "${b}" (taxonomy/brands.json)`); });
      if (new Set(d.brands).size !== d.brands.length) err('brands', 'brands has duplicates');
    }
    strList('models');
    if (has('task') && !tax.tasks.has(d.task)) err('task', `unknown task "${d.task}" (taxonomy/tasks.json)`);
    if (has('difficulty') && !DIFFICULTY.includes(d.difficulty)) err('difficulty', `difficulty must be one of ${DIFFICULTY.join(', ')}`);
    if (has('time')) {
      if (!Number.isInteger(d.time) || d.time < 1 || d.time > 600) err('time', 'time must be a whole number of minutes, 1-600');
      else if (d.time > 120 && d.difficulty === 'easy') warn('time', `${d.time} minutes is long for difficulty "easy"`);
    }
    if (has('updated')) {
      const v = String(d.updated);
      const dt = new Date(`${v}T00:00:00Z`);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(v) || Number.isNaN(dt.getTime()) || dt.toISOString().slice(0, 10) !== v) err('updated', 'updated must be a date YYYY-MM-DD');
      else if (dt.getTime() > Date.now() + 2 * 86400000) warn('updated', 'updated is in the future');
    }
    strList('authors', { min: 1 });
    if (Array.isArray(d.authors)) d.authors.forEach((a, k) => {
      if (!LOGIN.test(String(a))) add('error', doc.file, doc.lines[`authors.${k}`] || L('authors'), `"${a}" is not a GitHub login`);
    });
    if (has('draft') && typeof d.draft !== 'boolean') err('draft', 'draft must be true or false');
    if (has('widget')) {
      const w = d.widget;
      if (!w || typeof w !== 'object' || Array.isArray(w)) err('widget', 'widget must be a block map with "  type: ..."');
      else if (!isStr(w.type)) err('widget', 'widget needs a type');
      else {
        const reg = widgets[w.type];
        if (!reg) err('widget', `unknown widget type "${w.type}"`);
        if (w.placement !== undefined && !['start', 'end'].includes(w.placement)) err('widget', 'widget placement must be start or end');
        for (const [k, v] of Object.entries(w)) if (v !== null && typeof v === 'object') add('error', doc.file, doc.lines[`widget.${k}`] || L('widget'), `widget.${k} must be a scalar`);
        if (reg && typeof reg.validate === 'function') {
          const params = Object.fromEntries(Object.entries(w).filter(([k]) => k !== 'type' && k !== 'placement'));
          for (const msg of reg.validate(params) || []) err('widget', `widget ${w.type}: ${msg}`);
        }
      }
    }
  }

  // Body checks; returns the image file of each step (or null) for the English comparison.
  async function validateBody(doc, entry, ctx, used, svgChecked) {
    const split = doc.split;
    for (const issue of split.issues) add(issue.level, doc.file, issue.line, issue.message);
    const steps = split.steps;
    if (steps.length < 3 || steps.length > 30) add('error', doc.file, steps.length ? steps[0].line : doc.bodyLine, `a guide has 3-30 steps ("## " headings), this one has ${steps.length}`);
    if (split.intro.paragraphs > 3) add('warning', doc.file, split.intro.line, `the introduction has ${split.intro.paragraphs} paragraphs, keep it to 3`);
    const images = [];
    // Variants (spec 11.2): ids come from the Russian frontmatter; every reference must exist and
    // every variant must keep at least one step.
    const ruData = entry.docs.ru && !entry.docs.ru.error ? entry.docs.ru.data : null;
    const known = new Set(ruData && Array.isArray(ruData.variants) ? ruData.variants.map((v) => v && v.id).filter((id) => typeof id === 'string') : []);
    const unknown = (ids, line) => {
      for (const id of ids || []) {
        if (!known.has(id)) add('error', doc.file, line, known.size ? `unknown variant "${id}"; the guide defines ${[...known].join(', ')}` : `variant "${id}" is used but the guide has no "variants:" in the Russian frontmatter`);
      }
    };
    for (const s of steps) {
      unknown(s.variants, s.line);
      for (const r of s.variantRefs || []) unknown(r.ids, r.line);
    }
    if (known.size) {
      for (const id of known) {
        if (!steps.some((s) => !s.variants || s.variants.includes(id))) add('error', doc.file, doc.bodyLine, `variant "${id}" has no steps: every variant needs at least one visible step`);
      }
    }
    // Widgets inside steps (spec 11.3): same registry and validation as the frontmatter widget.
    for (const s of steps) {
      for (const w of s.widgets || []) {
        const reg = widgets[w.type];
        if (!reg) { add('error', doc.file, w.line, `unknown widget type "${w.type}"`); continue; }
        let scalar = true;
        for (const [k, v] of Object.entries(w.params || {})) {
          if (v !== null && typeof v === 'object') { add('error', doc.file, w.line, `widget ${w.type}: ${k} must be a scalar`); scalar = false; }
        }
        if (scalar && typeof reg.validate === 'function') for (const msg of reg.validate(w.params || {}) || []) add('error', doc.file, w.line, `widget ${w.type}: ${msg}`);
      }
    }
    for (const s of steps) {
      const len = [...(s.title || '')].length;
      if (len < 3 || len > 80) add('error', doc.file, s.line, `step title is ${len} characters, expected 3-80`);
      if (!s.text.trim() && !s.image && !(s.widgets && s.widgets.length)) add('warning', doc.file, s.line, 'step has no text');
      const img = s.image;
      images.push(img ? img.src : null);
      if (!img) continue;
      used.add(img.src);
      const altLen = [...img.alt].length;
      if (altLen < 10 || altLen > 160) add('error', doc.file, img.line, `image alt text is ${altLen} characters, expected 10-160 (describe what the picture shows)`);
      if (/[\\/]/.test(img.src) || /^[a-z]+:/i.test(img.src)) { add('error', doc.file, img.line, 'images are files next to the guide: ![alt](step-1.svg)'); continue; }
      if (!IMAGE_EXT.test(img.src)) { add('error', doc.file, img.line, 'images must be .svg, .webp, .jpg or .png'); continue; }
      if (!entry.files.includes(img.src)) { add('error', doc.file, img.line, `image ${img.src} does not exist`); continue; }
      if (svgChecked.has(img.src)) continue;
      svgChecked.set(img.src, true);
      const file = `${entry.rel}/${img.src}`;
      const path = join(entry.dir, img.src);
      if (/\.svg$/i.test(img.src)) {
        const res = checkSvg(await readFile(path, 'utf8'));
        for (const e of res.errors) add('error', file, e.line, e.message);
        for (const w of res.warnings) add('warning', file, w.line, w.message);
      } else if (PHOTO_EXT.test(img.src)) {
        const size = (await stat(path)).size;
        if (size > MAX_PHOTO) add('error', file, 1, `photo is ${Math.ceil(size / 1024)} KB, at most 300 KB`);
        const dim = imageSize(await readFile(path));
        if (!dim) add('error', file, 1, 'cannot read the image size; is it a valid PNG, JPEG or WebP?');
        else if (dim.width > MAX_PHOTO_WIDTH) add('error', file, 1, `photo is ${dim.width} px wide, at most ${MAX_PHOTO_WIDTH}`);
      }
    }
    if (!plainText(split.intro.md).trim() && !steps.length) add('error', doc.file, doc.bodyLine, 'the guide has no text');
    return images;
  }
}

function compareIgnored(ru, en, add) {
  for (const key of Object.keys(en.data)) {
    if (EN_FIELDS.includes(key) || !Object.hasOwn(FIELDS, key)) continue;
    if (JSON.stringify(en.data[key]) !== JSON.stringify(ru.data[key])) {
      add('warning', en.file, en.lines[key], `"${key}" is read from index.ru.md only; the English value differs and is ignored`);
    }
  }
}
