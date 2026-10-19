// YAML-subset frontmatter parser (docs/spec.md 4.2). Anything outside the subset is an
// error with a 1-based line number counted from the first line of the file.

export class FrontmatterError extends Error {
  constructor(message, line) {
    super(message);
    this.name = 'FrontmatterError';
    this.line = line;
  }
}

const KEY = /^([a-z][a-zA-Z0-9_]*):(?:[ ]+(.*))?$/;

// Splits '---' frontmatter off a file and parses it.
// Returns {data, lines, body, bodyLine}: lines maps 'key', 'key.0', 'key.0.sub' to file lines,
// bodyLine is the file line of the first body line.
export function parseFrontmatter(source) {
  const text = String(source).replace(/^﻿/, '').replace(/\r\n?/g, '\n');
  const all = text.split('\n');
  if (all[0].trimEnd() !== '---') throw new FrontmatterError('the file must start with a --- line', 1);
  let end = -1;
  for (let i = 1; i < all.length; i += 1) {
    if (all[i].trimEnd() === '---') { end = i; break; }
  }
  if (end < 0) throw new FrontmatterError('frontmatter is not closed with a --- line', 1);
  const { data, lines } = parseYaml(all.slice(1, end), 2);
  return { data, lines, body: all.slice(end + 1).join('\n'), bodyLine: end + 2 };
}

