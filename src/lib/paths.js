// URL helpers shared by the build and the browser (no Node APIs here).
// Every internal link is root-absolute: <base><lang prefix><path>.

export const LANGS = ['ru', 'en'];
export const DEFAULT_LANG = 'ru';

// '/', 'showmehow', '/showmehow' -> '/', '/showmehow/', '/showmehow/'
export function normalizeBase(base = '/') {
  const trimmed = String(base || '/').trim().replace(/^\/+|\/+$/g, '');
  return trimmed ? `/${trimmed}/` : '/';
}

export function langPrefix(lang = DEFAULT_LANG) {
  return lang === DEFAULT_LANG ? '' : `${lang}/`;
}

// href('/showmehow/', 'audio/', 'en') -> '/showmehow/en/audio/'
export function href(base, path = '', lang = DEFAULT_LANG) {
  return normalizeBase(base) + langPrefix(lang) + String(path).replace(/^\/+/, '');
}

// Absolute URL when siteUrl is set ('https://host/showmehow' or 'https://host'), else href().
// The root-absolute href replaces any path in siteUrl, so the base is never doubled.
export function absUrl(siteUrl, base, path = '', lang = DEFAULT_LANG) {
  const local = href(base, path, lang);
  if (!siteUrl) return local;
  return new URL(local, siteUrl).href;
}

// Splits a location pathname into {lang, path}; path has no leading slash.
export function parseLocation(pathname, base = '/') {
  const b = normalizeBase(base);
  let rest = String(pathname || '/');
  if (rest.startsWith(b)) rest = rest.slice(b.length);
  else if (rest + '/' === b) rest = '';
  else rest = rest.replace(/^\/+/, '');
  for (const lang of LANGS) {
    const prefix = langPrefix(lang);
    if (prefix && (rest === prefix.slice(0, -1) || rest.startsWith(prefix))) {
      return { lang, path: rest.slice(prefix.length) };
    }
  }
  return { lang: DEFAULT_LANG, path: rest };
}

// The same page in another language: switchLang('/showmehow/audio/', '/showmehow/', 'en') -> '/showmehow/en/audio/'
export function switchLang(pathname, base, lang) {
  return href(base, parseLocation(pathname, base).path, lang);
}

// Page path (after base + lang) for each page kind; subject is the taxonomy object or guide.
export function pagePath(kind, subject) {
  switch (kind) {
    case 'home': return '';
    case 'guide': return subject.path;
    case 'category': return `${subject.id}/`;
    case 'device': return `device/${subject.id}/`;
    case 'brand': return `brand/${subject.id}/`;
    case 'task': return `task/${subject.id}/`;
    case 'catalog': return 'guides/';
    case 'search': return 'search/';
    case 'stats': return 'stats/';
    case 'requests': return 'requests/';
    case 'contribute': return 'contribute/';
    case '404': return '404.html';
    default: throw new Error(`unknown page kind: ${kind}`);
  }
}

// 'audio/x/' -> 'audio/x/index.html', '' -> 'index.html', '404.html' stays.
export function outputFile(path) {
  return !path || path.endsWith('/') ? `${path}index.html` : path;
}
