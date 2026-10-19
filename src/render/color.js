// Category colours: OKLCH hue from the taxonomy -> sRGB hex tokens for both themes.
// Computed at build time so every browser gets plain hex, and text tokens are pushed until they
// pass WCAG AA against the surfaces they sit on.

const PAPER_LIGHT = '#fbf7f1';
const SURFACE_DARK = '#1b2330';

function oklabToLinear(L, a, b) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s
  ];
}

const inGamut = (rgb) => rgb.every((c) => c >= -1e-4 && c <= 1 + 1e-4);
const gamma = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

// OKLCH -> hex, reducing chroma until the colour fits sRGB.
export function oklch(L, C, h) {
  const rad = (h * Math.PI) / 180;
  let c = C, rgb;
  for (;;) {
    rgb = oklabToLinear(L, c * Math.cos(rad), c * Math.sin(rad));
    if (inGamut(rgb) || c <= 0) break;
    c = Math.max(0, c - 0.005);
  }
  return '#' + rgb.map((v) => Math.round(Math.min(1, Math.max(0, gamma(Math.min(1, Math.max(0, v))))) * 255).toString(16).padStart(2, '0')).join('');
}

function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a, b) {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

// Walk lightness in `step` until the colour reaches `ratio` against every background.
function readable(L, C, h, against, ratio, step) {
  let hex = oklch(L, C, h);
  while (against.some((bg) => contrast(hex, bg) < ratio) && L > 0.05 && L < 0.98) {
    L += step;
    hex = oklch(L, C, h);
  }
  return hex;
}

export function categoryTokens(hue) {
  return {
    light: {
      accent: oklch(0.66, 0.16, hue),
      'accent-strong': readable(0.5, 0.15, hue, ['#ffffff', PAPER_LIGHT], 4.8, -0.01),
      'accent-soft': oklch(0.9, 0.065, hue),
      'accent-tint': oklch(0.965, 0.026, hue),
      'accent-ink': readable(0.4, 0.11, hue, [oklch(0.9, 0.065, hue)], 5, -0.01),
      'accent-glow': oklch(0.8, 0.11, hue)
    },
    dark: {
      accent: oklch(0.74, 0.14, hue),
      'accent-strong': readable(0.8, 0.12, hue, [SURFACE_DARK], 7, 0.01),
      'accent-soft': oklch(0.4, 0.09, hue),
      'accent-tint': oklch(0.27, 0.04, hue),
      'accent-ink': readable(0.9, 0.06, hue, [oklch(0.4, 0.09, hue)], 5, 0.01),
      'accent-glow': oklch(0.5, 0.11, hue)
    }
  };
}

const decl = (tokens) => Object.entries(tokens).map(([k, v]) => `--${k}:${v}`).join(';');

export const BRAND_HUE = 30;

// CSS for every category: `.c-<id>` sets the accent tokens, :root gets the brand accent and
// --cat-<id> swatches.
export function categoryCss(categories) {
  const brand = categoryTokens(BRAND_HUE);
  const light = [], dark = [], rootLight = [decl(brand.light)], rootDark = [decl(brand.dark)];
  for (const c of categories) {
    const tk = categoryTokens(Number(c.hue) || 0);
    light.push(`.c-${c.id}{${decl(tk.light)}}`);
    dark.push(`.c-${c.id}{${decl(tk.dark)}}`);
    rootLight.push(`--cat-${c.id}:${tk.light.accent};--cat-${c.id}-soft:${tk.light['accent-soft']}`);
    rootDark.push(`--cat-${c.id}:${tk.dark.accent};--cat-${c.id}-soft:${tk.dark['accent-soft']}`);
  }
  const darkBlock = `:root{${rootDark.join(';')}}${dark.join('')}`;
  const scoped = darkBlock.replace(/(^|\})([^{}]+)\{/g, (m, end, sel) => `${end}${sel.split(',').map((s) => (s.trim() === ':root' ? ':root[data-theme="dark"]' : `:root[data-theme="dark"] ${s.trim()}`)).join(',')}{`);
  const media = darkBlock.replace(/(^|\})([^{}]+)\{/g, (m, end, sel) => `${end}${sel.split(',').map((s) => (s.trim() === ':root' ? ':root:not([data-theme="light"])' : `:root:not([data-theme="light"]) ${s.trim()}`)).join(',')}{`);
  return `:root{${rootLight.join(';')}}${light.join('')}@media screen and (prefers-color-scheme:dark){${media}}@media screen{${scoped}}`;
}
