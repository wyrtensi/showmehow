// QR Code encoder for the wifi-qr widget: byte mode (UTF-8), error correction level M,
// versions 1-10, automatic mask selection by penalty score (ISO/IEC 18004). No dependencies,
// no Node or DOM APIs, so the same file runs in the build, in tests and in the browser.
//
// encode(text, {version?, mask?}) -> {version, size, mask, modules, penalties}
//   modules[y][x] is 1 for a dark module. version/mask force a choice (used by the tests);
//   otherwise the smallest fitting version and the lowest-penalty mask are used.
// toSvg(qr, {margin}) -> '<svg ...>' string (always dark on light, whatever the page theme).

export const MIN_VERSION = 1;
export const MAX_VERSION = 10;

// Level M: [blocks, total codewords per block, data codewords per block] groups per version.
// Taken from the QR specification table (cross-checked against python-qrcode in the tests).
const BLOCKS_M = [
  null,
  [[1, 26, 16]],
  [[1, 44, 28]],
  [[1, 70, 44]],
  [[2, 50, 32]],
  [[2, 67, 43]],
  [[4, 43, 27]],
  [[4, 49, 31]],
  [[2, 60, 38], [2, 61, 39]],
  [[3, 58, 36], [2, 59, 37]],
  [[4, 69, 43], [1, 70, 44]]
];

// Alignment pattern centre coordinates per version.
const ALIGNMENT = [null, [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34], [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50]];

const dataCodewords = (version) => BLOCKS_M[version].reduce((sum, [n, , d]) => sum + n * d, 0);
const eccPerBlock = (version) => { const [, total, data] = BLOCKS_M[version][0]; return total - data; };
const countBits = (version) => (version < 10 ? 8 : 16);

// Largest number of payload bytes a version holds in byte mode at level M.
export function capacity(version) {
  return Math.floor((dataCodewords(version) * 8 - 4 - countBits(version)) / 8);
}
export const MAX_BYTES = capacity(MAX_VERSION);

// Smallest version that holds `byteLength` bytes, or 0 when it does not fit.
export function versionFor(byteLength) {
  for (let v = MIN_VERSION; v <= MAX_VERSION; v += 1) if (byteLength <= capacity(v)) return v;
  return 0;
}

// ---- GF(256) arithmetic and Reed-Solomon ----------------------------------------------------

const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);
{
  let x = 1;
  for (let i = 0; i < 255; i += 1) {
    EXP[i] = x;
    LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i += 1) EXP[i] = EXP[i - 255];
}
const gfMul = (a, b) => (a === 0 || b === 0 ? 0 : EXP[LOG[a] + LOG[b]]);

// Coefficients (without the leading 1) of the generator polynomial of the given degree.
function generator(degree) {
  let poly = [1];
  for (let i = 0; i < degree; i += 1) {
    const next = new Array(poly.length + 1).fill(0);
    for (let j = 0; j < poly.length; j += 1) {
      next[j] ^= poly[j];
      next[j + 1] ^= gfMul(poly[j], EXP[i]);
    }
    poly = next;
  }
  return poly.slice(1);
}

function reedSolomon(data, degree) {
  const gen = generator(degree);
  const rem = new Array(degree).fill(0);
  for (const byte of data) {
    const factor = byte ^ rem.shift();
    rem.push(0);
    for (let i = 0; i < degree; i += 1) rem[i] ^= gfMul(gen[i], factor);
  }
  return rem;
}

// ---- Bit stream -> codewords ----------------------------------------------------------------

function buildDataCodewords(bytes, version) {
  const capacityBits = dataCodewords(version) * 8;
  const bits = [];
  const push = (value, length) => { for (let i = length - 1; i >= 0; i -= 1) bits.push((value >>> i) & 1); };
  push(0b0100, 4); // byte mode
  push(bytes.length, countBits(version));
  for (const b of bytes) push(b, 8);
  push(0, Math.min(4, capacityBits - bits.length)); // terminator
  while (bits.length % 8) bits.push(0);
  const out = [];
  for (let i = 0; i < bits.length; i += 8) {
    let v = 0;
    for (let j = 0; j < 8; j += 1) v = (v << 1) | bits[i + j];
    out.push(v);
  }
  for (let pad = 0xec; out.length < dataCodewords(version); pad ^= 0xec ^ 0x11) out.push(pad);
  return out;
}

