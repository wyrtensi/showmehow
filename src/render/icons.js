// Inline icons for server-rendered HTML: src/icons/<name>.svg read once, tagged with classes.
// Client-created DOM uses the sprite the build writes to assets/icons.svg instead.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const dir = join(import.meta.dirname, '..', 'icons');
const cache = new Map();
for (const file of readdirSync(dir)) {
  if (file.endsWith('.svg')) cache.set(file.slice(0, -4), readFileSync(join(dir, file), 'utf8').trim());
}

export const iconNames = () => [...cache.keys()];

// icon('clock') -> decorative <svg class="i i-clock" aria-hidden="true">; unknown names throw so a
// typo fails the build instead of shipping an empty box.
export function icon(name, extra = '') {
  const svg = cache.get(name);
  if (!svg) throw new Error(`unknown icon: ${name}`);
  return svg.replace('<svg ', `<svg class="i i-${name}${extra ? ' ' + extra : ''}" aria-hidden="true" focusable="false" `);
}

// A task added to the taxonomy later gets a generic glyph until it has its own icon.
export const taskIcon = (task, extra) => icon(cache.has('task-' + task.id) ? 'task-' + task.id : 'sparkle', extra);
export const catIcon = (cat, extra) => icon(cat.icon, extra);
