// Browser part of the wifi-qr widget: live QR code from the form, show/hide password, print card.
// The pure helpers (escapeWifi, wifiString) are exported for the tests; nothing here touches the
// DOM until mount() runs. Nothing typed is stored or sent anywhere.
import { encode, toSvg } from './qr.js';

const TYPES = ['WPA', 'WEP', 'nopass'];

// Backslash first, then ; , : and the double quote, as the WIFI: format requires.
export function escapeWifi(value) {
  return String(value ?? '').replace(/[\\;,:"]/g, '\\$&');
}

// WIFI:T:<WPA|WEP|nopass>;S:<ssid>;P:<password>;;  (no P: field for an open network).
export function wifiString({ ssid, password = '', security = 'WPA' }) {
  const type = TYPES.includes(security) ? security : 'WPA';
  const pass = type === 'nopass' ? '' : `P:${escapeWifi(password)};`;
  return `WIFI:T:${type};S:${escapeWifi(ssid)};${pass};`;
}

export function mount(root) {
  const $ = (selector) => root.querySelector(selector);
  const msg = (key) => $(`[data-msg="${key}"]`)?.textContent || '';
  const ssid = $('[data-ssid]');
  const pass = $('[data-pass]');
  const security = $('[data-security]');
  const passField = $('[data-pass-field]');
  const toggle = $('[data-toggle]');
  const qrBox = $('[data-qr]');
  const cardName = $('[data-card-name]');
  const printBtn = $('[data-print]');
  const card = $('[data-card]');
  if (!ssid || !pass || !security || !qrBox || !printBtn || !card) return;

  const showEmpty = (text) => {
    qrBox.textContent = '';
    const p = document.createElement('p');
    p.className = 'wgt-qr-empty';
    p.textContent = text;
    qrBox.append(p);
    cardName.textContent = '';
    printBtn.disabled = true;
  };

  function update() {
    const open = security.value === 'nopass';
    passField.hidden = open;
    if (!ssid.value) return showEmpty(msg('emptyName'));
    if (!open && !pass.value) return showEmpty(msg('emptyPass'));
    try {
      const qr = encode(wifiString({ ssid: ssid.value, password: pass.value, security: security.value }));
      qrBox.innerHTML = toSvg(qr, { label: msg('qrLabel') });
      cardName.textContent = ssid.value;
      printBtn.disabled = false;
    } catch (error) {
      showEmpty(msg('tooLong'));
    }
  }

  toggle.addEventListener('click', () => {
    const shown = pass.type === 'text';
    pass.type = shown ? 'password' : 'text';
    toggle.setAttribute('aria-pressed', String(!shown));
    toggle.textContent = shown ? toggle.dataset.show : toggle.dataset.hide;
  });

  for (const el of [ssid, pass, security]) el.addEventListener('input', update);
  root.querySelector('form')?.addEventListener('submit', (event) => event.preventDefault());

  // Print only the card: a clone goes into a print-only container, the stylesheet hides the rest
  // of the page while <html> carries wgt-printing. A normal Ctrl+P of the guide is not affected.
  printBtn.addEventListener('click', () => {
    const html = document.documentElement;
    document.querySelectorAll('.wgt-print-root').forEach((stale) => stale.remove());
    const host = document.createElement('div');
    host.className = 'wgt-print-root';
    host.append(card.cloneNode(true));
    document.body.append(host);
    html.classList.add('wgt-printing');
    const cleanup = () => {
      html.classList.remove('wgt-printing');
      host.remove();
      window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup);
    window.print();
  });

  update();
}
