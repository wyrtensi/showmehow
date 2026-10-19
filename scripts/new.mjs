// npm run new -- <category>/<slug> [--en] [--device <id>] [--task <id>]
// Scaffolds guides/<category>/<slug>/ from templates/guide/ (Russian always, English with --en).
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function gitLogin(root) {
  for (const key of ['github.user', 'user.name']) {
    try {
      const v = execFileSync('git', ['config', key], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
      if (/^[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}$/.test(v)) return v;
    } catch {
      // not configured
    }
  }
  return '__AUTHOR__';
}

export async function scaffold(target, opts = {}) {
  const root = opts.root || ROOT;
  const m = /^([^/\\]+)[/\\]([^/\\]+)$/.exec(String(target || '').trim());
  if (!m) throw new Error('usage: npm run new -- <category>/<slug> [--en] [--device <id>] [--task <id>]');
  const [, category, slug] = m;
  const categories = JSON.parse(await readFile(join(root, 'taxonomy', 'categories.json'), 'utf8'));
  if (!categories.some((c) => c.id === category)) throw new Error(`unknown category "${category}"; one of: ${categories.map((c) => c.id).join(', ')}`);
  if (!ID.test(slug) || slug.length > 60) throw new Error(`slug "${slug}" must be kebab-case [a-z0-9-], at most 60 characters`);
  const guides = join(root, 'guides');
  for (const c of existsSync(guides) ? await readdir(guides) : []) {
    if (existsSync(join(guides, c, slug))) throw new Error(`slug "${slug}" already exists in guides/${c}/`);
  }
  const devices = JSON.parse(await readFile(join(root, 'taxonomy', 'devices.json'), 'utf8'));
  if (opts.device && !devices.some((d) => d.id === opts.device && d.category === category)) throw new Error(`device "${opts.device}" is not in category "${category}"`);
  const tasks = JSON.parse(await readFile(join(root, 'taxonomy', 'tasks.json'), 'utf8'));
  if (opts.task && !tasks.some((t) => t.id === opts.task)) throw new Error(`unknown task "${opts.task}"`);

  const values = {
    __CATEGORY__: category,
    __DATE__: opts.date || new Date().toISOString().slice(0, 10),
    __AUTHOR__: opts.author || gitLogin(root),
    ...(opts.device ? { __DEVICE__: opts.device } : {}),
    ...(opts.task ? { __TASK__: opts.task } : {})
  };
  const dir = join(guides, category, slug);
  await mkdir(dir, { recursive: true });
  const written = [];
  for (const lang of opts.en ? ['ru', 'en'] : ['ru']) {
    const tpl = await readFile(join(root, 'templates', 'guide', `index.${lang}.md`), 'utf8');
    const text = tpl.replace(/__[A-Z][A-Z_]*__/g, (k) => (Object.hasOwn(values, k) ? values[k] : k));
    const file = join(dir, `index.${lang}.md`);
    await writeFile(file, text);
    written.push(`guides/${category}/${slug}/index.${lang}.md`);
  }
  return written;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  const flag = (name) => {
    const i = args.indexOf(name);
    if (i < 0) return undefined;
    const v = args[i + 1];
    args.splice(i, 2);
    return v;
  };
  const device = flag('--device');
  const task = flag('--task');
  const en = args.includes('--en');
  const target = args.find((a) => !a.startsWith('--'));
  try {
    const files = await scaffold(target, { en, device, task });
    console.log(`Created ${files.join(', ')}.`);
    console.log('Fill in the __PLACEHOLDERS__, add step-<n>.svg illustrations next to the file, remove "draft: true" and run npm run check.');
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
