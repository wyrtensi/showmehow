// Markdown-subset renderer (docs/spec.md 4.3). Whatever is not in the subset is escaped,
// never passed through. Problems are reported to opts.issues as {line, level, message}.

export const ALERT_TYPES = ['note', 'tip', 'important', 'warning', 'caution'];
export const DEFAULT_LABELS = {
  ru: { note: 'Примечание', tip: 'Совет', important: 'Важно', warning: 'Внимание', caution: 'Осторожно' },
  en: { note: 'Note', tip: 'Tip', important: 'Important', warning: 'Warning', caution: 'Caution' }
};

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ESC[c]);

const FENCE = /^ {0,3}(`{3,})\s*([^`\s]*)\s*$/;
const LIST_ITEM = /^( *)([-*]|\d{1,9}[.)])( +)(.*)$/;
const IMAGE_LINE = /^!\[([^\]]*)\]\(([^()\s]+)\)\s*$/;
const TABLE_SEP = /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/;
const ALERT = /^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*$/i;

// Splits a guide body into the introduction and the steps (one per '## ' heading) and renders
// each to HTML. The step illustration line is taken out of the step HTML into step.image.
// opts: {labels, line: file line of the first body line, issues: []}
export function splitGuide(body, opts = {}) {
  const issues = opts.issues || [];
  const first = opts.line || 1;
  const rows = String(body).replace(/\r\n?/g, '\n').split('\n');
  const sections = [{ title: null, line: first, rows: [], rowLines: [] }];
  let fence = null;
  rows.forEach((row, k) => {
    const line = first + k;
    const f = FENCE.exec(row);
    if (fence) {
      if (f && f[1].length >= fence && !f[2]) fence = null;
    } else if (f) {
      fence = f[1].length;
    } else if (/^##[ \t]/.test(row) || row.trim() === '##') {
      sections.push({ title: row.replace(/^##/, '').trim(), line, rows: [], rowLines: [] });
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
    return { n: k + 1, title: s.title, line: s.line, md: r.md, html: r.html, image: r.image, text: r.text };
  });
  return { intro: { md: intro.md, html: intro.html, line: introSection.line, text: intro.text, paragraphs: intro.paragraphs }, steps, issues };
}

function renderSection(section, opts, issues, allowImage) {
  let image = null;
  const kept = [];
  const keptLines = [];
  let fence = null;
  section.rows.forEach((row, k) => {
    const line = section.rowLines[k];
    const f = FENCE.exec(row);
    if (fence) { if (f && f[1].length >= fence && !f[2]) fence = null; }
    else if (f) fence = f[1].length;
    else {
      const m = IMAGE_LINE.exec(row.trim());
      if (m && indentOf(row) === 0) {
        if (!allowImage) {
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
  const html = blocks.map((b) => renderBlock(b, opts, issues)).join('\n');
  const md = kept.join('\n');
  return { md, html, image, text: plainText(md), paragraphs: blocks.filter((b) => b.type === 'p').length };
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
  return inline(String(text), { issues: opts.issues || [], line: opts.line || 0, inLink: false });
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
        if (c && c[1].length >= f[1].length && !c[2]) { closed = true; break; }
        body.push(rows[j]);
      }
      if (!closed) issues.push({ line, level: 'error', message: 'code block is not closed with ```' });
      blocks.push({ type: 'code', lang: f[2], text: body.join('\n'), line });
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
      if (a) {
        inner.shift();
        innerLines.shift();
        blocks.push({ type: 'alert', kind: a[1].toLowerCase(), blocks: parseBlocks(inner, innerLines, issues, depth + 1), line });
      } else {
        if (/^\[!/.test(inner[0].trim())) issues.push({ line, level: 'warning', message: 'unknown alert type; use NOTE, TIP, IMPORTANT, WARNING or CAUTION' });
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
  const ctx = { issues, line: b.line, inLink: false };
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
        const text = inline(it.text.join(' '), { issues, line: it.line, inLink: false });
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
    case 'table': {
      const cls = (k) => (b.align[k] ? ` class="align-${b.align[k]}"` : '');
      const head = b.head.map((c, k) => `<th${cls(k)}>${inline(c, ctx)}</th>`).join('');
      const rows = b.body.map((r) => {
        const cells = b.head.map((_, k) => `<td${cls(k)}>${inline(r.cells[k] ?? '', { issues, line: r.line, inLink: false })}</td>`).join('');
        return `<tr>${cells}</tr>`;
      }).join('');
      return `<div class="table-wrap"><table><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table></div>`;
    }
    default: return '';
  }
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
export function plainText(md) {
  return String(md)
    .replace(/^ {0,3}`{3,}.*$/gm, '')
    .replace(/^ {0,3}> ?\[!(\w+)\]\s*$/gim, '')
    .replace(/^ {0,3}> ?/gm, '')
    .replace(/^ {0,3}#{1,6}[ \t]+/gm, '')
    .replace(/^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/gm, '')
    .replace(/^( *)([-*]|\d{1,9}[.)]) +/gm, '$1')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
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
