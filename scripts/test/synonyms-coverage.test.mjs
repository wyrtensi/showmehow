// Unit tests for the live-taxonomy synonym coverage check in scripts/check.mjs, run against a
// throwaway root so they do not depend on shipped content.
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { checkSynonymCoverage } from '../check.mjs';

async function withRoot(taxonomy, synonyms, fn) {
  const dir = await mkdtemp(join(tmpdir(), 'smh-syn-'));
  try {
    await mkdir(join(dir, 'taxonomy'));
    await mkdir(join(dir, 'data'));
    for (const [name, data] of Object.entries(taxonomy)) await writeFile(join(dir, 'taxonomy', `${name}.json`), JSON.stringify(data, null, 2));
    await writeFile(join(dir, 'data', 'synonyms.json'), JSON.stringify(synonyms));
    return await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

const device = { id: 'kettle', category: 'kitchen', ru: { name: 'Электрочайник', plural: 'Электрочайники' }, en: { name: 'Electric kettle', plural: 'Electric kettles' } };
const brand = { id: 'trek', name: 'Trek', aliases: [] };

test('synonym coverage: reports devices and brands without a bilingual group', async () => {
  await withRoot({ devices: [device], brands: [{ id: 'generic', name: 'Any' }, brand] }, [['чайник', 'kettle']], async (dir) => {
    const issues = await checkSynonymCoverage({ root: dir, codeRoot: dir });
    assert.deepEqual(issues.map((i) => i.file + ':' + i.message.split(':')[0]), ['taxonomy/devices.json:"kettle"', 'taxonomy/brands.json:"trek"']);
  });
});

test('synonym coverage: passes once groups exist', async () => {
  await withRoot({ devices: [device], brands: [brand] }, [['электрочайник', 'kettle'], ['trek', 'трек']], async (dir) => {
    assert.deepEqual(await checkSynonymCoverage({ root: dir, codeRoot: dir }), []);
  });
});
