// Server HTML of the wifi-qr widget (docs/spec.md 11.6). Without JavaScript it explains the
// WIFI: text format; client.js turns the form into a live QR code and a printable card.
// All visible strings live here (ru/en, chosen by ctx.lang); the client reads the few it needs
// from data attributes and hidden [data-msg] elements instead of keeping a second dictionary.
import { esc } from '../../render/util.js';
import { icon } from '../../render/icons.js';
import { SECURITY } from './schema.js';

const TEXT = {
  ru: {
    title: 'QR-код для входа в Wi-Fi',
    lead: 'Введите данные сети. Гости наведут камеру телефона на код и подключатся без ввода пароля. Всё считается на вашем устройстве, ничего не отправляется.',
    ssid: 'Название сети',
    ssidPlaceholder: 'Например, Home',
    password: 'Пароль',
    show: 'Показать',
    hide: 'Скрыть',
    security: 'Тип защиты',
    WPA: 'WPA / WPA2 / WPA3 (обычный)',
    WEP: 'WEP (устаревший)',
    nopass: 'Без пароля',
    print: 'Распечатать карточку',
    emptyName: 'Введите название сети, и здесь появится код.',
    emptyPass: 'Введите пароль или выберите «Без пароля».',
    tooLong: 'Название и пароль слишком длинные для QR-кода.',
    cardHint: 'Наведите камеру телефона на код, чтобы подключиться к Wi-Fi',
    qrLabel: 'QR-код для подключения к Wi-Fi',
    noJs: 'Для этого инструмента нужен JavaScript. Без него соберите текст вручную и вставьте его в любой генератор QR-кодов. В названии сети и пароле символы \\ ; , : " нужно писать с обратной косой чертой перед ними.',
    format: 'Формат текста'
  },
  en: {
    title: 'Wi-Fi QR code',
    lead: 'Enter your network details. Guests point their phone camera at the code and join without typing the password. Everything is computed on your device, nothing is sent anywhere.',
    ssid: 'Network name',
    ssidPlaceholder: 'For example, Home',
    password: 'Password',
    show: 'Show',
    hide: 'Hide',
    security: 'Security',
    WPA: 'WPA / WPA2 / WPA3 (usual)',
    WEP: 'WEP (outdated)',
    nopass: 'No password',
    print: 'Print card',
    emptyName: 'Enter the network name and the code appears here.',
    emptyPass: 'Enter the password or choose "No password".',
    tooLong: 'The name and password are too long for a QR code.',
    cardHint: 'Point your phone camera at the code to join the Wi-Fi network',
    qrLabel: 'QR code for joining the Wi-Fi network',
    noJs: 'This tool needs JavaScript. Without it, build the text by hand and paste it into any QR code generator. In the network name and password, put a backslash before each of these characters: \\ ; , : "',
    format: 'Text format'
  }
};

let seq = 0;

export function render(params, ctx = {}) {
  const s = TEXT[ctx.lang] || TEXT.ru;
  const security = SECURITY.includes(params?.security) ? params.security : 'WPA';
  const id = `wgt-wifi-${++seq}`;
  const options = SECURITY.map((value) => `<option value="${value}"${value === security ? ' selected' : ''}>${esc(s[value])}</option>`).join('');
  return `<div class="wgt wgt-wifi">
<div class="wgt-head"><h3 class="wgt-title">${esc(s.title)}</h3><p class="wgt-lead">${esc(s.lead)}</p></div>
<div class="wgt-nojs"><p>${esc(s.noJs)}</p><p>${esc(s.format)}: <code>WIFI:T:WPA;S:${esc('<name>')};P:${esc('<password>')};;</code></p></div>
<form class="wgt-form" data-js novalidate>
<div class="field"><label for="${id}-ssid">${esc(s.ssid)}</label><input id="${id}-ssid" name="ssid" type="text" data-ssid autocomplete="off" autocapitalize="none" autocorrect="off" spellcheck="false" maxlength="32" placeholder="${esc(s.ssidPlaceholder)}"></div>
<div class="field" data-pass-field><label for="${id}-pass">${esc(s.password)}</label><div class="wgt-pass"><input id="${id}-pass" name="password" type="password" data-pass autocomplete="off" autocapitalize="none" autocorrect="off" spellcheck="false" maxlength="63"><button type="button" class="btn btn-soft wgt-toggle" data-toggle aria-pressed="false" data-show="${esc(s.show)}" data-hide="${esc(s.hide)}">${esc(s.show)}</button></div></div>
<div class="field"><label for="${id}-sec">${esc(s.security)}</label><div class="select"><select id="${id}-sec" name="security" data-security>${options}</select>${icon('chevron-down')}</div></div>
</form>
<div class="wgt-out" data-js>
<figure class="wgt-card" data-card>
<div class="wgt-qr" data-qr aria-live="polite"><p class="wgt-qr-empty" data-empty>${esc(s.emptyName)}</p></div>
<figcaption class="wgt-card-text"><strong class="wgt-card-name" data-card-name></strong><span class="wgt-card-hint">${esc(s.cardHint)}</span></figcaption>
</figure>
<button type="button" class="btn btn-primary btn-lg wgt-main" data-print disabled>${esc(s.print)}</button>
</div>
<div hidden><span data-msg="emptyName">${esc(s.emptyName)}</span><span data-msg="emptyPass">${esc(s.emptyPass)}</span><span data-msg="tooLong">${esc(s.tooLong)}</span><span data-msg="qrLabel">${esc(s.qrLabel)}</span></div>
</div>`;
}
