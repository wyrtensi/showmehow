// Parameter check for the washer-panel widget:
//   machine: <id>   (required, a file data/washers/<id>.json must exist)
import { machineExists } from './render.js';

const KNOWN = ['machine'];

export function validate(params) {
  const errors = [];
  const p = params && typeof params === 'object' ? params : {};
  for (const key of Object.keys(p)) {
    if (!KNOWN.includes(key)) errors.push(`unknown parameter "${key}" (allowed: ${KNOWN.join(', ')})`);
  }
  if (p.machine === undefined || p.machine === null || p.machine === '') errors.push('machine is required (an id from data/washers/)');
  else if (typeof p.machine !== 'string' || !/^[a-z0-9-]+$/.test(p.machine)) errors.push(`machine must be a kebab-case id, got "${p.machine}"`);
  else if (!machineExists(p.machine)) errors.push(`no machine data data/washers/${p.machine}.json`);
  return errors;
}
