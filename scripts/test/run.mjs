// Tiny test runner: imports every scripts/test/*.test.mjs, which register cases
// through the global test(name, fn), then runs them in order and reports.
import { readdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { join } from 'node:path';

const cases = [];
globalThis.test = (name, fn) => cases.push({ name, fn, file: currentFile });
let currentFile = '';

const dir = import.meta.dirname;
const only = process.argv[2];
const files = (await readdir(dir)).filter((f) => f.endsWith('.test.mjs') && (!only || f.includes(only))).sort();
for (const file of files) {
  currentFile = file;
  await import(pathToFileURL(join(dir, file)).href);
}

let failed = 0;
for (const c of cases) {
  try {
    await c.fn();
  } catch (error) {
    failed += 1;
    console.error(`FAIL ${c.file} > ${c.name}\n  ${(error.stack || String(error)).split('\n').slice(0, 6).join('\n  ')}`);
  }
}
console.log(`${cases.length - failed}/${cases.length} tests passed in ${files.length} files.`);
if (failed) process.exit(1);
