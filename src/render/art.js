// Decorative inline illustrations. They use the same colour classes as guide illustrations
// (docs/spec.md 4.4), so they follow the page accent and both themes.

const svg = (viewBox, body, extra = '') => `<svg class="art${extra ? ' ' + extra : ''}" viewBox="${viewBox}" aria-hidden="true" focusable="false">${body}</svg>`;

const sparkle = (x, y, r, c = 'f-hl') => `<path class="${c}" d="M${x} ${y - r}C${x + r * 0.18} ${y - r * 0.18} ${x + r * 0.18} ${y - r * 0.18} ${x + r} ${y}C${x + r * 0.18} ${y + r * 0.18} ${x + r * 0.18} ${y + r * 0.18} ${x} ${y + r}C${x - r * 0.18} ${y + r * 0.18} ${x - r * 0.18} ${y + r * 0.18} ${x - r} ${y}C${x - r * 0.18} ${y - r * 0.18} ${x - r * 0.18} ${y - r * 0.18} ${x} ${y - r}Z"/>`;

const checkRow = (y, done, w) => (done
  ? `<circle class="f-ok" cx="24" cy="${y}" r="10"/><path class="s-paper" d="M19.5 ${y}l3.2 3.2 5.8-6.2" fill="none" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`
  : `<circle class="f-paper s-muted" cx="24" cy="${y}" r="9" stroke-width="2.5"/>`) +
  `<rect class="${done ? 'f-muted' : 'f-soft'}" x="44" y="${y - 4}" width="${w}" height="8" rx="4"/>`;

export function logoMark() {
  return `<svg class="logo-mark" viewBox="0 0 40 40" aria-hidden="true" focusable="false"><rect class="lm-bg" width="40" height="40" rx="12"/><path class="lm-steps" d="M8.5 30.5H16v-7h7.5v-7H31" fill="none" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/><circle class="lm-dot" cx="30.5" cy="9.5" r="3.8"/></svg>`;
}

export function heroArt() {
  return svg('0 0 520 440', `
<path class="f-accent-soft" d="M262 18c92-6 196 40 228 128 30 84-12 186-92 238-82 52-206 54-284 6C36 342 8 248 34 166 60 82 168 24 262 18z" opacity=".75"/>
<circle class="f-accent" cx="460" cy="380" r="10" opacity=".35"/><circle class="f-accent" cx="58" cy="96" r="7" opacity=".35"/><circle class="f-hl" cx="96" cy="372" r="5" opacity=".6"/>
<g class="hero-phone">
<rect class="f-ink" x="172" y="38" width="190" height="364" rx="36"/>
<rect class="f-paper" x="182" y="48" width="170" height="344" rx="28"/>
<rect class="f-muted" x="247" y="58" width="40" height="8" rx="4"/>
<rect class="f-soft" x="200" y="84" width="134" height="8" rx="4"/>
<rect class="f-accent hero-progress" x="200" y="84" width="84" height="8" rx="4"/>
<circle class="f-accent" cx="214" cy="122" r="14"/>
<path class="s-paper" d="M208 122.5l4 4 8-8.5" fill="none" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
<rect class="f-muted" x="236" y="113" width="92" height="8" rx="4"/><rect class="f-soft" x="236" y="127" width="62" height="7" rx="3.5"/>
<rect class="f-accent-soft" x="198" y="152" width="138" height="112" rx="18"/>
<rect class="f-soft s-ink" x="236" y="172" width="62" height="70" rx="24" stroke-width="2.5"/>
<path class="s-ink" d="M236 196h62" fill="none" stroke-width="2" stroke-linecap="round"/>
<circle class="f-paper s-ink" cx="267" cy="222" r="7" stroke-width="2.5"/>
<circle class="s-hl anim-pulse" cx="267" cy="222" r="15" fill="none" stroke-width="3"/>
<circle class="f-ok anim-pulse" cx="267" cy="184" r="4"/>
<rect class="f-soft" x="198" y="278" width="138" height="7" rx="3.5"/><rect class="f-soft" x="198" y="292" width="112" height="7" rx="3.5"/><rect class="f-soft" x="198" y="306" width="124" height="7" rx="3.5"/>
<rect class="f-accent" x="198" y="334" width="138" height="38" rx="19"/>
<path class="s-paper anim-nudge" d="M256 353h22M272 346.5l6.5 6.5-6.5 6.5" fill="none" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
</g>
<g class="float-card fc-1">
<rect class="f-paper s-line" x="34" y="168" width="150" height="132" rx="22" stroke-width="1.5" transform="translate(-14 0)"/>
<g transform="translate(20 196)">${checkRow(0, true, 76)}${checkRow(36, true, 58)}${checkRow(72, false, 70)}</g>
</g>
<g class="float-card fc-2">
<circle class="f-paper s-line" cx="420" cy="92" r="40" stroke-width="1.5"/>
<circle class="s-accent" cx="420" cy="92" r="22" fill="none" stroke-width="4"/>
<path class="s-ink" d="M420 80v13l8 6" fill="none" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
</g>
<g class="float-card fc-3">
<rect class="f-paper s-line" x="384" y="226" width="104" height="104" rx="26" stroke-width="1.5"/>
<path class="f-soft s-ink" d="M424 252a16 16 0 1 1 18 22v26a7 7 0 0 1-14 0v-24a16 16 0 0 1-4-24z" stroke-width="2.5" stroke-linejoin="round"/>
<path class="s-accent" d="M462 258a12 12 0 0 1 0 18M470 250a22 22 0 0 1 0 34" fill="none" stroke-width="3" stroke-linecap="round"/>
</g>
<path class="f-soft s-ink anim-tap" d="M330 430c0-30-3-46-14-56-7-6-15-6-20 0l-4 6c-3-9-12-11-18-6-5 4-5 11-2 17l10 17c3 6 4 13 4 22z" stroke-width="3" stroke-linejoin="round"/>
${sparkle(130, 120, 14)}${sparkle(470, 180, 10)}${sparkle(150, 350, 9, 'f-accent')}${sparkle(380, 400, 8)}
`, 'hero-art');
}

