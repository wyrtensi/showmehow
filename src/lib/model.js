// Loads taxonomy and guides into the site model (docs/spec.md 7). readContent() is the raw
// reading step shared with the validator; loadSite() builds the per-language model.
import { readFile, readdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { parseFrontmatter } from './frontmatter.js';
import { splitGuide, renderInline, countWords, DEFAULT_LABELS } from './markdown.js';
import { inlineSvg } from './svg.js';
import { LANGS, normalizeBase, href as hrefOf, absUrl } from './paths.js';

export const TAXONOMY = ['categories', 'devices', 'brands', 'tasks'];
export const IMAGE_EXT = /\.(svg|webp|jpe?g|png)$/i;
export const PHOTO_EXT = /\.(webp|jpe?g|png)$/i;
const SRC_DIR = fileURLToPath(new URL('..', import.meta.url));

// Reads taxonomy files and every guide folder. Nothing here throws on bad content: problems are
// left on the returned objects ({error}) for the validator to report.
export async function readContent(root) {
  const taxonomy = {};
  for (const name of TAXONOMY) {
    const file = `taxonomy/${name}.json`;
    const entry = { file, text: '', data: [], error: null };
    try {
      entry.text = (await readFile(join(root, file), 'utf8')).replace(/^﻿/, '');
      entry.data = JSON.parse(entry.text);
      if (!Array.isArray(entry.data)) { entry.error = { line: 1, message: 'must be a JSON array' }; entry.data = []; }
    } catch (error) {
      entry.error = { line: jsonErrorLine(error, entry.text), message: error.code === 'ENOENT' ? 'file is missing' : `invalid JSON: ${error.message}` };
      entry.data = [];
    }
    taxonomy[name] = entry;
  }

  const guides = [];
  const problems = [];
  const guidesDir = join(root, 'guides');
  for (const category of await listDir(guidesDir)) {
    const catDir = join(guidesDir, category.name);
    if (!category.dir) { problems.push({ file: `guides/${category.name}`, line: 1, level: 'warning', message: 'stray file: guides live in guides/<category>/<slug>/' }); continue; }
    for (const slug of await listDir(catDir)) {
      const rel = `guides/${category.name}/${slug.name}`;
      if (!slug.dir) { problems.push({ file: rel, line: 1, level: 'warning', message: 'stray file: guides live in guides/<category>/<slug>/' }); continue; }
      const dir = join(catDir, slug.name);
      const files = (await listDir(dir)).filter((f) => !f.dir).map((f) => f.name);
      const entry = { category: category.name, slug: slug.name, rel, dir, files, docs: { ru: null, en: null } };
      for (const lang of LANGS) {
        const name = `index.${lang}.md`;
        if (files.includes(name)) entry.docs[lang] = await readDoc(join(dir, name), `${rel}/${name}`, lang);
      }
      guides.push(entry);
    }
  }
  return { root, taxonomy, guides, problems };
}

async function readDoc(path, file, lang) {
  const doc = { file, lang, text: '', data: null, lines: {}, body: '', bodyLine: 1, error: null, split: null };
  doc.text = await readFile(path, 'utf8');
  try {
    const fm = parseFrontmatter(doc.text);
    Object.assign(doc, { data: fm.data, lines: fm.lines, body: fm.body, bodyLine: fm.bodyLine });
    doc.split = splitGuide(fm.body, { line: fm.bodyLine, labels: DEFAULT_LABELS[lang], variants: variantNames(fm.data.variants) });
  } catch (error) {
    if (error.name !== 'FrontmatterError') throw error;
    doc.error = { line: error.line, message: error.message };
  }
  return doc;
}

// {id: name} from a frontmatter variants list (spec 11.2); bad entries are left to the validator.
function variantNames(list) {
  const out = {};
  if (Array.isArray(list)) for (const v of list) if (v && typeof v.id === 'string' && typeof v.name === 'string') out[v.id] = v.name;
  return out;
}

async function listDir(dir) {
  try {
    const items = await readdir(dir, { withFileTypes: true });
    return items
      .filter((d) => !d.name.startsWith('.'))
      .map((d) => ({ name: d.name, dir: d.isDirectory() }))
      .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  } catch {
    return [];
  }
}

export function jsonErrorLine(error, text) {
  const msg = String(error && error.message);
  const line = /line (\d+)/.exec(msg);
  if (line) return Number(line[1]);
  const pos = /position (\d+)/.exec(msg);
  if (pos) return text.slice(0, Number(pos[1])).split('\n').length;
  return 1;
}

// The widget registry src/widgets/index.js (frontend); an empty registry when it is missing.
export async function loadWidgets() {
  const file = join(SRC_DIR, 'widgets', 'index.js');
  if (!existsSync(file)) return {};
  const mod = await import(pathToFileURL(file).href);
  const reg = mod.default || mod.widgets || mod.registry || {};
  return reg && typeof reg === 'object' ? reg : {};
}

// Width and height of PNG, JPEG and WebP files from their headers; null when unknown.
export function imageSize(buf) {
  if (buf.length > 24 && buf.readUInt32BE(0) === 0x89504e47) return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  if (buf.length > 4 && buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i + 9 < buf.length) {
      if (buf[i] !== 0xff) { i += 1; continue; }
      const marker = buf[i + 1];
      if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) { i += 2; continue; }
      const len = buf.readUInt16BE(i + 2);
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
        return { width: buf.readUInt16BE(i + 7), height: buf.readUInt16BE(i + 5) };
      }
      i += 2 + len;
    }
    return null;
  }
  if (buf.length > 30 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') {
    const kind = buf.toString('ascii', 12, 16);
    if (kind === 'VP8X') return { width: 1 + buf.readUIntLE(24, 3), height: 1 + buf.readUIntLE(27, 3) };
    if (kind === 'VP8 ') return { width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff };
    if (kind === 'VP8L') {
      const b = buf.readUInt32LE(21);
      return { width: (b & 0x3fff) + 1, height: ((b >> 14) & 0x3fff) + 1 };
    }
  }
  return null;
}

