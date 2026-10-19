// Parameter check for the wifi-qr widget. Params come from guide frontmatter or a widget block:
//   security: WPA | WEP | nopass   (optional, presets the select; default WPA)
export const SECURITY = ['WPA', 'WEP', 'nopass'];
const KNOWN = ['security'];

export function validate(params) {
  const errors = [];
  const p = params && typeof params === 'object' ? params : {};
  for (const key of Object.keys(p)) {
    if (!KNOWN.includes(key)) errors.push(`unknown parameter "${key}" (allowed: ${KNOWN.join(', ')})`);
  }
  if (p.security !== undefined && !SECURITY.includes(p.security)) {
    errors.push(`security must be one of ${SECURITY.join(', ')}, got "${p.security}"`);
  }
  return errors;
}