// Splits into blocks, appends Reed-Solomon codewords and interleaves everything.
function interleave(data, version) {
  const ecc = eccPerBlock(version);
  const blocks = [];
  let offset = 0;
  for (const [count, , dataLen] of BLOCKS_M[version]) {
    for (let i = 0; i < count; i += 1) {
      const chunk = data.slice(offset, offset + dataLen);
      offset += dataLen;
      blocks.push({ data: chunk, ecc: reedSolomon(chunk, ecc) });
    }
  }
  const out = [];
  const longest = Math.max(...blocks.map((b) => b.data.length));
  for (let i = 0; i < longest; i += 1) for (const b of blocks) if (i < b.data.length) out.push(b.data[i]);
  for (let i = 0; i < ecc; i += 1) for (const b of blocks) out.push(b.ecc[i]);
  return out;
}

// ---- Matrix construction --------------------------------------------------------------------

function newGrid(size) {
  const grid = [];
  for (let y = 0; y < size; y += 1) grid.push(new Uint8Array(size));
  return grid;
}

// Function patterns (finders, timing, alignment, version info) and the reserved format areas.
// Returns {modules, reserved}; reserved[y][x] is 1 where data must not go.
function functionPatterns(version) {
  const size = version * 4 + 17;
  const modules = newGrid(size);
  const reserved = newGrid(size);
  const set = (x, y, dark) => { modules[y][x] = dark ? 1 : 0; reserved[y][x] = 1; };

  for (let i = 0; i < size; i += 1) { set(6, i, i % 2 === 0); set(i, 6, i % 2 === 0); }

  const finder = (cx, cy) => {
    for (let dy = -4; dy <= 4; dy += 1) {
      for (let dx = -4; dx <= 4; dx += 1) {
        const x = cx + dx, y = cy + dy;
        if (x < 0 || y < 0 || x >= size || y >= size) continue;
        const dist = Math.max(Math.abs(dx), Math.abs(dy));
        set(x, y, dist !== 2 && dist !== 4);
      }
    }
  };
  finder(3, 3); finder(size - 4, 3); finder(3, size - 4);

  const centres = ALIGNMENT[version];
  const last = centres.length - 1;
  centres.forEach((cy, i) => centres.forEach((cx, j) => {
    if ((i === 0 && j === 0) || (i === 0 && j === last) || (i === last && j === 0)) return;
    for (let dy = -2; dy <= 2; dy += 1) for (let dx = -2; dx <= 2; dx += 1) set(cx + dx, cy + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
  }));

  // Format areas are reserved now and written per mask; version info is fixed.
  for (let i = 0; i < 9; i += 1) { if (!reserved[8][i]) set(i, 8, false); if (!reserved[i][8]) set(8, i, false); }
  for (let i = 0; i < 8; i += 1) { set(size - 1 - i, 8, false); set(8, size - 1 - i, false); }
  set(8, size - 8, true); // the always-dark module

  if (version >= 7) {
    let rem = version;
    for (let i = 0; i < 12; i += 1) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
    const bits = (version << 12) | rem;
    for (let i = 0; i < 18; i += 1) {
      const dark = ((bits >>> i) & 1) === 1;
      const a = size - 11 + (i % 3), b = Math.floor(i / 3);
      set(a, b, dark); set(b, a, dark);
    }
  }
  return { modules, reserved };
}

// Format information: error correction level M (bits 00) and the mask number, BCH(15,5).
function formatBits(mask) {
  const data = (0b00 << 3) | mask;
  let rem = data;
  for (let i = 0; i < 10; i += 1) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
  return ((data << 10) | rem) ^ 0x5412;
}

function drawFormat(modules, mask) {
  const size = modules.length;
  const bits = formatBits(mask);
  const bit = (i) => (bits >>> i) & 1;
  for (let i = 0; i <= 5; i += 1) modules[i][8] = bit(i);
  modules[7][8] = bit(6);
  modules[8][8] = bit(7);
  modules[8][7] = bit(8);
  for (let i = 9; i < 15; i += 1) modules[8][14 - i] = bit(i);
  for (let i = 0; i < 8; i += 1) modules[8][size - 1 - i] = bit(i);
  for (let i = 8; i < 15; i += 1) modules[size - 15 + i][8] = bit(i);
  modules[size - 8][8] = 1;
}

const MASKS = [
  (x, y) => (x + y) % 2 === 0,
  (x, y) => y % 2 === 0,
  (x, y) => x % 3 === 0,
  (x, y) => (x + y) % 3 === 0,
  (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0,
  (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
  (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0,
  (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0
];

// Zigzag placement of the codewords, then the mask over data modules only.
function placeData(base, reserved, codewords, mask) {
  const size = base.length;
  const modules = base.map((row) => Uint8Array.from(row));
  const total = codewords.length * 8;
  let i = 0;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    const upward = ((right + 1) & 2) === 0;
    for (let vert = 0; vert < size; vert += 1) {
      const y = upward ? size - 1 - vert : vert;
      for (let j = 0; j < 2; j += 1) {
        const x = right - j;
        if (reserved[y][x]) continue;
        const dark = i < total ? (codewords[i >>> 3] >>> (7 - (i & 7))) & 1 : 0;
        i += 1;
        modules[y][x] = dark ^ (MASKS[mask](x, y) ? 1 : 0);
      }
    }
  }
  drawFormat(modules, mask);
  return modules;
}

// ---- Mask penalty (ISO/IEC 18004 section 7.8.3) ----------------------------------------------

// Returns [N1 runs, N2 blocks, N3 finder-like patterns, N4 dark balance]; penalty() is their sum.
export function penaltyParts(modules) {
  const size = modules.length;
  let n1 = 0, n2 = 0, n3 = 0;

  const line = (get) => {
    let run = 1;
    for (let i = 1; i <= size; i += 1) {
      if (i < size && get(i) === get(i - 1)) { run += 1; continue; }
      if (run >= 5) n1 += 3 + (run - 5);
      run = 1;
    }
    // Finder-like 1:1:3:1:1 pattern with four light modules on one side.
    const seq = [];
    for (let i = 0; i < size; i += 1) seq.push(get(i));
    const pat = [1, 0, 1, 1, 1, 0, 1];
    for (let i = 0; i + 7 <= size; i += 1) {
      if (!pat.every((v, k) => seq[i + k] === v)) continue;
      const before = i >= 4 && [1, 2, 3, 4].every((k) => seq[i - k] === 0);
      const after = i + 7 + 4 <= size && [0, 1, 2, 3].every((k) => seq[i + 7 + k] === 0);
      if (before) n3 += 40;
      if (after) n3 += 40;
    }
  };
  for (let k = 0; k < size; k += 1) {
    line((i) => modules[k][i]);
    line((i) => modules[i][k]);
  }

  for (let y = 0; y + 1 < size; y += 1) {
    for (let x = 0; x + 1 < size; x += 1) {
      const v = modules[y][x];
      if (v === modules[y][x + 1] && v === modules[y + 1][x] && v === modules[y + 1][x + 1]) n2 += 3;
    }
  }

  let dark = 0;
  for (const row of modules) for (const v of row) dark += v;
  const total = size * size;
  const n4 = 10 * Math.floor(Math.abs(dark * 100 / total - 50) / 5);
  return [n1, n2, n3, n4];
}

export const penalty = (modules) => penaltyParts(modules).reduce((a, b) => a + b, 0);

// ---- Public API -----------------------------------------------------------------------------

export function utf8(text) {
  return Array.from(new TextEncoder().encode(String(text)));
}

export function encode(text, options = {}) {
  const bytes = utf8(text);
  const needed = versionFor(bytes.length);
  if (!needed) throw new RangeError(`QR payload of ${bytes.length} bytes exceeds the ${MAX_BYTES}-byte limit`);
  const version = options.version ?? needed;
  if (!Number.isInteger(version) || version < MIN_VERSION || version > MAX_VERSION) throw new RangeError(`unsupported QR version ${version}`);
  if (bytes.length > capacity(version)) throw new RangeError(`${bytes.length} bytes do not fit version ${version}`);
  if (options.mask !== undefined && !(Number.isInteger(options.mask) && options.mask >= 0 && options.mask <= 7)) throw new RangeError(`unsupported mask ${options.mask}`);

  const codewords = interleave(buildDataCodewords(bytes, version), version);
  const { modules: base, reserved } = functionPatterns(version);
  const penalties = [];
  let best = null;
  const masks = options.mask === undefined ? [0, 1, 2, 3, 4, 5, 6, 7] : [options.mask];
  for (const mask of masks) {
    const modules = placeData(base, reserved, codewords, mask);
    const score = penalty(modules);
    penalties[mask] = score;
    if (!best || score < best.score) best = { mask, modules, score };
  }
  return { version, size: version * 4 + 17, mask: best.mask, modules: best.modules, penalties };
}

// Inline SVG: one path of merged horizontal runs on a light square with a quiet zone.
export function toSvg(qr, { margin = 4, label = 'QR code', className = 'wgt-qr-svg' } = {}) {
  const full = qr.size + margin * 2;
  let d = '';
  for (let y = 0; y < qr.size; y += 1) {
    let x = 0;
    while (x < qr.size) {
      if (!qr.modules[y][x]) { x += 1; continue; }
      let run = 1;
      while (x + run < qr.size && qr.modules[y][x + run]) run += 1;
      d += `M${x + margin} ${y + margin}h${run}v1h-${run}z`;
      x += run;
    }
  }
  const safe = String(label).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
  return `<svg class="${className}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${full} ${full}" role="img" aria-label="${safe}" shape-rendering="crispEdges"><rect width="${full}" height="${full}" fill="#ffffff"/><path d="${d}" fill="#000000"/></svg>`;
}
