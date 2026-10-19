// Markdown-subset renderer (docs/spec.md 4.3 and 11). Whatever is not in the subset is escaped,
// never passed through. Problems are reported to opts.issues as {line, level, message}.
import { parseYaml } from './frontmatter.js';

export const ALERT_TYPES = ['note', 'tip', 'important', 'warning', 'caution'];

// Indicator lights (spec 11.1): {{led <colour>[/<colour>] [pattern]}}.
export const LED_COLORS = ['white', 'green', 'amber', 'red', 'blue'];
export const LED_PATTERNS = ['solid', 'blink', 'fast', 'pulse', 'alternate'];
export const TIMER_MAX = 3600;

// Duration text for timer chips: 15 -> {h: 0, m: 0, s: 15}.
const hms = (seconds) => ({ h: Math.floor(seconds / 3600), m: Math.floor((seconds % 3600) / 60), s: seconds % 60 });
const joinUnits = (seconds, [h, m, s]) => {
  const p = hms(seconds);
  return [p.h && `${p.h} ${h}`, p.m && `${p.m} ${m}`, p.s && `${p.s} ${s}`].filter(Boolean).join(' ');
};

const LED_RU = {
  color: { white: 'белым', green: 'зелёным', amber: 'оранжевым', red: 'красным', blue: 'синим' },
  pattern: { solid: 'Горит', blink: 'Мигает', fast: 'Часто мигает', pulse: 'Плавно мигает' },
  legend: { solid: '', blink: 'мигает', fast: 'часто мигает', pulse: 'плавно мигает', alternate: 'попеременно' }
};
const LED_EN = {
  color: { white: 'white', green: 'green', amber: 'amber', red: 'red', blue: 'blue' },
  pattern: { solid: 'Solid', blink: 'Blinking', fast: 'Fast blinking', pulse: 'Pulsing' },
  legend: { solid: '', blink: 'blinking', fast: 'fast blinking', pulse: 'pulsing', alternate: 'alternating' }
};

// Labels the renderer needs: alert titles, the timer duration text, the LED description (for
// aria-label) and the short LED legend shown when animations are off.
export const DEFAULT_LABELS = {
  ru: {
    note: 'Примечание', tip: 'Совет', important: 'Важно', warning: 'Внимание', caution: 'Осторожно',
    timer: (seconds) => joinUnits(seconds, ['ч', 'мин', 'с']),
    led: (colors, pattern) => (pattern === 'alternate'
      ? `Мигает попеременно ${LED_RU.color[colors[0]]} и ${LED_RU.color[colors[1]]}`
      : `${LED_RU.pattern[pattern]} ${LED_RU.color[colors[0]]}`),
    ledLegend: (pattern) => LED_RU.legend[pattern] || ''
  },
  en: {
    note: 'Note', tip: 'Tip', important: 'Important', warning: 'Warning', caution: 'Caution',
    timer: (seconds) => joinUnits(seconds, ['h', 'min', 's']),
    led: (colors, pattern) => (pattern === 'alternate'
      ? `Alternating ${LED_EN.color[colors[0]]} and ${LED_EN.color[colors[1]]}`
      : `${LED_EN.pattern[pattern]} ${LED_EN.color[colors[0]]}`),
    ledLegend: (pattern) => LED_EN.legend[pattern] || ''
  }
};

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ESC[c]);

