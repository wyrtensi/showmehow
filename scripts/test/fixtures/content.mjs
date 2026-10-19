// Builds throw-away content roots under .tmp/ for the core tests: the fixture taxonomy, the sample
// guide, and whatever extra files a test writes.
import { mkdir, rm, cp, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
export const SAMPLE = 'guides/audio/airpods-pair-android';
// Frozen copy of the sample guide and the taxonomy: tests must not depend on live content that
// content authors edit (guides/**, taxonomy/**). Update it on purpose when the format changes.
export const FIXTURE = join(ROOT, 'scripts', 'test', 'fixtures', 'site');

let n = 0;
// files: {relativePath: string | Buffer}; options: {sample: true} copies the sample guide.
export async function makeRoot(name, files = {}, { sample = true } = {}) {
  n += 1;
  const dir = join(ROOT, '.tmp', `test-${name}-${process.pid}-${n}`);
  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });
  await cp(join(FIXTURE, 'taxonomy'), join(dir, 'taxonomy'), { recursive: true });
  if (sample) await cp(join(FIXTURE, SAMPLE), join(dir, SAMPLE), { recursive: true });
  for (const [rel, data] of Object.entries(files)) {
    const file = join(dir, rel);
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, data);
  }
  return dir;
}

export async function removeRoot(dir) {
  await rm(dir, { recursive: true, force: true });
}

// A guide file from frontmatter fields and a body; values are written verbatim.
export function guideFile(fields, body) {
  return `---\n${Object.entries(fields).map(([k, v]) => `${k}: ${v}`).join('\n')}\n---\n\n${body}`;
}

export const STEPS3 = '## Откройте настройки телефона\n\nТекст шага.\n\n## Включите Bluetooth на телефоне\n\nТекст шага.\n\n## Выберите наушники в списке\n\nТекст шага.\n';

export const BASE_FIELDS = {
  title: 'Как подключить наушники к телефону',
  summary: 'Наушники подключаются по Bluetooth за пару минут. Включите режим подключения и выберите их в списке.',
  category: 'audio',
  device: 'earbuds',
  brands: '[generic]',
  task: 'pair',
  difficulty: 'easy',
  time: '3',
  sources: '\n  - title: Руководство\n    url: https://example.com/manual\n    publisher: Example',
  updated: '2026-10-01',
  authors: '[wyrtensi]'
};

// A 2x3 PNG header (enough for the size reader; the pixel data is not valid).
export function tinyPng(width = 2, height = 3) {
  const b = Buffer.alloc(33);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(b, 0);
  b.writeUInt32BE(13, 8);
  b.write('IHDR', 12, 'ascii');
  b.writeUInt32BE(width, 16);
  b.writeUInt32BE(height, 20);
  return b;
}
