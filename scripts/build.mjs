// npm run build: validate -> load both languages -> render pages -> assets and data endpoints -> dist/
// (docs/spec.md 7). Env: BASE_PATH, SITE_URL, SMH_RENDERER (renderer module path), SMH_OUT.
import { readFile, readdir, writeFile, mkdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, resolve, dirname, relative, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { checkAll } from '../src/lib/schema.js';
import { readContent, loadSite, PHOTO_EXT } from '../src/lib/model.js';
import { LANGS, normalizeBase, langPrefix, outputFile, pagePath } from '../src/lib/paths.js';
import { pageList, sitemapXml, robotsTxt, llmsTxt, llmsFullTxt, guidesJson, apiGuide } from '../src/lib/seo.js';
import { buildIndex } from '../src/lib/search.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const RENDER_FNS = {
  home: 'renderHome', guide: 'renderGuide', category: 'renderCategory', device: 'renderDevice', brand: 'renderBrand',
  task: 'renderTask', catalog: 'renderCatalog', search: 'renderSearch', stats: 'renderStats', requests: 'renderRequests',
  contribute: 'renderContribute', 404: 'render404'
};
const BROWSER_LIB = ['search.js', 'i18n.js', 'paths.js'];

export class BuildError extends Error {}

const hash = (data) => createHash('sha256').update(data).digest('hex').slice(0, 8);
const toPosix = (p) => p.split(sep).join('/');

async function walk(dir, filter = () => true) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const d of await readdir(dir, { withFileTypes: true })) {
    if (d.name.startsWith('.')) continue;
    const full = join(dir, d.name);
    if (d.isDirectory()) out.push(...(await walk(full, filter)));
    else if (filter(full)) out.push(full);
  }
  return out.sort();
}

// Everything the build writes, keyed by output path (posix, relative to the output root).
class Output {
  constructor() { this.files = new Map(); this.versions = {}; }
  add(path, data, { version = true } = {}) {
    this.files.set(path, data);
    if (version) this.versions[path] = hash(data);
  }
}