// Last commit date (YYYY-MM-DD) per guide folder 'category/slug', from one git log call.
const gitCache = new Map();
export function gitDates(root) {
  if (gitCache.has(root)) return gitCache.get(root);
  const dates = {};
  try {
    const out = execFileSync('git', ['-c', 'core.quotepath=false', 'log', '--format=%x01%cs', '--name-only', '--relative', '--', 'guides'], {
      cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 64 * 1024 * 1024
    });
    let date = '';
    for (const line of out.split('\n')) {
      if (line.startsWith('\x01')) { date = line.slice(1).trim(); continue; }
      const m = /^guides\/([^/]+)\/([^/]+)\//.exec(line.trim());
      if (m && date && !dates[`${m[1]}/${m[2]}`]) dates[`${m[1]}/${m[2]}`] = date;
    }
  } catch {
    // No git or not a repository: lastmod falls back to `updated`.
  }
  gitCache.set(root, dates);
  return dates;
}

const pick = (obj, lang) => (obj && (obj[lang] || obj.ru)) || {};
const textList = (v) => (Array.isArray(v) ? v.map((x) => String(x)) : []);

// Builds the Site model for one language. opts: {root, lang, base, siteUrl, labels, content, assets}
// where content is a readContent() result to reuse and assets maps asset paths to version hashes.
export async function loadSite({ root, lang = 'ru', base = '/', siteUrl = '', labels, content, assets = {} } = {}) {
  content = content || (await readContent(root));
  const L = lang;
  const B = normalizeBase(base);
  const S = String(siteUrl || '').replace(/\/+$/, '');
  const alertLabels = { ...DEFAULT_LABELS.en, ...DEFAULT_LABELS[L], ...(await i18nLabels(L)), ...(labels || {}) };
  const tax = Object.fromEntries(TAXONOMY.map((n) => [n, content.taxonomy[n].data]));

  const site = {
    lang: L,
    base: B,
    siteUrl: S,
    langs: [...LANGS],
    href: (path = '', l = L) => hrefOf(B, path, l),
    abs: (path = '', l = L) => absUrl(S, B, path, l),
    asset: (path) => hrefOf(B, path, 'ru') + (assets[path] ? `?v=${assets[path]}` : ''),
    categories: [], devices: [], brands: [], tasks: [], guides: [],
    byCategory: {}, byDevice: {}, byBrand: {}, byTask: {},
    totals: {}, updatedAt: null
  };

  site.categories = tax.categories.filter((c) => c && c.id).map((c) => ({
    id: c.id, hue: c.hue, icon: c.icon,
    name: pick(c, L).name || c.id, desc: pick(c, L).desc || '',
    featured: (c.featured || []).map((f) => ({ url: f.url, title: pick(f, L).title || '', desc: pick(f, L).desc || '' })),
    count: 0, devices: []
  }));
  site.devices = tax.devices.filter((d) => d && d.id).map((d) => ({
    id: d.id, category: d.category, name: pick(d, L).name || d.id, plural: pick(d, L).plural || pick(d, L).name || d.id,
    aliases: textList(d.aliases), count: 0
  }));
  site.brands = tax.brands.filter((b) => b && b.id).map((b) => ({
    id: b.id, name: (b[L] && b[L].name) || b.name || b.id, aliases: textList(b.aliases), site: b.site || null, count: 0
  }));
  site.tasks = tax.tasks.filter((t) => t && t.id).map((t) => ({ id: t.id, name: pick(t, L).name || t.id, verb: pick(t, L).verb || '', count: 0 }));

  const index = (list) => Object.fromEntries(list.map((x) => [x.id, x]));
  const cats = index(site.categories);
  const devs = index(site.devices);
  const brands = index(site.brands);
  const tasks = index(site.tasks);
  for (const d of site.devices) if (cats[d.category]) cats[d.category].devices.push(d);

  const dates = gitDates(content.root || root);
  for (const entry of content.guides) {
    const ru = entry.docs.ru;
    if (!ru || ru.error || !ru.data || ru.data.draft === true) continue;
    const d = ru.data;
    const category = cats[d.category];
    const device = devs[d.device];
    const task = tasks[d.task];
    const guideBrands = Array.isArray(d.brands) ? d.brands.map((id) => brands[id]) : [];
    if (!category || !device || !task || !guideBrands.length || guideBrands.some((b) => !b) || category.id !== entry.category) continue;

    const enDoc = entry.docs.en && !entry.docs.en.error && entry.docs.en.data ? entry.docs.en : null;
    const useEn = L === 'en' && enDoc;
    const textDoc = useEn ? enDoc : ru;
    const t = textDoc.data;
    const path = `${entry.category}/${entry.slug}/`;
    // Variant ids come from the Russian file, names from the reading language (Russian fallback).
    const ruVariants = Array.isArray(d.variants) ? d.variants.filter((v) => v && typeof v.id === 'string') : [];
    const names = { ...variantNames(ruVariants), ...(useEn ? variantNames(t.variants) : {}) };
    const variants = ruVariants.map((v) => ({ id: v.id, name: String(names[v.id] ?? v.id) }));
    const body = splitGuide(textDoc.body, { line: textDoc.bodyLine, labels: alertLabels, variants: names });

    const steps = [];
    for (const s of body.steps) {
      steps.push({
        n: s.n, id: `step-${s.n}`, title: s.title, html: s.html, md: s.md, image: await loadImage(entry, s, site, path),
        variants: s.variants && s.variants.length ? [...s.variants] : null,
        widgets: (s.widgets || []).map((w) => ({ type: w.type, params: w.params || {} }))
      });
    }
    const ruParts = Array.isArray(d.parts) ? d.parts : [];
    const enParts = useEn && Array.isArray(t.parts) ? t.parts : [];
    const ruSources = Array.isArray(d.sources) ? d.sources : [];
    const enSources = useEn && Array.isArray(t.sources) ? t.sources : [];
    const faqSrc = useEn && Array.isArray(t.faq) ? t.faq : Array.isArray(d.faq) ? d.faq : [];
    const widget = d.widget && typeof d.widget === 'object' && d.widget.type ? d.widget : null;

    const guide = {
      slug: entry.slug,
      path,
      category, device, brands: guideBrands, task,
      models: textList(d.models),
      difficulty: d.difficulty,
      time: d.time,
      title: String(useEn && t.title ? t.title : d.title),
      summary: String(useEn && t.summary ? t.summary : d.summary),
      introHtml: body.intro.html,
      tools: textList(useEn && Array.isArray(t.tools) ? t.tools : d.tools),
      parts: ruParts.map((p, k) => ({
        name: String((enParts[k] && enParts[k].name) || p.name || ''),
        qty: p.qty ?? null,
        ref: p.ref === undefined ? null : String(p.ref)
      })),
      aliases: textList(useEn && Array.isArray(t.aliases) ? t.aliases : d.aliases),
      steps,
      faq: faqSrc.map((f) => ({ q: String(f.q ?? ''), a: String(f.a ?? ''), aHtml: renderInline(String(f.a ?? ''), { labels: alertLabels }) })),
      sources: ruSources.map((s, k) => ({ title: String((enSources[k] && enSources[k].title) || s.title || ''), url: s.url, publisher: s.publisher ? String(s.publisher) : '' })),
      updated: String(d.updated),
      lastmod: dates[`${entry.category}/${entry.slug}`] || String(d.updated),
      authors: textList(d.authors),
      variants,
      widget: widget ? {
        type: String(widget.type),
        params: Object.fromEntries(Object.entries(widget).filter(([k]) => k !== 'type' && k !== 'placement')),
        placement: widget.placement === 'end' ? 'end' : 'start'
      } : null,
      langs: { ru: true, en: Boolean(enDoc) },
      fallback: L === 'en' && !enDoc,
      stats: {
        steps: steps.length,
        illustrations: steps.filter((s) => s.image).length,
        words: countWords([body.intro.text, ...body.steps.map((s) => `${s.title}\n${s.text}`)].join('\n'))
      }
    };
    site.guides.push(guide);
  }

  site.guides.sort((a, b) => (a.updated < b.updated ? 1 : a.updated > b.updated ? -1 : a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0));
  for (const [key, list] of [['byCategory', site.categories], ['byDevice', site.devices], ['byBrand', site.brands], ['byTask', site.tasks]]) {
    for (const x of list) site[key][x.id] = [];
  }
  for (const g of site.guides) {
    site.byCategory[g.category.id].push(g);
    site.byDevice[g.device.id].push(g);
    site.byTask[g.task.id].push(g);
    for (const b of g.brands) if (!site.byBrand[b.id].includes(g)) site.byBrand[b.id].push(g);
  }
  for (const c of site.categories) c.count = site.byCategory[c.id].length;
  for (const d of site.devices) d.count = site.byDevice[d.id].length;
  for (const b of site.brands) b.count = site.byBrand[b.id].length;
  for (const t of site.tasks) t.count = site.byTask[t.id].length;

  const sum = (fn) => site.guides.reduce((n, g) => n + fn(g), 0);
  site.totals = {
    guides: site.guides.length,
    steps: sum((g) => g.stats.steps),
    illustrations: sum((g) => g.stats.illustrations),
    devices: site.devices.filter((d) => d.count).length,
    brands: site.brands.filter((b) => b.count && b.id !== 'generic').length,
    categories: site.categories.filter((c) => c.count).length,
    withEnglish: site.guides.filter((g) => g.langs.en).length,
    sources: sum((g) => g.sources.length)
  };
  site.updatedAt = site.guides.reduce((max, g) => (g.updated > max ? g.updated : max), '') || null;
  return site;
}

// Alert titles from the frontend's src/lib/i18n.js when it exists.
async function i18nLabels(lang) {
  const file = join(SRC_DIR, 'lib', 'i18n.js');
  if (!existsSync(file)) return {};
  const mod = await import(pathToFileURL(file).href);
  return typeof mod.alertLabels === 'function' ? mod.alertLabels(lang) || {} : {};
}

async function loadImage(entry, step, site, path) {
  const img = step.image;
  if (!img || !IMAGE_EXT.test(img.src) || img.src.includes('/') || img.src.includes('\\') || !entry.files.includes(img.src)) return null;
  const file = join(entry.dir, img.src);
  if (/\.svg$/i.test(img.src)) {
    const res = inlineSvg(await readFile(file, 'utf8'), { prefix: `${entry.slug}-s${step.n}`, label: img.alt });
    return res.errors.length ? null : { kind: 'svg', svg: res.svg, alt: img.alt };
  }
  const size = imageSize(await readFile(file)) || { width: null, height: null };
  return { kind: 'photo', src: site.href(`${path}${img.src}`, 'ru'), alt: img.alt, width: size.width, height: size.height };
}

export async function fileSize(path) {
  return (await stat(path)).size;
}