// Info string: the first word is the language (or "widget"), the rest is kept for widget blocks.
const FENCE = /^ {0,3}(`{3,})\s*([^`\s]*)(?:[ \t]+([^`]*?))?\s*$/;
const LIST_ITEM = /^( *)([-*]|\d{1,9}[.)])( +)(.*)$/;
const IMAGE_LINE = /^!\[([^\]]*)\]\(([^()\s]+)\)\s*$/;
const TABLE_SEP = /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/;
const ALERT = /^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*$/i;
const VARIANT = /^\[!VARIANT(?:\s+([^\]]*))?\]\s*$/i;
const HEADING_VARIANT = /\s*\{variant=([^}]*)\}\s*$/;
const VARIANT_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const WIDGET_TYPE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// "a, b" -> ['a', 'b'] with format errors reported; null when the list is unusable.
function variantIds(text, line, issues, where) {
  const ids = String(text ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  if (!ids.length) { issues.push({ line, level: 'error', message: `${where} needs a variant id, e.g. ${where === 'heading' ? '{variant=with-button}' : '[!VARIANT with-button]'}` }); return null; }
  const bad = ids.find((id) => !VARIANT_ID.test(id));
  if (bad) { issues.push({ line, level: 'error', message: `variant id "${bad}" must be kebab-case [a-z0-9-]` }); return null; }
  return [...new Set(ids)];
}

// Splits a guide body into the introduction and the steps (one per '## ' heading) and renders
// each to HTML. The step illustration line is taken out of the step HTML into step.image.
// opts: {labels, variants: {id: name}, line: file line of the first body line, issues: []}
export function splitGuide(body, opts = {}) {
  const issues = opts.issues || [];
  const first = opts.line || 1;
  const rows = String(body).replace(/\r\n?/g, '\n').split('\n');
  const sections = [{ title: null, line: first, rows: [], rowLines: [], variants: null }];
  let fence = null;
  rows.forEach((row, k) => {
    const line = first + k;
    const f = FENCE.exec(row);
    if (fence) {
      if (f && f[1].length >= fence && !f[2] && !f[3]) fence = null;
    } else if (f) {
      fence = f[1].length;
    } else if (/^##[ \t]/.test(row) || row.trim() === '##') {
      let title = row.replace(/^##/, '').trim();
      let variants = null;
      const v = HEADING_VARIANT.exec(title);
      if (v) {
        title = title.slice(0, v.index).trim();
        variants = variantIds(v[1], line, issues, 'heading');
      }
      sections.push({ title, line, rows: [], rowLines: [], variants });
      return;
    } else if (/^#[ \t]/.test(row) || row.trim() === '#') {
      issues.push({ line, level: 'error', message: '"# " headings are not allowed; start a step with "## "' });
    }
    const s = sections[sections.length - 1];
    s.rows.push(row);
    s.rowLines.push(line);
  });

  const [introSection, ...stepSections] = sections;
  const intro = renderSection(introSection, opts, issues, false);
  const steps = stepSections.map((s, k) => {
    const r = renderSection(s, opts, issues, true);
    return {
      n: k + 1, title: s.title, line: s.line, md: r.md, html: r.html, image: r.image, text: r.text,
      variants: s.variants, widgets: r.widgets, variantRefs: r.variantRefs
    };
  });
  return {
    intro: { md: intro.md, html: intro.html, line: introSection.line, text: intro.text, paragraphs: intro.paragraphs },
    steps,
    issues
  };
}

function renderSection(section, opts, issues, inStep) {
  let image = null;
  const kept = [];
  const keptLines = [];
  let fence = null;
  section.rows.forEach((row, k) => {
    const line = section.rowLines[k];
    const f = FENCE.exec(row);
    if (fence) { if (f && f[1].length >= fence && !f[2] && !f[3]) fence = null; }
    else if (f) fence = f[1].length;
    else {
      const m = IMAGE_LINE.exec(row.trim());
      if (m && indentOf(row) === 0) {
        if (!inStep) {
          issues.push({ line, level: 'error', message: 'illustrations belong to steps, not to the introduction' });
        } else if (image) {
          issues.push({ line, level: 'error', message: 'a step can have at most one illustration' });
        } else {
          image = { src: m[2], alt: m[1].trim(), line };
        }
        return;
      }
    }
    kept.push(row);
    keptLines.push(line);
  });
  while (kept.length && kept[0].trim() === '') { kept.shift(); keptLines.shift(); }
  while (kept.length && kept[kept.length - 1].trim() === '') { kept.pop(); keptLines.pop(); }
  const blocks = parseBlocks(kept, keptLines, issues, 0);
  const widgets = [];
  const variantRefs = [];
  walkBlocks(blocks, (b) => {
    if (b.type === 'widget') {
      if (!inStep) issues.push({ line: b.line, level: 'error', message: 'widget blocks belong to steps; use the frontmatter "widget:" for a guide-level widget' });
      else if (b.widget) widgets.push({ type: b.widget, params: b.params, line: b.line });
    } else if (b.type === 'variant') {
      if (!inStep) issues.push({ line: b.line, level: 'error', message: 'variant blocks belong to steps, not to the introduction' });
      else if (b.ids) variantRefs.push({ ids: b.ids, line: b.line });
    }
  });
  const html = blocks.map((b) => renderBlock(b, opts, issues)).join('\n');
  const md = kept.join('\n');
  return { md, html, image, widgets, variantRefs, text: plainText(md), paragraphs: blocks.filter((b) => b.type === 'p').length };
}

function walkBlocks(blocks, fn) {
  for (const b of blocks) {
    fn(b);
    if (b.blocks) walkBlocks(b.blocks, fn);
    if (b.items) for (const it of b.items) walkBlocks(it.children, fn);
  }
}

// Renders a standalone Markdown fragment (blocks) to HTML.
export function renderMarkdown(md, opts = {}) {
  const issues = opts.issues || [];
  const rows = String(md).replace(/\r\n?/g, '\n').split('\n');
  const first = opts.line || 1;
  const blocks = parseBlocks(rows, rows.map((_, k) => first + k), issues, 0);
  return blocks.map((b) => renderBlock(b, opts, issues)).join('\n');
}

// Renders inline Markdown (FAQ answers, table cells) to HTML.
export function renderInline(text, opts = {}) {
  return inline(String(text), { issues: opts.issues || [], line: opts.line || 0, inLink: false, labels: opts.labels });
}

const indentOf = (row) => row.length - row.trimStart().length;

function parseBlocks(rows, rowLines, issues, depth) {
  const blocks = [];
  let i = 0;
  const n = rows.length;
  const isBlank = (k) => k >= n || rows[k].trim() === '';
  const startsBlock = (k) => {
    const row = rows[k];
    return FENCE.test(row) || /^ {0,3}#{1,6}[ \t]/.test(row) || /^ {0,3}>/.test(row) || isListStart(row) ||
      (row.includes('|') && k + 1 < n && TABLE_SEP.test(rows[k + 1]) && rows[k + 1].includes('-'));
  };
  while (i < n) {
    const row = rows[i];
    const line = rowLines[i];
    if (row.trim() === '') { i += 1; continue; }

    const f = FENCE.exec(row);
    if (f) {
      const body = [];
      let j = i + 1;
      let closed = false;
      for (; j < n; j += 1) {
        const c = FENCE.exec(rows[j]);
        if (c && c[1].length >= f[1].length && !c[2] && !c[3]) { closed = true; break; }
        body.push(rows[j]);
      }
      if (!closed) issues.push({ line, level: 'error', message: 'code block is not closed with ```' });
      if (f[2].toLowerCase() === 'widget') blocks.push(widgetBlock(f[3], body, line, issues));
      else blocks.push({ type: 'code', lang: f[2], text: body.join('\n'), line });
      i = j + 1;
      continue;
    }

    const h = /^ {0,3}(#{1,6})[ \t]+(.*?)[ \t#]*$/.exec(row);
    if (h) {
      if (h[1].length === 3) blocks.push({ type: 'h3', text: h[2], line });
      else {
        if (h[1].length > 3) issues.push({ line, level: 'warning', message: 'only "## " (step) and "### " (sub-heading) headings are supported' });
        blocks.push({ type: 'p', text: row.trim(), line });
      }
      i += 1;
      continue;
    }

    if (/^ {0,3}>/.test(row)) {
      const inner = [];
      const innerLines = [];
      while (i < n && /^ {0,3}>/.test(rows[i])) {
        inner.push(rows[i].replace(/^ {0,3}> ?/, ''));
        innerLines.push(rowLines[i]);
        i += 1;
      }
      const a = ALERT.exec(inner[0].trim());
      const v = VARIANT.exec(inner[0].trim());
      if (a) {
        inner.shift();
        innerLines.shift();
        blocks.push({ type: 'alert', kind: a[1].toLowerCase(), blocks: parseBlocks(inner, innerLines, issues, depth + 1), line });
      } else if (v) {
        inner.shift();
        innerLines.shift();
        blocks.push({ type: 'variant', ids: variantIds(v[1], line, issues, 'variant block'), blocks: parseBlocks(inner, innerLines, issues, depth + 1), line });
      } else {
        if (/^\[!/.test(inner[0].trim())) issues.push({ line, level: 'warning', message: 'unknown alert type; use NOTE, TIP, IMPORTANT, WARNING, CAUTION or VARIANT <id>' });
        blocks.push({ type: 'quote', blocks: parseBlocks(inner, innerLines, issues, depth + 1), line });
      }
      continue;
    }

    if (row.includes('|') && i + 1 < n && TABLE_SEP.test(rows[i + 1]) && rows[i + 1].includes('-')) {
      const head = splitRow(row);
      const align = splitRow(rows[i + 1]).map((c) => (/^:-+:$/.test(c) ? 'center' : /^-+:$/.test(c) ? 'right' : ''));
      const body = [];
      let j = i + 2;
      while (j < n && rows[j].trim() !== '' && rows[j].includes('|')) { body.push({ cells: splitRow(rows[j]), line: rowLines[j] }); j += 1; }
      blocks.push({ type: 'table', head, align, body, line });
      i = j;
      continue;
    }

    if (isListStart(row)) {
      const res = parseList(rows, rowLines, i, issues, depth);
      blocks.push(res.block);
      i = res.next;
      continue;
    }

    const para = [row.trim()];
    i += 1;
    while (i < n && !isBlank(i) && !startsBlock(i)) { para.push(rows[i].trim()); i += 1; }
    const text = para.join(' ');
    if (IMAGE_LINE.test(text)) issues.push({ line, level: 'error', message: 'the illustration must be a top-level line of a step, not inside a list or quote' });
    blocks.push({ type: 'p', text, line });
  }
  return blocks;
}

// ```widget <type> with "key: value" lines (frontmatter scalar rules) -> a widget block.
function widgetBlock(info, body, line, issues) {
  const type = String(info ?? '').trim();
  const block = { type: 'widget', widget: null, params: {}, line };
  if (!type) { issues.push({ line, level: 'error', message: 'a widget block needs a type: ```widget wifi-qr' }); return block; }
  if (!WIDGET_TYPE.test(type)) { issues.push({ line, level: 'error', message: `widget type "${type}" must be kebab-case [a-z0-9-]` }); return block; }
  block.widget = type;
  try {
    const { data, lines } = parseYaml(body, line + 1);
    block.params = data;
    block.paramLines = lines;
  } catch (error) {
    if (error.name !== 'FrontmatterError') throw error;
    issues.push({ line: error.line || line, level: 'error', message: `widget ${type}: ${error.message}` });
  }
  return block;
}

function isListStart(row) {
  const m = LIST_ITEM.exec(row);
  return Boolean(m && m[1].length <= 3);
}

function listType(marker) {
  return /\d/.test(marker) ? 'ol' : 'ul';
}

function parseList(rows, rowLines, start, issues, depth) {
  const n = rows.length;
  const first = LIST_ITEM.exec(rows[start]);
  const base = first[1].length;
  const type = listType(first[2]);
  const block = { type, start: type === 'ol' ? parseInt(first[2], 10) : 1, items: [], line: rowLines[start] };
  let i = start;
  let item = null;
  let prevBlank = false;
  while (i < n) {
    const row = rows[i];
    if (row.trim() === '') { prevBlank = true; i += 1; continue; }
    const m = LIST_ITEM.exec(row);
    const ind = indentOf(row);
    if (m && ind <= base + 1) {
      if (listType(m[2]) !== type) break;
      item = { text: [m[4].trim()], children: [], line: rowLines[i] };
      block.items.push(item);
      prevBlank = false;
      i += 1;
      continue;
    }
    if (!item) break;
    if (m && ind >= base + 2) {
      // One nested level; deeper indentation joins the nested list.
      const nestedRows = [];
      const nestedLines = [];
      while (i < n && (rows[i].trim() === '' || indentOf(rows[i]) >= base + 2)) {
        nestedRows.push(rows[i].slice(Math.min(indentOf(rows[i]), ind)));
        nestedLines.push(rowLines[i]);
        i += 1;
      }
      while (nestedRows.length && nestedRows[nestedRows.length - 1].trim() === '') { nestedRows.pop(); nestedLines.pop(); }
      if (depth >= 1) {
        issues.push({ line: nestedLines[0], level: 'warning', message: 'lists can be nested one level deep only' });
        item.text.push(...nestedRows.map((r) => r.trim()));
      } else {
        item.children.push(...parseBlocks(nestedRows, nestedLines, issues, depth + 1));
      }
      prevBlank = false;
      continue;
    }
    if (ind >= 2 || !prevBlank) {
      if (!prevBlank && ind < 2 && (FENCE.test(row) || /^ {0,3}(#|>)/.test(row))) break;
      item.text.push(row.trim());
      prevBlank = false;
      i += 1;
      continue;
    }
    break;
  }
  return { block, next: i };
}

function splitRow(row) {
  let s = row.trim();
  if (s.startsWith('|')) s = s.slice(1);
  if (s.endsWith('|') && !s.endsWith('\\|')) s = s.slice(0, -1);
  const cells = [];
  let cur = '';
  let code = 0;
  for (let i = 0; i < s.length; i += 1) {
    const c = s[i];
    if (c === '\\' && s[i + 1] === '|') { cur += '|'; i += 1; continue; }
    if (c === '`') code = code ? 0 : 1;
    if (c === '|' && !code) { cells.push(cur.trim()); cur = ''; continue; }
    cur += c;
  }
  cells.push(cur.trim());
  return cells;
}

function renderBlock(b, opts, issues) {
  const ctx = { issues, line: b.line, inLink: false, labels: opts.labels };
  switch (b.type) {
    case 'p': return `<p>${inline(b.text, ctx)}</p>`;
    case 'h3': return `<h3>${inline(b.text, ctx)}</h3>`;
    case 'code': {
      const lang = /^[a-zA-Z0-9_-]+$/.test(b.lang) ? ` class="language-${b.lang.toLowerCase()}"` : '';
      return `<pre><code${lang}>${escapeHtml(b.text)}</code></pre>`;
    }
    case 'ul':
    case 'ol': {
      const start = b.type === 'ol' && b.start !== 1 ? ` start="${b.start}"` : '';
      const items = b.items.map((it) => {
        const text = inline(it.text.join(' '), { issues, line: it.line, inLink: false, labels: opts.labels });
        const kids = it.children.map((c) => renderBlock(c, opts, issues)).join('');
        return `<li>${text}${kids}</li>`;
      }).join('');
      return `<${b.type}${start}>${items}</${b.type}>`;
    }
    case 'quote':
      return `<blockquote>${b.blocks.map((c) => renderBlock(c, opts, issues)).join('\n')}</blockquote>`;
    case 'alert': {
      const labels = opts.labels || DEFAULT_LABELS.ru;
      const title = labels[b.kind] || DEFAULT_LABELS.en[b.kind];
      const inner = b.blocks.map((c) => renderBlock(c, opts, issues)).join('\n');
      return `<div class="alert alert-${b.kind}"><p class="alert-title">${escapeHtml(title)}</p>${inner}</div>`;
    }
    case 'variant': {
      // Shown to everyone without a choice (and without JS), labelled with the variant names.
      const ids = b.ids || [];
      const names = ids.map((id) => (opts.variants && opts.variants[id]) || id);
      const inner = b.blocks.map((c) => renderBlock(c, opts, issues)).join('\n');
      return `<div class="variant" data-variant="${escapeHtml(ids.join(' '))}"><p class="variant-label">${escapeHtml(names.join(', '))}</p>${inner}</div>`;
    }
    case 'widget':
      // Placeholder; the page renderer fills in the widget's server HTML (spec 11.3).
      if (!b.widget) return '';
      return `<div class="widget" data-widget="${escapeHtml(b.widget)}" data-params="${escapeHtml(JSON.stringify(b.params || {}))}"></div>`;
    case 'table': {
      const cls = (k) => (b.align[k] ? ` class="align-${b.align[k]}"` : '');
      const head = b.head.map((c, k) => `<th${cls(k)}>${inline(c, ctx)}</th>`).join('');
      const rows = b.body.map((r) => {
        const cells = b.head.map((_, k) => `<td${cls(k)}>${inline(r.cells[k] ?? '', { issues, line: r.line, inLink: false, labels: opts.labels })}</td>`).join('');
        return `<tr>${cells}</tr>`;
      }).join('');
      return `<div class="table-wrap"><table><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table></div>`;
    }
    default: return '';
  }
}

// {{timer 1m30s}} -> seconds, or null with an issue.
export function parseDuration(text) {
  const m = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/.exec(String(text ?? '').trim());
  if (!m || (!m[1] && !m[2] && !m[3])) return null;
  return Number(m[1] || 0) * 3600 + Number(m[2] || 0) * 60 + Number(m[3] || 0);
}

// {{led white/amber alternate}} -> {colors, pattern} or {error}.
export function parseLed(text) {
  const parts = String(text ?? '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return { error: `{{led}} needs a colour: ${LED_COLORS.join(', ')}` };
  if (parts.length > 2) return { error: `{{led ${parts.join(' ')}}} has too many words; use {{led <colour> <pattern>}}` };
  const colors = parts[0].split('/');
  const pattern = parts[1] || 'solid';
  const bad = colors.find((c) => !LED_COLORS.includes(c));
  if (bad !== undefined) return { error: `unknown LED colour "${bad}"; use ${LED_COLORS.join(', ')}` };
  if (!LED_PATTERNS.includes(pattern)) return { error: `unknown LED pattern "${pattern}"; use ${LED_PATTERNS.join(', ')}` };
  if (colors.length > 2) return { error: 'an LED shows at most two colours: {{led white/amber alternate}}' };
  if (pattern === 'alternate' && colors.length !== 2) return { error: 'the alternate pattern needs two colours: {{led white/amber alternate}}' };
  if (pattern !== 'alternate' && colors.length !== 1) return { error: `two colours need the alternate pattern: {{led ${colors.join('/')} alternate}}` };
  return { colors, pattern };
}

const KEYWORDS = ['timer', 'led'];

// {{timer ...}} and {{led ...}} chips; returns HTML, or null when the text is a UI path.
function keywordChip(inner, ctx) {
  const m = /^([a-z]+)(?:\s+([\s\S]*))?$/.exec(inner.trim());
  if (!m || !KEYWORDS.includes(m[1])) return null;
  const labels = { ...DEFAULT_LABELS.ru, ...(ctx.labels || {}) };
  const arg = (m[2] || '').trim();
  if (m[1] === 'timer') {
    const seconds = parseDuration(arg);
    if (seconds === null) {
      ctx.issues.push({ line: ctx.line, level: 'error', message: `{{timer ${arg}}}: write the time like 15s, 2m or 1m30s` });
      return escapeHtml(arg);
    }
    if (seconds < 1 || seconds > TIMER_MAX) {
      ctx.issues.push({ line: ctx.line, level: 'error', message: `{{timer ${arg}}} is ${seconds} s; a timer runs 1-${TIMER_MAX} s` });
      return escapeHtml(arg);
    }
    return `<button type="button" class="timer" data-seconds="${seconds}"><span class="timer-label">${escapeHtml(labels.timer(seconds))}</span></button>`;
  }
  const led = parseLed(arg);
  if (led.error) {
    ctx.issues.push({ line: ctx.line, level: 'error', message: led.error });
    return escapeHtml(arg);
  }
  const [a, b] = led.colors;
  const legend = labels.ledLegend(led.pattern);
  const cls = ['led', `led-${a}`, `led-${led.pattern}`, b ? `led-b-${b}` : ''].filter(Boolean).join(' ');
  return `<span class="${cls}" role="img" aria-label="${escapeHtml(labels.led(led.colors, led.pattern))}"${legend ? ` data-legend="${escapeHtml(legend)}"` : ''}></span>`;
}

const PUNCT = /[!-/:-@[-`{-~]/;
const isSpace = (c) => c === undefined || /\s/.test(c);
const isWord = (c) => c !== undefined && /[\p{L}\p{N}]/u.test(c);

// Inline scanner: every character either belongs to a recognised construct or is escaped.
function inline(src, ctx) {
  let out = '';
  let i = 0;
  const n = src.length;
  while (i < n) {
    const c = src[i];

    if (c === '\\' && i + 1 < n && PUNCT.test(src[i + 1])) { out += escapeHtml(src[i + 1]); i += 2; continue; }

    if (c === '`') {
      let run = 1;
      while (src[i + run] === '`') run += 1;
      const close = findBacktickClose(src, i + run, run);
      if (close >= 0) {
        let code = src.slice(i + run, close);
        if (/^ .* $/.test(code) && code.trim()) code = code.slice(1, -1);
        out += `<code>${escapeHtml(code)}</code>`;
        i = close + run;
      } else {
        out += escapeHtml(src.slice(i, i + run));
        i += run;
      }
      continue;
    }

    if (c === '<') {
      const open = /^<kbd>/i.exec(src.slice(i, i + 5));
      if (open) {
        const end = src.toLowerCase().indexOf('</kbd>', i + 5);
        if (end >= 0) {
          out += `<kbd>${escapeHtml(src.slice(i + 5, end))}</kbd>`;
          i = end + 6;
          continue;
        }
      }
      if (/^<\/?[a-zA-Z!]/.test(src.slice(i, i + 3))) {
        ctx.issues.push({ line: ctx.line, level: 'warning', message: 'HTML is not allowed (except <kbd>); it is shown as text' });
      }
      out += '&lt;';
      i += 1;
      continue;
    }

    if (c === '{' && src[i + 1] === '{') {
      const end = src.indexOf('}}', i + 2);
      if (end > i + 2) {
        const chip = keywordChip(src.slice(i + 2, end), ctx);
        if (chip !== null) {
          out += chip;
          i = end + 2;
          continue;
        }
        const segs = src.slice(i + 2, end).split(/(?<!<\/?kbd)>/i).map((s) => s.trim()).filter(Boolean);
        if (segs.length) {
          out += '<span class="ui-path">' + segs.map((s) => `<span class="ui-seg">${inlineText(s)}</span>`).join('<span class="ui-sep"></span>') + '</span>';
          i = end + 2;
          continue;
        }
      }
    }

    if (c === '!' && src[i + 1] === '[') {
      const link = parseLink(src, i + 1);
      if (link) {
        ctx.issues.push({ line: ctx.line, level: 'warning', message: 'images must be on their own line at the top level of a step; this one is shown as text' });
        out += escapeHtml(src.slice(i, link.end));
        i = link.end;
        continue;
      }
    }

    if (c === '[' && !ctx.inLink) {
      const link = parseLink(src, i);
      if (link) {
        const url = link.url;
        if (/^https?:\/\/[^\s<>"'`]+$/i.test(url)) {
          out += `<a href="${escapeHtml(url)}" rel="noopener" target="_blank">${inline(link.text, { ...ctx, inLink: true })}</a>`;
        } else if (/^#[A-Za-z0-9_-]+$/.test(url)) {
          out += `<a href="${escapeHtml(url)}">${inline(link.text, { ...ctx, inLink: true })}</a>`;
        } else {
          ctx.issues.push({ line: ctx.line, level: 'error', message: `links must be https:// (or http://) or #anchors: "${url}"` });
          out += escapeHtml(src.slice(i, link.end));
        }
        i = link.end;
        continue;
      }
    }

    if (c === '*' && src[i + 1] === '*' && !isSpace(src[i + 2])) {
      const close = findClose(src, i + 2, '**');
      if (close >= 0) {
        out += `<strong>${inline(src.slice(i + 2, close), ctx)}</strong>`;
        i = close + 2;
        continue;
      }
    }

    if ((c === '*' || c === '_') && src[i + 1] !== c && !isSpace(src[i + 1]) && !(c === '_' && isWord(src[i - 1]))) {
      const close = findClose(src, i + 1, c);
      if (close >= 0) {
        out += `<em>${inline(src.slice(i + 1, close), ctx)}</em>`;
        i = close + 1;
        continue;
      }
    }

    out += escapeHtml(c);
    i += 1;
  }
  return out;
}

// Text inside UI-path segments: escapes everything, keeps <kbd> and code spans.
function inlineText(s) {
  return inline(s, { issues: [], line: 0, inLink: true });
}

function findBacktickClose(src, from, run) {
  for (let i = from; i < src.length; i += 1) {
    if (src[i] !== '`') continue;
    let r = 1;
    while (src[i + r] === '`') r += 1;
    if (r === run) return i;
    i += r - 1;
  }
  return -1;
}

// Finds the closing delimiter, skipping code spans and (for single '*') '**' pairs.
function findClose(src, from, delim) {
  for (let i = from; i < src.length; i += 1) {
    const c = src[i];
    if (c === '\\') { i += 1; continue; }
    if (c === '`') {
      let run = 1;
      while (src[i + run] === '`') run += 1;
      const close = findBacktickClose(src, i + run, run);
      if (close >= 0) { i = close + run - 1; continue; }
    }
    if (delim === '**') {
      if (c === '*' && src[i + 1] === '*' && i > from && !isSpace(src[i - 1])) return i;
      continue;
    }
    if (c === delim) {
      if (delim === '*' && src[i + 1] === '*') {
        const inner = findClose(src, i + 2, '**');
        if (inner >= 0) { i = inner + 1; continue; }
        if (src[i + 2] !== '*') { i += 1; continue; }
      }
      if (i > from && !isSpace(src[i - 1]) && !(delim === '_' && isWord(src[i + 1]))) return i;
    }
  }
  return -1;
}

// [text](url) starting at '['; returns {text, url, end} or null.
function parseLink(src, start) {
  let depth = 0;
  let i = start;
  for (; i < src.length; i += 1) {
    const c = src[i];
    if (c === '\\') { i += 1; continue; }
    if (c === '[') depth += 1;
    else if (c === ']') { depth -= 1; if (depth === 0) break; }
  }
  if (depth !== 0 || src[i + 1] !== '(') return null;
  const close = src.indexOf(')', i + 2);
  if (close < 0) return null;
  const url = src.slice(i + 2, close).trim();
  if (!url || /\s/.test(url)) return null;
  return { text: src.slice(start + 1, i), url, end: close + 1 };
}

// Markdown-like plain text: drops syntax, keeps words (llms-full.txt, word counts, JSON-LD).
// Widget blocks are dropped whole; {{timer 2m}} becomes "2m", {{led white blink}} "white blink".
export function plainText(md) {
  return String(md)
    .replace(/^ {0,3}(`{3,})[ \t]*widget\b[^\n]*\n[\s\S]*?^ {0,3}\1`*[ \t]*$/gim, '')
    .replace(/^ {0,3}`{3,}.*$/gm, '')
    .replace(/^ {0,3}> ?\[!(\w+)(?:\s+[^\]]*)?\]\s*$/gim, '')
    .replace(/^ {0,3}> ?/gm, '')
    .replace(/^ {0,3}#{1,6}[ \t]+/gm, '')
    .replace(/\s*\{variant=[^}]*\}[ \t]*$/gm, '')
    .replace(/^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/gm, '')
    .replace(/^( *)([-*]|\d{1,9}[.)]) +/gm, '$1')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\{\{\s*(?:timer|led)\s+([^}]*)\}\}/g, (_, p) => p.trim())
    .replace(/\{\{([^}]*)\}\}/g, (_, p) => p.split('>').map((s) => s.trim()).join(' > '))
    .replace(/<\/?kbd>/gi, '')
    .replace(/\*\*|`/g, '')
    .replace(/(^|[^\p{L}\p{N}])[*_]([^*_\n]+)[*_](?=$|[^\p{L}\p{N}])/gu, '$1$2')
    .replace(/\|/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function countWords(text) {
  const m = String(text).match(/[\p{L}\p{N}]+(?:[-'][\p{L}\p{N}]+)*/gu);
  return m ? m.length : 0;
}
