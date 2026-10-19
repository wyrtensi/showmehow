// npm run check: validates taxonomy and guides (docs/spec.md 4.5). Prints path:line: messages,
// GitHub annotations when GITHUB_ACTIONS=true, exits 1 on errors.
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { checkAll } from '../src/lib/schema.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

const annotate = (s) => String(s).replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
const annotateProp = (s) => annotate(s).replace(/:/g, '%3A').replace(/,/g, '%2C');

// Runs the checker and prints the report; returns {errors, warnings, content}.
export async function runCheck({ root = ROOT, codeRoot = ROOT, quiet = false, log = console } = {}) {
  const result = await checkAll(root, { codeRoot });
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
