// Server HTML of the reminder widget (docs/spec.md 11.6). Without JavaScript it states the schedule
// in words so the person can set a repeating event by hand; client.js builds the .ics file.
// Visible strings are ru/en here, chosen by ctx.lang; the client reads its messages from
// hidden [data-msg] elements.
import { esc } from '../../render/util.js';
import { EVERY } from './schema.js';

const TEXT = {
  ru: {
    title: 'Напоминание',
    start: 'Первый раз',
    button: 'Скачать напоминание (.ics)',
    help: 'Откройте скачанный файл, и календарь на телефоне или компьютере добавит повторяющееся событие.',
    noDate: 'Выберите дату.',
    done: 'Файл скачан. Откройте его, чтобы добавить напоминание в календарь.',
    warning: 'В коротких месяцах такого числа нет, и календарь пропустит их. Выберите число не позже 28-го.',
    source: 'Инструкция',
    noJs: (title, when) => `Для файла календаря нужен JavaScript. Без него заведите в календаре повторяющееся событие вручную: «${title}», ${when}.`,
    every: { '2w': 'каждые 2 недели', '1m': 'каждый месяц', '3m': 'каждые 3 месяца', '6m': 'каждые 6 месяцев', '1y': 'каждый год' }
  },
  en: {
    title: 'Reminder',
    start: 'First time on',
    button: 'Download reminder (.ics)',
    help: 'Open the downloaded file and the calendar on your phone or computer adds a repeating event.',
    noDate: 'Pick a date.',
    done: 'File downloaded. Open it to add the reminder to your calendar.',
    warning: 'Shorter months do not have this day, so calendars skip them. Pick a day up to the 28th.',
    source: 'Guide',
    noJs: (title, when) => `The calendar file needs JavaScript. Without it, add a repeating event to your calendar by hand: "${title}", ${when}.`,
    every: { '2w': 'every 2 weeks', '1m': 'every month', '3m': 'every 3 months', '6m': 'every 6 months', '1y': 'every year' }
  }
};

export function render(params, ctx = {}) {
  const s = TEXT[ctx.lang] || TEXT.ru;
  const every = EVERY.includes(params?.every) ? params.every : '3m';
  const title = String(params?.title ?? '');
  const when = s.every[every];
  const guide = ctx.guide?.title ? String(ctx.guide.title) : '';
  return `<div class="wgt wgt-reminder" data-reminder data-every="${esc(every)}" data-title="${esc(title)}" data-guide="${esc(guide)}">
<div class="wgt-head"><h3 class="wgt-title">${esc(s.title)}</h3><p class="wgt-lead"><strong>${esc(title)}</strong> <span class="wgt-chip">${esc(when)}</span></p></div>
<p class="wgt-nojs">${esc(s.noJs(title, when))}</p>
<form class="wgt-form" data-js novalidate>
<div class="field"><label for="wgt-rem-start">${esc(s.start)}</label><input id="wgt-rem-start" name="start" type="date" required data-start></div>
<p class="wgt-note" data-warning hidden>${esc(s.warning)}</p>
<button type="submit" class="btn btn-primary btn-lg wgt-main">${esc(s.button)}</button>
<p class="wgt-hint">${esc(s.help)}</p>
<p class="wgt-status" role="status" aria-live="polite" data-status></p>
</form>
<div hidden><span data-msg="noDate">${esc(s.noDate)}</span><span data-msg="done">${esc(s.done)}</span><span data-msg="source">${esc(s.source)}</span></div>
</div>`;
}
