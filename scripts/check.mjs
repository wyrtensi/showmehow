// npm run check: validates taxonomy and guides (docs/spec.md 4.5). Prints path:line: messages,
// GitHub annotations when GITHUB_ACTIONS=true, exits 1 on errors.
import { fileURLToPath, pathToFileURL } from 'node:url';
import { readFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { checkAll, jsonEntryLines } from '../src/lib/schema.js';
import { tokenize, stem } from '../src/lib/search.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

const annotate = (s) => String(s).replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
const annotateProp = (s) => annotate(s).replace(/:/g, '%3A').replace(/,/g, '%2C');

// Words that qualify a device but do not identify it ("Умная розетка" / "Smart plug"): they
// alone must not count as synonym coverage.
const GENERIC = new Set(['умн', 'smart', 'wi', 'fi', 'wifi'].map(stem));
const CYRILLIC = /[а-яё]/i;

async function readOptional(file) {
  try { return await readFile(file, 'utf8'); } catch { return null; }
}

// Live-taxonomy coverage of data/synonyms.json (docs/spec.md section 8). Every device, category and
// task must sit in one synonym group that holds a Russian and an English term from its names; every
// brand in a group that holds its Latin name and at least one Russian spelling. Lives here rather
// than in scripts/test so unit tests stay independent of live content: content PRs fail `npm run
// check` (and CI) when they add taxonomy without synonyms. Returns [{file, line, message}].
export async function checkSynonymCoverage({ root = ROOT, codeRoot = ROOT } = {}) {
  const synFile = join(codeRoot, 'data', 'synonyms.json');
  const synText = await readOptional(synFile);
  if (synText === null) return [];
  let groups;
  try { groups = JSON.parse(synText); } catch { return []; }
  if (!Array.isArray(groups)) return [];
  const groupTokens = groups.map((g) => {
    const set = new Set();
    const terms = Array.isArray(g) ? g : [];
    for (const term of terms) for (const t of tokenize(String(term))) set.add(stem(t));
    return { set, terms: terms.map(String) };
  });
  const stems = (texts) => new Set(texts.filter(Boolean).flatMap((x) => tokenize(String(x))).map(stem).filter((s) => s.length >= 2 && !GENERIC.has(s)));
  const hit = (anchors, set) => [...anchors].some((a) => set.has(a));
  const issues = [];
  for (const name of ['devices', 'categories', 'tasks', 'brands']) {
    const file = `taxonomy/${name}.json`;
    const text = await readOptional(join(root, file));
    if (text === null) continue;
    let items;
    try { items = JSON.parse(text); } catch { continue; }
    if (!Array.isArray(items)) continue;
    const lines = jsonEntryLines(text);
    items.forEach((item, k) => {
      if (!item || typeof item !== 'object' || typeof item.id !== 'string' || item.id === 'generic') return;
      const line = lines[k] || 1;
      const fail = (msg) => issues.push({ file, line, message: `"${item.id}": ${msg} in data/synonyms.json` });
      if (name === 'brands') {
        const latin = [item.name, item.id, String(item.name || '').replace(/[^\p{L}\p{N}]+/gu, ''), item.id.replace(/-/g, '')];
        const own = stems(latin);
        const ok = groupTokens.some((g) => hit(own, g.set) && g.terms.some((t) => CYRILLIC.test(t)));
        if (!ok) fail(`no synonym group with the name "${item.name}" and a Russian spelling (add e.g. ["${String(item.id)}", "<russian spelling>"])`);
        return;
      }
      const ru = stems([item.ru?.name, item.ru?.plural, item.ru?.verb]);
      const en = stems([item.en?.name, item.en?.plural, item.en?.verb]);
      const ok = groupTokens.some((g) => hit(ru, g.set) && hit(en, g.set));
      if (!ok) fail(`no synonym group with both a Russian ("${item.ru?.name}") and an English ("${item.en?.name}") term`);
    });
  }
  return issues;
}

// Runs the checker and prints the report; returns {errors, warnings, content}.
export async function runCheck({ root = ROOT, codeRoot = ROOT, quiet = false, log = console } = {}) {
  const result = await checkAll(root, { codeRoot });
  for (const i of await checkSynonymCoverage({ root, codeRoot })) result.errors.push(i);
  const gh = process.env.GITHUB_ACTIONS === 'true';
  for (const [level, list] of [['error', result.errors], ['warning', result.warnings]]) {
    for (const i of list) {
      log.error(`${i.file}:${i.line}: ${level}: ${i.message}`);
      if (gh) log.error(`::${level} file=${annotateProp(i.file)},line=${i.line}::${annotate(i.message)}`);
    }
  }
  if (!quiet) {
    const guides = result.content.guides.length;
    log.log(`Checked ${guides} guide${guides === 1 ? '' : 's'}: ${result.errors.length} error${result.errors.length === 1 ? '' : 's'}, ${result.warnings.length} warning${result.warnings.length === 1 ? '' : 's'}.`);
  }
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const rootArg = process.argv.indexOf('--root');
  const root = rootArg > 0 ? resolve(process.argv[rootArg + 1]) : ROOT;
  const { errors } = await runCheck({ root });
  if (errors.length) process.exit(1);
}
