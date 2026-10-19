// Browser part of the reminder widget plus the iCalendar (RFC 5545) builder the tests use.
// buildIcs() is pure: DTSTAMP and UID can be injected, so the output is deterministic in tests.

const RRULES = {
  '2w': 'FREQ=WEEKLY;INTERVAL=2',
  '1m': 'FREQ=MONTHLY;INTERVAL=1',
  '3m': 'FREQ=MONTHLY;INTERVAL=3',
  '6m': 'FREQ=MONTHLY;INTERVAL=6',
  '1y': 'FREQ=YEARLY;INTERVAL=1'
};

export const rrule = (every) => RRULES[every] ?? null;

const pad = (n, width = 2) => String(n).padStart(width, '0');
const encoder = new TextEncoder();

// TEXT value escaping: backslash, semicolon, comma and line breaks.
export function escapeText(value) {
  return String(value ?? '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r\n|\r|\n/g, '\\n');
}

// Folds one content line so no physical line exceeds `limit` octets (continuations start with one
// space that counts towards the limit). Splits only between code points, never inside UTF-8.
export function foldLine(line, limit = 75) {
  const parts = [];
  let current = '';
  let used = 0;
  for (const ch of line) {
    const size = encoder.encode(ch).length;
    if (used + size > limit) {
      parts.push(current);
      current = ' ';
      used = 1;
    }
    current += ch;
    used += size;
  }
  parts.push(current);
  return parts.join('\r\n');
}

// 'YYYY-MM-DD' -> {y, m, d} for a real calendar date, otherwise null.
export function parseDate(text) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(text ?? ''));
  if (!match) return null;
  const [y, m, d] = match.slice(1).map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d ? { y, m, d } : null;
}

const compactDate = ({ y, m, d }) => `${pad(y, 4)}${pad(m)}${pad(d)}`;

function nextDay({ y, m, d }) {
  const date = new Date(Date.UTC(y, m - 1, d + 1));
  return { y: date.getUTCFullYear(), m: date.getUTCMonth() + 1, d: date.getUTCDate() };
}

// 20261019T093000Z
export function utcStamp(date) {
  return `${pad(date.getUTCFullYear(), 4)}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`;
}

// True when a monthly or yearly rule would silently skip some periods: day 29-31 for monthly
// rules (short months have no such day) and 29 February for yearly ones.
export function skipsShortMonths(every, start) {
  const date = typeof start === 'string' ? parseDate(start) : start;
  if (!date) return false;
  if (/m$/.test(every)) return date.d > 28;
  if (every === '1y') return date.m === 2 && date.d === 29;
  return false;
}

function randomId() {
  const c = globalThis.crypto;
  if (c?.randomUUID) return c.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

// One all-day, repeating VEVENT. start is 'YYYY-MM-DD'. Lines are joined with CRLF and the file
// ends with CRLF, as the RFC requires.
export function buildIcs({ title, every, start, description = '', url = '', now = new Date(), uid = `${randomId()}@showmehow` }) {
  const rule = rrule(every);
  if (!rule) throw new RangeError(`unknown repeat interval "${every}"`);
  const first = parseDate(start);
  if (!first) throw new RangeError(`invalid start date "${start}"`);
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Show Me How//Reminder//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${escapeText(uid)}`,
    `DTSTAMP:${utcStamp(now)}`,
    `DTSTART;VALUE=DATE:${compactDate(first)}`,
    `DTEND;VALUE=DATE:${compactDate(nextDay(first))}`,
    `RRULE:${rule}`,
    `SUMMARY:${escapeText(title)}`
  ];
  if (description) lines.push(`DESCRIPTION:${escapeText(description)}`);
  if (/^https?:\/\//i.test(url)) lines.push(`URL:${url.replace(/[\r\n]/g, '')}`);
  lines.push('TRANSP:TRANSPARENT', 'END:VEVENT', 'END:VCALENDAR');
  return `${lines.map((line) => foldLine(line)).join('\r\n')}\r\n`;
}

// Local calendar date of `date` as 'YYYY-MM-DD' (the value an <input type="date"> takes).
export const localIsoDate = (date = new Date()) => `${pad(date.getFullYear(), 4)}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export function mount(root) {
  const form = root.querySelector('form');
  const input = root.querySelector('[data-start]');
  const status = root.querySelector('[data-status]');
  const warning = root.querySelector('[data-warning]');
  const msg = (key) => root.querySelector(`[data-msg="${key}"]`)?.textContent || '';
  if (!form || !input || !status) return;
  const { every, title, guide } = root.querySelector('[data-reminder]').dataset;

  input.value = localIsoDate();

  const refresh = () => {
    if (warning) warning.hidden = !skipsShortMonths(every, input.value);
    status.textContent = '';
  };
  input.addEventListener('input', refresh);
  refresh();

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!parseDate(input.value)) {
      status.textContent = msg('noDate');
      return;
    }
    const description = [guide ? `${msg('source')}: ${guide}` : '', location.href.split('#')[0]].filter(Boolean).join('\n');
    const text = buildIcs({ title, every, start: input.value, description, url: location.href.split('#')[0] });
    const href = URL.createObjectURL(new Blob([text], { type: 'text/calendar;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = href;
    link.download = 'reminder.ics';
    link.hidden = true;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(href), 10000);
    status.textContent = msg('done');
  });
}
