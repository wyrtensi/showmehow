// Server HTML of the saddle-height widget (docs/spec.md 11.6). The formula, a small table and the
// heel-on-pedal check are plain text, so the widget is useful without JavaScript; client.js adds
// the live calculator. Visible strings are ru/en here, chosen by ctx.lang.
import { esc } from '../../render/util.js';
import { INSEAM_MIN, INSEAM_MAX, FACTOR, saddleHeight, formatCm } from './client.js';

const TEXT = {
  ru: {
    title: 'Высота седла',
    lead: 'Встаньте без обуви спиной к стене, зажмите между ног книгу, как седло, и отметьте её верхний край. Измерьте от отметки до пола: это длина внутренней стороны ноги.',
    inseam: 'Длина ноги, см',
    hint: `От ${INSEAM_MIN} до ${INSEAM_MAX}`,
    placeholder: 'Например, 80',
    resultLabel: 'Высота седла',
    unit: 'см',
    note: 'От центра каретки (оси шатунов) до верха седла вдоль подседельной трубы.',
    start: 'Это отправная точка, а не точный размер. Проедьтесь и меняйте высоту небольшими шагами, по несколько миллиметров.',
    formula: `Формула: длина ноги × ${String(FACTOR).replace(".", ",")}.`,
    error: `Введите число от ${INSEAM_MIN} до ${INSEAM_MAX}.`,
    heelTitle: 'Проверка пяткой',
    heel: 'Сядьте на седло, держа спину прямо. Поставьте пятку на педаль в самой нижней точке, когда шатун смотрит вниз. Нога должна почти выпрямиться. Если приходится наклонять таз, седло высоко. Если колено заметно согнуто, низко.',
    tableInseam: 'Длина ноги, см',
    tableSaddle: 'Седло, см',
    svgLabel: 'Схема велосипеда: расстояние от центра каретки до верха седла'
  },
  en: {
    title: 'Saddle height',
    lead: 'Stand barefoot with your back to a wall, hold a book between your legs like a saddle and mark its top edge. Measure from the mark to the floor: that is your inseam.',
    inseam: 'Inseam, cm',
    hint: `From ${INSEAM_MIN} to ${INSEAM_MAX}`,
    placeholder: 'For example, 80',
    resultLabel: 'Saddle height',
    unit: 'cm',
    note: 'From the centre of the bottom bracket (the crank axle) to the top of the saddle, along the seat tube.',
    start: 'This is a starting point, not an exact size. Ride a little and adjust in small steps of a few millimetres.',
    formula: `Formula: inseam × ${FACTOR}.`,
    error: `Enter a number from ${INSEAM_MIN} to ${INSEAM_MAX}.`,
    heelTitle: 'Heel check',
    heel: 'Sit on the saddle with a straight back. Put your heel on the pedal at its lowest point, with the crank pointing down. Your leg should be almost straight. If you have to tilt your hips, the saddle is too high. If the knee is clearly bent, it is too low.',
    tableInseam: 'Inseam, cm',
    tableSaddle: 'Saddle, cm',
    svgLabel: 'Bike diagram: distance from the bottom bracket centre to the top of the saddle'
  }
};

// Side view of a frame; the highlighted line is the measured distance along the seat tube.
const SCHEMATIC = `<svg class="wgt-art" viewBox="0 0 260 220" role="img" aria-label="__LABEL__" fill="none" stroke-linecap="round" stroke-linejoin="round">
<g class="s-ink" stroke-width="3"><path d="M110 165L78 52M78 52L205 60M110 165L210 98M205 52L212 100M110 165L40 165M40 165L85 66"/></g>
<path class="s-ink" stroke-width="5" d="M78 52L74 28"/>
<path class="f-accent" d="M46 22Q46 14 54 14H98Q106 14 106 22Q106 29 98 29H62Q52 29 46 22Z"/>
<path class="s-ink" stroke-width="4" d="M110 165L112 198"/>
<rect class="f-muted s-ink" stroke-width="2" x="98" y="198" width="30" height="8" rx="3"/>
<circle class="f-paper s-ink" stroke-width="3" cx="110" cy="165" r="9"/>
<g class="s-hl" stroke-width="3"><path d="M110 165L131 159M74 16L95 10M131 159L95 10"/></g>
<g class="f-hl"><polygon stroke="none" points="95,10 102.7,20.5 92.9,22.9"/><polygon stroke="none" points="131,159 133.1,146.1 123.3,148.5"/></g>
</svg>`;

export function render(params, ctx = {}) {
  const s = TEXT[ctx.lang] || TEXT.ru;
  const lang = ctx.lang === 'en' ? 'en' : 'ru';
  const rows = [65, 70, 75, 80, 85, 90, 95, 100]
    .map((cm) => `<tr><td>${esc(formatCm(cm, lang).replace(/[.,]0$/, ''))}</td><td>${esc(formatCm(saddleHeight(cm), lang))}</td></tr>`)
    .join('');
  return `<div class="wgt wgt-saddle">
<div class="wgt-head"><h3 class="wgt-title">${esc(s.title)}</h3><p class="wgt-lead">${esc(s.lead)}</p></div>
<div class="wgt-split">
<div class="wgt-art-box">${SCHEMATIC.replace('__LABEL__', esc(s.svgLabel))}</div>
<div class="wgt-side">
<form class="wgt-form" data-js novalidate>
<div class="field"><label for="wgt-saddle-inseam">${esc(s.inseam)}</label><input id="wgt-saddle-inseam" type="text" inputmode="decimal" autocomplete="off" data-inseam placeholder="${esc(s.placeholder)}" aria-describedby="wgt-saddle-hint"><p class="wgt-hint" id="wgt-saddle-hint">${esc(s.hint)}</p></div>
<p class="wgt-error" role="alert" data-error hidden>${esc(s.error)}</p>
</form>
<div class="wgt-result" data-result data-js>
<p class="wgt-result-label">${esc(s.resultLabel)}</p>
<p class="wgt-big" aria-live="polite"><span data-value>&ndash;</span> <span class="wgt-unit">${esc(s.unit)}</span></p>
<p class="wgt-result-note">${esc(s.note)}</p>
</div>
</div>
</div>
<p class="wgt-start">${esc(s.start)} ${esc(s.formula)}</p>
<div class="wgt-nojs"><table class="wgt-table"><thead><tr><th scope="col">${esc(s.tableInseam)}</th><th scope="col">${esc(s.tableSaddle)}</th></tr></thead><tbody>${rows}</tbody></table></div>
<div class="wgt-tip"><p class="wgt-tip-title">${esc(s.heelTitle)}</p><p>${esc(s.heel)}</p></div>
</div>`;
}
