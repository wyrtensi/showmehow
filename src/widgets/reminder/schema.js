// Parameter check for the reminder widget.
//   every: 2w | 1m | 3m | 6m | 1y   (required)
//   title: text of the calendar event (required, at most 100 characters)
export const EVERY = ['2w', '1m', '3m', '6m', '1y'];
const KNOWN = ['every', 'title'];

export function validate(params) {
  const errors = [];
  const p = params && typeof params === 'object' ? params : {};
  for (const key of Object.keys(p)) {
    if (!KNOWN.includes(key)) errors.push(`unknown parameter "${key}" (allowed: ${KNOWN.join(', ')})`);
  }
  if (p.every === undefined) errors.push(`every is required (${EVERY.join(', ')})`);
  else if (!EVERY.includes(p.every)) errors.push(`every must be one of ${EVERY.join(', ')}, got "${p.every}"`);
  if (p.title === undefined) errors.push('title is required');
  else if (typeof p.title !== 'string' || !p.title.trim()) errors.push('title must be a non-empty text');
  else if (p.title.length > 100) errors.push('title must be at most 100 characters');
  return errors;
}