export function emptyArt() {
  return svg('0 0 220 150', `
<ellipse class="f-accent-soft" cx="110" cy="128" rx="86" ry="14"/>
<path class="f-soft s-ink" d="M50 62l60-22 60 22v52l-60 22-60-22z" stroke-width="3" stroke-linejoin="round"/>
<path class="f-muted" d="M50 62l60 22 60-22-60-22z" opacity=".55"/>
<path class="s-ink" d="M50 62l60 22 60-22M110 84v52" fill="none" stroke-width="3" stroke-linejoin="round"/>
<path class="f-accent s-ink" d="M50 62l-18 24 60 22 18-24z" stroke-width="3" stroke-linejoin="round"/>
<path class="s-accent anim-nudge" d="M100 22c0-9 7-14 14-14s13 5 13 12c0 9-11 10-11 19M116 50v.5" fill="none" stroke-width="4" stroke-linecap="round"/>
${sparkle(176, 38, 9)}${sparkle(36, 40, 7, 'f-accent')}
`, 'empty-art');
}

export function requestArt() {
  return svg('0 0 240 180', `
<circle class="f-accent-soft" cx="124" cy="92" r="78" opacity=".8"/>
<path class="f-paper s-ink" d="M58 46h112a16 16 0 0 1 16 16v54a16 16 0 0 1-16 16h-56l-30 24v-24H58a16 16 0 0 1-16-16V62a16 16 0 0 1 16-16z" stroke-width="3" stroke-linejoin="round"/>
<rect class="f-muted" x="64" y="68" width="70" height="9" rx="4.5"/><rect class="f-soft" x="64" y="86" width="96" height="8" rx="4"/><rect class="f-soft" x="64" y="102" width="56" height="8" rx="4"/>
<circle class="f-accent anim-pulse" cx="184" cy="48" r="22"/>
<path class="s-paper" d="M184 38v20M174 48h20" fill="none" stroke-width="4" stroke-linecap="round"/>
<path class="f-hl" d="M196 132c0-6 5-10 10-10 3 0 5 1 6 3 1-2 3-3 6-3 5 0 10 4 10 10 0 10-16 18-16 18s-16-8-16-18z" opacity=".9"/>
${sparkle(30, 140, 8)}${sparkle(214, 96, 7, 'f-accent')}
`, 'request-art');
}

export function notFoundArt() {
  return svg('0 0 300 200', `
<ellipse class="f-accent-soft" cx="150" cy="176" rx="130" ry="16"/>
<path class="s-muted" d="M24 176c40-18 70 6 110-10s70-30 140-6" fill="none" stroke-width="3" stroke-dasharray="2 10" stroke-linecap="round"/>
<path class="s-ink" d="M150 176V40" fill="none" stroke-width="5" stroke-linecap="round"/>
<path class="f-accent s-ink" d="M150 50h78l18 18-18 18h-78z" stroke-width="3" stroke-linejoin="round"/>
<path class="f-soft s-ink" d="M150 98H74l-18 18 18 18h76z" stroke-width="3" stroke-linejoin="round"/>
<path class="s-paper" d="M172 68h40M200 60l10 8-10 8" fill="none" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
<path class="s-ink" d="M128 116H86M96 108l-10 8 10 8" fill="none" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
<circle class="f-hl anim-pulse" cx="150" cy="36" r="8"/>
${sparkle(250, 132, 10)}${sparkle(42, 70, 8, 'f-accent')}
`, 'nf-art');
}

export function contributeArt() {
  return svg('0 0 240 180', `
<circle class="f-accent-soft" cx="120" cy="92" r="80" opacity=".8"/>
<path class="f-paper s-ink" d="M62 24h82l30 30v104a8 8 0 0 1-8 8H62a8 8 0 0 1-8-8V32a8 8 0 0 1 8-8z" stroke-width="3" stroke-linejoin="round"/>
<path class="f-soft s-ink" d="M144 24v30h30" stroke-width="3" stroke-linejoin="round"/>
<circle class="f-accent" cx="80" cy="74" r="9"/><rect class="f-muted" x="96" y="70" width="52" height="8" rx="4"/>
<circle class="f-accent" cx="80" cy="104" r="9"/><rect class="f-muted" x="96" y="100" width="40" height="8" rx="4"/>
<circle class="f-paper s-muted" cx="80" cy="134" r="8" stroke-width="2.5"/><rect class="f-soft" x="96" y="130" width="46" height="8" rx="4"/>
<g class="anim-nudge"><path class="f-hl s-ink" d="M196 56l18 18-62 62-24 6 6-24z" stroke-width="3" stroke-linejoin="round"/><path class="s-ink" d="M184 68l18 18" fill="none" stroke-width="3"/></g>
${sparkle(36, 40, 9)}${sparkle(214, 150, 7, 'f-accent')}
`, 'contrib-art');
}
