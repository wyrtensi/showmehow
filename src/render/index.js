// Page renderers (docs/spec.md section 7): each (site, ...args) -> {path, html}, where path is the
// output file relative to the language root and html the complete document.
export { renderHome } from './home.js';
export { renderGuide } from './guide.js';
export { renderCategory, renderDevice, renderBrand, renderTask, renderCatalog } from './listings.js';
export { renderStats, renderRequests, renderContribute, renderSearch, render404 } from './pages.js';
