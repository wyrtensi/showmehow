// Browser entry (native ES module). Everything is prerendered; this adds search, step mode,
// progress, filters, requests and widgets on top.
import { lang, t, href } from './core.js';
import { initTheme, initLangSwitch, initDropdowns } from './prefs.js';
import { initPalette, initInstant } from './palette.js';

initTheme();
initLangSwitch();
initDropdowns();
initPalette();
initInstant();

const guide = document.querySelector('[data-guide]');
if (guide) import('./guide.js').then((m) => m.initGuide(guide));
if (document.querySelector('button.timer[data-seconds]')) import('./timer.js').then((m) => m.initTimers());
if (document.querySelector('[data-zoomable]')) import('./lightbox.js').then((m) => m.initLightbox());

const finder = document.querySelector('[data-finder]');
const resume = document.querySelector('[data-continue]');
if (finder || resume) {
  import('./home.js').then((m) => {
    if (resume) m.initContinue(resume);
    if (finder) m.initFinder(finder);
  });
}
if (document.querySelector('[data-bar]')) import('./stats.js').then((m) => m.initStats());

const faceted = document.querySelector('[data-faceted]');
if (faceted) import('./facets.js').then((m) => m.initFacets(faceted));

const requests = document.querySelectorAll('[data-requests]');
const requestForm = document.querySelector('[data-request-form]');
if (requests.length || requestForm) {
  import('./requests.js').then((m) => {
    requests.forEach((box) => m.initRequests(box));
    if (requestForm) m.initRequestForm(requestForm);
  });
}

// Widgets: src/widgets/<type>/client.js is loaded only on pages that contain one that has it.
for (const el of document.querySelectorAll('[data-widget][data-widget-client]')) {
  const type = el.dataset.widget;
  if (!/^[a-z0-9-]+$/.test(type)) continue;
  let params = {};
  try {
    params = JSON.parse(el.dataset.params || '{}');
  } catch (error) {
    console.error(`widget ${type}: bad params`, error);
  }
  import(new URL(`../widgets/${type}/client.js`, import.meta.url).href)
    .then((m) => m.mount?.(el, params, { lang, t, href }))
    .catch((error) => console.error(`widget ${type}:`, error));
}