// Parses the frontmatter lines; firstLine is the file line number of lines[0].
export function parseYaml(rows, firstLine = 1) {
  const data = {};
  const lines = {};
  let i = 0;
  const lineNo = (k) => firstLine + k;
  const skip = (row) => row.trim() === '' || row.trimStart().startsWith('#');
  const indentOf = (row) => row.length - row.trimStart().length;

  for (const [k, row] of rows.entries()) {
    if (row.includes('\t')) throw new FrontmatterError('tabs are not allowed, indent with spaces', lineNo(k));
  }

  while (i < rows.length) {
    const row = rows[i];
    if (skip(row)) { i += 1; continue; }
    if (indentOf(row) > 0) throw new FrontmatterError('unexpected indentation', lineNo(i));
    const m = KEY.exec(row.trimEnd());
    if (!m) throw new FrontmatterError(`expected "key: value", got "${row.trim()}"`, lineNo(i));
    const key = m[1];
    if (Object.hasOwn(data, key)) throw new FrontmatterError(`duplicate key "${key}"`, lineNo(i));
    lines[key] = lineNo(i);
    const rest = m[2] === undefined ? '' : m[2];
    if (stripComment(rest, lineNo(i)) !== '') {
      data[key] = parseValue(rest, lineNo(i));
      i += 1;
      continue;
    }
    // Block value: collect the indented lines that follow.
    let j = i + 1;
    const block = [];
    while (j < rows.length && (skip(rows[j]) || indentOf(rows[j]) > 0)) {
      if (!skip(rows[j])) block.push(j);
      j += 1;
    }
    if (!block.length) data[key] = null;
    else if (rows[block[0]].trimStart().startsWith('-')) data[key] = parseList(block, key);
    else data[key] = parseMap(block, key);
    i = j;
  }
  return { data, lines };

  function parseList(block, key) {
    const out = [];
    let item = null;
    for (const k of block) {
      const row = rows[k].trimEnd();
      const ind = indentOf(row);
      const body = row.trimStart();
      if (ind === 2 && (body === '-' || body.startsWith('- '))) {
        const content = body.slice(1).trim();
        if (!content) throw new FrontmatterError('empty list item', lineNo(k));
        const idx = out.length;
        lines[`${key}.${idx}`] = lineNo(k);
        const km = KEY.exec(content);
        if (km && !/^["']/.test(content)) {
          item = {};
          setMapEntry(item, km, `${key}.${idx}`, k);
          out.push(item);
        } else {
          item = null;
          if (content.startsWith('[')) throw new FrontmatterError('nested lists are not supported', lineNo(k));
          out.push(parseScalar(content, lineNo(k)));
        }
      } else if (ind === 4 && item) {
        const km = KEY.exec(body);
        if (!km) throw new FrontmatterError(`expected "key: value" in the list item, got "${body}"`, lineNo(k));
        setMapEntry(item, km, `${key}.${out.length - 1}`, k);
      } else if (ind === 2) {
        throw new FrontmatterError('expected a list item "  - ..."', lineNo(k));
      } else {
        throw new FrontmatterError(`unexpected indentation (${ind} spaces): list items use 2, their fields 4`, lineNo(k));
      }
    }
    return out;
  }

  function parseMap(block, key) {
    const out = {};
    for (const k of block) {
      const row = rows[k].trimEnd();
      const ind = indentOf(row);
      if (ind !== 2) throw new FrontmatterError(`unexpected indentation (${ind} spaces): map fields use 2`, lineNo(k));
      const km = KEY.exec(row.trimStart());
      if (!km) throw new FrontmatterError(`expected "key: value", got "${row.trim()}"`, lineNo(k));
      setMapEntry(out, km, key, k);
    }
    return out;
  }

  function setMapEntry(target, km, prefix, k) {
    const sub = km[1];
    if (Object.hasOwn(target, sub)) throw new FrontmatterError(`duplicate key "${sub}"`, lineNo(k));
    const rest = km[2] === undefined ? '' : km[2];
    if (stripComment(rest, lineNo(k)) === '') throw new FrontmatterError(`"${sub}" needs a value on the same line`, lineNo(k));
    target[sub] = parseValue(rest, lineNo(k));
    lines[`${prefix}.${sub}`] = lineNo(k);
  }
}

function parseValue(raw, line) {
  const text = raw.trim();
  if (text.startsWith('[')) return parseInlineList(text, line);
  return parseScalar(text, line);
}

// Removes a trailing ' #' comment from a plain value; quoted values are checked by parseScalar.
function stripComment(raw, line) {
  const text = raw.trim();
  if (text.startsWith('#')) return '';
  if (text.startsWith('"') || text.startsWith("'") || text.startsWith('[')) return text;
  const at = text.search(/\s#/);
  return (at < 0 ? text : text.slice(0, at)).trim();
}

function parseInlineList(text, line) {
  const items = [];
  let i = 1;
  let current = '';
  let quoted = null;
  let closed = -1;
  const pushItem = () => {
    const t = current.trim();
    if (t === '') throw new FrontmatterError('empty item in an inline list', line);
    items.push(parseScalar(t, line, true));
    current = '';
  };
  while (i < text.length) {
    const c = text[i];
    if (quoted) {
      current += c;
      if (quoted === '"' && c === '\\') { current += text[i + 1] ?? ''; i += 2; continue; }
      if (c === quoted) {
        if (quoted === "'" && text[i + 1] === "'") { current += "'"; i += 2; continue; }
        quoted = null;
      }
      i += 1;
      continue;
    }
    if (c === '"' || c === "'") { quoted = c; current += c; i += 1; continue; }
    if (c === '[' || c === '{') throw new FrontmatterError('nested lists and maps are not supported', line);
    if (c === ',') { pushItem(); i += 1; continue; }
    if (c === ']') { closed = i; break; }
    current += c;
    i += 1;
  }
  if (quoted) throw new FrontmatterError('unclosed quote in an inline list', line);
  if (closed < 0) throw new FrontmatterError('inline list is not closed with ]', line);
  if (current.trim() !== '' || items.length) pushItem();
  const tail = text.slice(closed + 1).trim();
  if (tail && !tail.startsWith('#')) throw new FrontmatterError(`unexpected text after the list: "${tail}"`, line);
  if (tail.startsWith('#') && !/^\s/.test(text.slice(closed + 1))) throw new FrontmatterError('a comment needs a space before #', line);
  return items;
}

function parseScalar(raw, line, inList = false) {
  const text = raw.trim();
  if (text.startsWith('"')) return parseDoubleQuoted(text, line);
  if (text.startsWith("'")) return parseSingleQuoted(text, line);
  const value = inList ? text : stripComment(text, line);
  if (value === '') throw new FrontmatterError('empty value', line);
  if (/^[{&*!|>%@`]/.test(value)) throw new FrontmatterError(`unsupported YAML syntax "${value[0]}": quote the value`, line);
  if (/^- /.test(value) || value === '-') throw new FrontmatterError('unexpected list item: put block list items on their own lines', line);
  if (/:(\s|$)/.test(value)) throw new FrontmatterError('a plain value cannot contain ": " - wrap it in double quotes', line);
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (/^-?(0|[1-9]\d*)$/.test(value)) return Number(value);
  if (/^-?(0|[1-9]\d*)\.\d+$/.test(value)) return Number(value);
  return value;
}

function parseDoubleQuoted(text, line) {
  let out = '';
  let i = 1;
  for (; i < text.length; i += 1) {
    const c = text[i];
    if (c === '\\') {
      const n = text[i + 1];
      if (n === '"' || n === '\\') out += n;
      else if (n === 'n') out += '\n';
      else throw new FrontmatterError(`unsupported escape "\\${n ?? ''}": only \\" \\\\ \\n`, line);
      i += 1;
    } else if (c === '"') {
      break;
    } else {
      out += c;
    }
  }
  if (i >= text.length) throw new FrontmatterError('unclosed double quote', line);
  checkTail(text.slice(i + 1), line);
  return out;
}

function parseSingleQuoted(text, line) {
  let out = '';
  let i = 1;
  for (; i < text.length; i += 1) {
    const c = text[i];
    if (c === "'") {
      if (text[i + 1] === "'") { out += "'"; i += 1; continue; }
      break;
    }
    out += c;
  }
  if (i >= text.length) throw new FrontmatterError('unclosed single quote', line);
  checkTail(text.slice(i + 1), line);
  return out;
}

function checkTail(tail, line) {
  if (tail.trim() === '') return;
  if (/^\s+#/.test(tail)) return;
  throw new FrontmatterError(`unexpected text after the quoted value: "${tail.trim()}"`, line);
}
