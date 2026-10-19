// Browser part of the saddle-height widget, plus the pure maths the tests and render.js share.
// Rule of thumb (LeMond): saddle height = inseam x 0.883, measured from the centre of the bottom
// bracket to the top of the saddle along the seat tube. It is a starting point, not a fit.
export const INSEAM_MIN = 50;
export const INSEAM_MAX = 110;
export const FACTOR = 0.883;

// Saddle height in cm for an inseam in cm, rounded to 0.1 cm.
export function saddleHeight(inseamCm) {
  return Math.round(inseamCm * FACTOR * 10) / 10;
}

// "80", "80,5", " 80.5 cm " -> number, or null when it is not a number in INSEAM_MIN..INSEAM_MAX.
export function parseInseam(text) {
  const cleaned = String(text ?? '').trim().replace(/\s*(cm|см)\s*$/i, '').replace(',', '.');
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(cleaned)) return null;
  const value = Number(cleaned);
  return value >= INSEAM_MIN && value <= INSEAM_MAX ? value : null;
}

export function formatCm(value, lang) {
  return new Intl.NumberFormat(lang === 'en' ? 'en' : 'ru', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value);
}

export function mount(root, params, ctx = {}) {
  const input = root.querySelector('[data-inseam]');
  const value = root.querySelector('[data-value]');
  const result = root.querySelector('[data-result]');
  const error = root.querySelector('[data-error]');
  if (!input || !value || !result || !error) return;
  const dash = value.textContent;

  function update(final) {
    const inseam = parseInseam(input.value);
    const empty = input.value.trim() === '';
    if (inseam !== null) {
      value.textContent = formatCm(saddleHeight(inseam), ctx.lang);
      result.classList.add('is-ready');
      error.hidden = true;
      input.removeAttribute('aria-invalid');
      return;
    }
    value.textContent = dash;
    result.classList.remove('is-ready');
    const invalid = !empty && final;
    error.hidden = !invalid;
    if (invalid) input.setAttribute('aria-invalid', 'true');
    else input.removeAttribute('aria-invalid');
  }

  input.addEventListener('input', () => update(false));
  input.addEventListener('change', () => update(true));
  root.querySelector('form')?.addEventListener('submit', (event) => { event.preventDefault(); update(true); });
  update(false);
}