// Browser JS: entries from src/client, src/lib/{search,i18n,paths}.js and widget browser modules
// (src/widgets/**/*.js except render.js and schema.js), plus whatever they import relatively; copied to assets/js/ mirroring src/ so relative imports
// stay valid. Import specifiers get ?v=<hash of all browser JS>.
async function collectScripts(root, warn) {
  const src = join(root, 'src');
  const entries = [
    ...(await walk(join(src, 'client'), (f) => /\.m?js$/.test(f))),
    ...BROWSER_LIB.map((f) => join(src, 'lib', f)).filter((f) => existsSync(f)),
    // Every browser module of a widget: client.js and its helpers (wifi-qr/qr.js), not the
    // server-only render.js and schema.js. index.js is the build-time registry.
    ...(await walk(join(src, 'widgets'), (f) => /\.js$/.test(f) && !/[\\/](render|schema)\.js$/.test(f) && !/[\\/]widgets[\\/]index\.js$/.test(f)))
  ];
  const seen = new Map();
  const queue = [...entries];
  const SPEC = /(\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)(['"])(\.{1,2}\/[^'"?#]+)\2/g;
  while (queue.length) {
    const file = queue.shift();
    if (seen.has(file)) continue;
    const text = await readFile(file, 'utf8');
    seen.set(file, text);
    for (const m of text.matchAll(SPEC)) {
      const target = resolve(dirname(file), m[3]);
      if (!target.startsWith(src + sep)) { warn(`${toPosix(relative(root, file))}: import ${m[3]} points outside src/`); continue; }
      if (!existsSync(target)) { warn(`${toPosix(relative(root, file))}: import ${m[3]} does not exist`); continue; }
      queue.push(target);
    }
  }
  const files = [...seen.keys()].sort();
  const version = hash(files.map((f) => toPosix(relative(src, f)) + '\n' + seen.get(f)).join('\n'));
  return files.map((f) => ({
    path: `assets/js/${toPosix(relative(src, f))}`,
    text: seen.get(f).replace(SPEC, (all, pre, q, spec) => `${pre}${q}${spec}?v=${version}${q}`)
  }));
}

async function iconSprite(root) {
  const symbols = [];
  for (const file of await walk(join(root, 'src', 'icons'), (f) => f.endsWith('.svg'))) {
    const name = toPosix(relative(join(root, 'src', 'icons'), file)).replace(/\.svg$/, '').replace(/\//g, '-');
    const text = (await readFile(file, 'utf8')).replace(/<\?xml[\s\S]*?\?>|<!--[\s\S]*?-->/g, '').trim();
    const m = /^<svg\b([^>]*)>([\s\S]*)<\/svg>\s*$/.exec(text);
    if (!m) throw new BuildError(`src/icons/${name}.svg: not an <svg> file`);
    const attrs = m[1].replace(/\s(xmlns(:\w+)?|width|height|class|id|version)\s*=\s*("[^"]*"|'[^']*')/g, '').trim();
    const inner = m[2].replace(/<title>[\s\S]*?<\/title>/g, '').trim();
    symbols.push(`<symbol id="i-${name}"${attrs ? ' ' + attrs : ''}>${inner}</symbol>`);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg">\n${symbols.join('\n')}\n</svg>\n`;
}

async function loadRenderer(spec) {
  const file = spec ? resolve(process.cwd(), spec) : join(ROOT, 'src', 'render', 'index.js');
  if (!existsSync(file)) throw new BuildError(`renderer not found: ${file}`);
  const mod = await import(pathToFileURL(file).href);
  const missing = Object.values(RENDER_FNS).filter((fn) => typeof mod[fn] !== 'function');
  if (missing.length) throw new BuildError(`renderer ${toPosix(relative(ROOT, file))} does not export ${missing.join(', ')}`);
  return mod;
}

// Appends ?v=<hash> to root-absolute links of versioned files that do not carry one yet.
function versionLinks(html, base, versions) {
  const b = base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(["'(\\s])${b}([^"'?#)\\s<>]+)(?=[#"')\\s])`, 'g');
  return html.replace(re, (all, pre, path) => (versions[path] ? `${pre}${base}${path}?v=${versions[path]}` : all));
}

export async function build(opts = {}) {
  const started = Date.now();
  const root = opts.root || ROOT;
  const contentRoot = opts.content || root;
  const out = resolve(opts.out || join(root, 'dist'));
  const base = normalizeBase(opts.base ?? '/');
  const siteUrl = String(opts.siteUrl || '').replace(/\/+$/, '');
  const log = opts.log || console;
  const warnings = [];
  const warn = (msg) => { warnings.push(msg); log.warn(`warning: ${msg}`); };

  if (resolve(root).startsWith(out) || out === resolve(contentRoot)) throw new BuildError(`refusing to build into ${out}: it contains the project`);

  // 1. Validate.
  const content = await readContent(contentRoot);
  const check = await checkAll(contentRoot, { codeRoot: root, content });
  for (const i of check.warnings) warn(`${i.file}:${i.line}: ${i.message}`);
  if (check.errors.length) {
    for (const i of check.errors) log.error(`${i.file}:${i.line}: error: ${i.message}`);
    throw new BuildError(`validation failed with ${check.errors.length} error${check.errors.length === 1 ? '' : 's'}`);
  }

  // 2. Assets first, so pages can link them with ?v= hashes.
  const output = new Output();
  for (const file of await walk(join(root, 'static'))) output.add(toPosix(relative(join(root, 'static'), file)), await readFile(file));
  const css = [];
  for (const file of await walk(join(root, 'src', 'styles'), (f) => f.endsWith('.css'))) {
    css.push(`/* ${toPosix(relative(join(root, 'src', 'styles'), file))} */\n${(await readFile(file, 'utf8')).trim()}\n`);
  }
  output.add('assets/site.css', css.join('\n'));
  for (const s of await collectScripts(root, warn)) output.add(s.path, s.text);
  output.add('assets/icons.svg', await iconSprite(root));

  // 3. Site models.
  const sites = {};
  for (const lang of LANGS) {
    sites[lang] = await loadSite({ root: contentRoot, lang, base, siteUrl, content, assets: output.versions });
  }
  const ru = sites.ru;

  // 4. Data endpoints.
  let synonyms = [];
  const synFile = join(root, 'data', 'synonyms.json');
  if (existsSync(synFile)) synonyms = JSON.parse(await readFile(synFile, 'utf8'));
  for (const lang of LANGS) output.add(`assets/search.${lang}.json`, JSON.stringify(buildIndex(sites[lang].guides, sites[lang], synonyms)));
  output.add('guides.json', JSON.stringify(guidesJson(sites), null, 1), { version: false });
  for (const g of ru.guides) output.add(`api/${g.slug}.json`, JSON.stringify(apiGuide(sites, g.slug), null, 1), { version: false });
  output.add('llms.txt', llmsTxt(sites), { version: false });
  output.add('llms-full.txt', llmsFullTxt(ru), { version: false });
  output.add('en/llms-full.txt', llmsFullTxt(sites.en), { version: false });
  output.add('sitemap.xml', sitemapXml(sites), { version: false });
  output.add('robots.txt', robotsTxt(ru), { version: false });
  output.add('.nojekyll', '', { version: false });
  for (const entry of content.guides) {
    if (!ru.guides.some((g) => g.slug === entry.slug)) continue;
    for (const name of entry.files) {
      if (PHOTO_EXT.test(name)) output.add(`${entry.category}/${entry.slug}/${name}`, await readFile(join(entry.dir, name)));
    }
  }

  // 5. Pages.
  const renderer = opts.renderer && typeof opts.renderer === 'object' ? opts.renderer : await loadRenderer(opts.renderer || process.env.SMH_RENDERER);
  const pages = new Map();
  const render = (site, kind, subject) => {
    const fn = RENDER_FNS[kind];
    let res;
    try {
      res = subject ? renderer[fn](site, subject) : renderer[fn](site);
    } catch (error) {
      error.message = `${fn}(${site.lang}${subject ? `, ${subject.slug || subject.id}` : ''}): ${error.message}`;
      throw error;
    }
    if (!res || typeof res.html !== 'string' || typeof res.path !== 'string') throw new BuildError(`${fn} must return {path, html}`);
    const expected = outputFile(pagePath(kind, subject));
    if (res.path !== expected) warn(`${fn}(${site.lang}) returned path "${res.path}", expected "${expected}"`);
    const file = kind === '404' ? res.path : langPrefix(site.lang) + res.path.replace(/^\/+/, '');
    if (pages.has(file) || output.files.has(file)) throw new BuildError(`two outputs write ${file}`);
    pages.set(file, versionLinks(res.html, base, output.versions));
  };
  for (const lang of LANGS) for (const page of pageList(sites[lang])) render(sites[lang], page.kind, page.subject);
  render(ru, '404', null);

  // 6. Write.
  await rm(out, { recursive: true, force: true });
  const all = new Map([...output.files, ...pages]);
  for (const [path, data] of all) {
    const file = join(out, ...path.split('/'));
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, data);
  }

  const enPages = [...pages.keys()].filter((p) => p.startsWith(langPrefix('en'))).length;
  const counts = `ru ${pages.size - enPages}, en ${enPages}`;
  log.log(`Built ${ru.guides.length} guide${ru.guides.length === 1 ? '' : 's'}: ${pages.size} pages (${counts}), ${all.size} files in ${toPosix(relative(process.cwd(), out)) || '.'} in ${Date.now() - started} ms${warnings.length ? `, ${warnings.length} warning${warnings.length === 1 ? '' : 's'}` : ''}.`);
  return { out, pages: [...pages.keys()], files: [...all.keys()], warnings, sites };
}

function argValue(name) {
  const i = process.argv.indexOf(name);
  return i > 0 ? process.argv[i + 1] : undefined;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  if (/^[A-Za-z]:[\\/]/.test(process.env.BASE_PATH || '')) {
    console.error(`build failed: BASE_PATH is "${process.env.BASE_PATH}", a Windows path; Git Bash rewrote it. Run with MSYS_NO_PATHCONV=1.`);
    process.exit(1);
  }
  try {
    await build({
      out: argValue('--out') || process.env.SMH_OUT || undefined,
      content: argValue('--content') ? resolve(argValue('--content')) : undefined,
      base: process.env.BASE_PATH || '/',
      siteUrl: process.env.SITE_URL || '',
      renderer: argValue('--renderer') || process.env.SMH_RENDERER || undefined
    });
  } catch (error) {
    console.error(error instanceof BuildError ? `build failed: ${error.message}` : error);
    process.exit(1);
  }
}

