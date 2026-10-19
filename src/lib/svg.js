// SVG sanitizer and inliner (docs/spec.md 4.4). A small allow-list parser: the output is
// re-serialised from the parsed tree, so nothing from the source passes through unchecked.

export const MAX_SVG_BYTES = 40 * 1024;

const ELEMENTS = new Set(['svg', 'g', 'path', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon', 'defs', 'marker', 'use', 'title']);
const ATTRS = new Set([
  'x', 'y', 'width', 'height', 'rx', 'ry', 'cx', 'cy', 'r', 'x1', 'y1', 'x2', 'y2', 'd', 'points', 'pathLength',
  'refX', 'refY', 'markerWidth', 'markerHeight', 'markerUnits', 'orient', 'preserveAspectRatio', 'viewBox',
  'class', 'transform', 'fill', 'fill-opacity', 'fill-rule', 'clip-rule', 'stroke', 'opacity',
  'marker-start', 'marker-mid', 'marker-end', 'id', 'href', 'xlink:href', 'xmlns', 'xmlns:xlink', 'version'
]);
const DROP_ON_INLINE = new Set(['xmlns', 'xmlns:xlink', 'version']);
const COLOR_ATTRS = new Set(['fill', 'stroke']);
const SAFE_COLORS = new Set(['none', 'currentcolor', 'transparent', 'inherit']);
const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };

const escAttr = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escText = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Parses and checks an SVG file. Returns {errors, warnings, tree, viewBox}; messages carry the
// file line. Errors mean the file must not be inlined.
export function checkSvg(source, opts = {}) {
  const errors = [];
  const warnings = [];
  const text = String(source).replace(/^﻿/, '');
  const bytes = typeof TextEncoder === 'function' ? new TextEncoder().encode(text).length : text.length;
  const max = opts.maxBytes ?? MAX_SVG_BYTES;
  if (bytes > max) errors.push({ line: 1, message: `SVG is ${Math.ceil(bytes / 1024)} KB, the limit is ${Math.round(max / 1024)} KB` });

  const lineAt = (pos) => {
    let line = 1;
    for (let k = 0; k < pos && k < text.length; k += 1) if (text.charCodeAt(k) === 10) line += 1;
    return line;
  };

  const root = { name: '#root', attrs: [], children: [] };
  const stack = [root];
  const tag = /<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<!\[CDATA\[[\s\S]*?\]\]>|<![^>]*>|<\/([^\s>]+)\s*>|<([^\s/>!?]+)((?:\s+[^\s=/>]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)>|</g;
  let last = 0;
  let m;
  while ((m = tag.exec(text))) {
    const between = text.slice(last, m.index);
    addText(between, last);
    last = tag.lastIndex;
    const raw = m[0];
    const line = lineAt(m.index);
    if (raw.startsWith('<!--')) continue;
    if (raw.startsWith('<?')) {
      if (!/^<\?xml[\s?]/.test(raw)) errors.push({ line, message: 'processing instructions are not allowed' });
      continue;
    }
    if (raw.startsWith('<![CDATA[')) { errors.push({ line, message: 'CDATA sections are not allowed' }); continue; }
    if (raw.startsWith('<!')) { errors.push({ line, message: 'DOCTYPE and entity declarations are not allowed' }); continue; }
    if (raw === '<') { errors.push({ line, message: 'malformed tag (attributes must be quoted)' }); break; }
    if (m[1]) {
      const name = m[1];
      const top = stack[stack.length - 1];
      if (stack.length === 1 || top.name !== name) {
        errors.push({ line, message: `unexpected closing tag </${name}>` });
        break;
      }
      stack.pop();
      continue;
    }
    const name = m[2];
    const node = { name, attrs: [], children: [], line };
    if (!ELEMENTS.has(name)) errors.push({ line, message: `element <${name}> is not allowed` });
    if (stack.length === 1 && root.children.some((c) => c.name)) errors.push({ line, message: 'only one root <svg> element is allowed' });
    if (stack.length === 1 && name !== 'svg') errors.push({ line, message: 'the root element must be <svg>' });
    const attrRe = /([^\s=/>]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
    let a;
    const seen = new Set();
    while ((a = attrRe.exec(m[3]))) {
      const key = a[1];
      const value = decodeEntities(a[2] ?? a[3], errors, line);
      if (seen.has(key)) { errors.push({ line, message: `duplicate attribute ${key}` }); continue; }
      seen.add(key);
      checkAttr(name, key, value, line);
      node.attrs.push([key, value]);
    }
    stack[stack.length - 1].children.push(node);
    if (!m[4]) stack.push(node);
  }
  addText(text.slice(last), last);
  if (stack.length > 1 && !errors.length) errors.push({ line: lineAt(text.length), message: `<${stack[stack.length - 1].name}> is not closed` });

  const svg = root.children.find((c) => c.name === 'svg');
  if (!svg && !errors.length) errors.push({ line: 1, message: 'no <svg> element found' });
  let viewBox = null;
  if (svg) {
    const attr = Object.fromEntries(svg.attrs);
    viewBox = attr.viewBox || null;
    if (!viewBox) errors.push({ line: svg.line, message: 'the root <svg> needs a viewBox' });
    else if (!['0 0 480 300', '0 0 300 300'].includes(viewBox.trim().replace(/[\s,]+/g, ' '))) {
      warnings.push({ line: svg.line, message: `viewBox "${viewBox}" is neither "0 0 480 300" nor "0 0 300 300"` });
    }
    if (attr.width || attr.height) warnings.push({ line: svg.line, message: 'remove width/height from the root <svg>; the page sizes it' });
  }

  // References must point at ids defined in the same file.
  const ids = new Set();
  const refs = [];
  walk(root, (node) => {
    for (const [key, value] of node.attrs) {
      if (key === 'id') {
        if (ids.has(value)) errors.push({ line: node.line, message: `duplicate id "${value}"` });
        ids.add(value);
      }
      if ((key === 'href' || key === 'xlink:href') && value.startsWith('#')) refs.push([value.slice(1), node.line]);
      for (const u of value.matchAll(/url\(\s*#([^)\s]+)\s*\)/g)) refs.push([u[1], node.line]);
    }
  });
  for (const [id, line] of refs) if (!ids.has(id)) errors.push({ line, message: `reference to unknown id "#${id}"` });

  return { errors, warnings, tree: root, viewBox };

  function addText(chunk, at) {
    if (!chunk) return;
    const top = stack[stack.length - 1];
    if (top.name === 'title') { top.children.push({ text: decodeEntities(chunk, errors, lineAt(at)) }); return; }
    if (chunk.trim()) errors.push({ line: lineAt(at + chunk.search(/\S/)), message: `text content is not allowed${stack.length > 1 ? ` inside <${top.name}>` : ''}: draw symbols as paths` });
  }

  function checkAttr(el, key, value, line) {
    if (/^on/i.test(key)) { errors.push({ line, message: `event handler attribute ${key} is not allowed` }); return; }
    if (key === 'style') { errors.push({ line, message: 'the style attribute is not allowed; use the colour classes' }); return; }
    if (key.startsWith('stroke-') && /^stroke-[a-z-]+$/.test(key)) { /* stroke-* family */ } else if (!ATTRS.has(key)) {
      errors.push({ line, message: `attribute ${key} is not allowed on <${el}>` });
      return;
    }
    if (key === 'href' || key === 'xlink:href') {
      if (!/^#[A-Za-z_][\w.-]*$/.test(value)) errors.push({ line, message: `${key} must point to a local #id, got "${value}"` });
      return;
    }
    if (key === 'xmlns' && value !== 'http://www.w3.org/2000/svg') errors.push({ line, message: 'unexpected xmlns' });
    if (key === 'xmlns:xlink' && value !== 'http://www.w3.org/1999/xlink') errors.push({ line, message: 'unexpected xmlns:xlink' });
    if (key === 'id' && !/^[A-Za-z_][\w.-]*$/.test(value)) errors.push({ line, message: `invalid id "${value}"` });
    if (key === 'class' && !/^[\w\s-]*$/.test(value)) errors.push({ line, message: `invalid class "${value}"` });
    if (/url\(/i.test(value)) {
      const stripped = value.replace(/url\(\s*#[A-Za-z_][\w.-]*\s*\)/g, '');
      if (/url\(/i.test(stripped)) errors.push({ line, message: `${key} may only reference local ids: url(#id)` });
    }
    if (/javascript:|data:|expression\s*\(/i.test(value)) errors.push({ line, message: `unsafe value in ${key}` });
    if (COLOR_ATTRS.has(key) && !SAFE_COLORS.has(value.trim().toLowerCase()) && !/^url\(#/.test(value.trim())) {
      warnings.push({ line, message: `hard-coded colour ${key}="${value}": use a colour class (f-ink, s-accent, ...)` });
    }
  }
}

// Sanitises and prepares an SVG for inlining: ids prefixed with opts.prefix, the file's
// <title> and namespace attributes dropped, role="img" + aria-label from opts.label.
// Returns {svg, errors, warnings}; svg is '' when there are errors.
export function inlineSvg(source, opts = {}) {
  const { errors, warnings, tree } = checkSvg(source, opts);
  if (errors.length) return { svg: '', errors, warnings };
  const prefix = opts.prefix ? `${String(opts.prefix).replace(/[^\w.-]/g, '-')}-` : '';
  const fix = (value) => value.replace(/url\(\s*#([^)\s]+)\s*\)/g, (_, id) => `url(#${prefix}${id})`);
  const serialise = (node, isRoot) => {
    if (node.text !== undefined) return '';
    if (node.name === 'title') return '';
    const attrs = [];
    for (const [key, value] of node.attrs) {
      if (DROP_ON_INLINE.has(key)) continue;
      if (isRoot && (key === 'width' || key === 'height')) continue;
      if (key === 'id') attrs.push(['id', prefix + value]);
      else if (key === 'href' || key === 'xlink:href') attrs.push(['href', `#${prefix}${value.slice(1)}`]);
      else attrs.push([key, fix(value)]);
    }
    if (isRoot) {
      if (opts.label) attrs.push(['role', 'img'], ['aria-label', opts.label]);
      else attrs.push(['aria-hidden', 'true']);
      attrs.push(['focusable', 'false']);
    }
    const head = `<${node.name}${attrs.map(([k, v]) => ` ${k}="${escAttr(v)}"`).join('')}`;
    const inner = node.children.map((c) => serialise(c, false)).join('');
    return inner ? `${head}>${inner}</${node.name}>` : `${head}/>`;
  };
  const svgNode = tree.children.find((c) => c.name === 'svg');
  return { svg: serialise(svgNode, true).replace(/^<svg([^>]*)\/>$/, '<svg$1></svg>'), errors, warnings };
}

// The sanitised file as a standalone document (keeps xmlns and title), e.g. for api JSON.
export function standaloneSvg(source) {
  const { errors, tree } = checkSvg(source);
  if (errors.length) return '';
  const serialise = (node) => {
    if (node.text !== undefined) return escText(node.text);
    const attrs = node.attrs.map(([k, v]) => ` ${k}="${escAttr(v)}"`).join('');
    const inner = node.children.map(serialise).join('');
    return inner ? `<${node.name}${attrs}>${inner}</${node.name}>` : `<${node.name}${attrs}/>`;
  };
  return serialise(tree.children.find((c) => c.name === 'svg'));
}

function walk(node, fn) {
  if (node.attrs) fn(node);
  for (const c of node.children || []) if (c.name) walk(c, fn);
}

function decodeEntities(value, errors, line) {
  return value.replace(/&(#x[0-9a-fA-F]+|#\d+|[a-zA-Z]+);?/g, (all, name) => {
    if (name[0] === '#') {
      const code = name[1] === 'x' ? parseInt(name.slice(2), 16) : parseInt(name.slice(1), 10);
      return code > 0 && code < 0x110000 ? String.fromCodePoint(code) : '';
    }
    if (Object.hasOwn(ENTITIES, name) && all.endsWith(';')) return ENTITIES[name];
    errors.push({ line, message: `unknown entity &${name};` });
    return '';
  });
}
