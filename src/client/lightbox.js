// Tap an illustration to see it enlarged (spec 11.4). A modal <dialog>: the rest of the page is
// inert while it is open, Tab stays inside, Esc and the visible "Close" button close it, and
// focus returns to what opened it.
let dialog = null;
let opener = null;

function build(closeText) {
  dialog = document.createElement('dialog');
  dialog.className = 'lightbox';
  dialog.innerHTML = '<div class="lightbox-in"><div class="lightbox-art" data-art></div><p class="lightbox-cap" data-cap></p><button type="button" class="btn btn-primary btn-lg lightbox-close" data-close></button></div>';
  dialog.querySelector('[data-close]').textContent = closeText;
  dialog.querySelector('[data-close]').addEventListener('click', () => dialog.close());
  // A click on the backdrop (the dialog box itself, outside the content) closes it.
  dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
  dialog.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    const items = [...dialog.querySelectorAll('button, [href], [tabindex]:not([tabindex="-1"])')];
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
  dialog.addEventListener('close', () => {
    dialog.querySelector('[data-art]').textContent = '';
    document.documentElement.classList.remove('has-lightbox');
    opener?.focus({ preventScroll: true });
    opener = null;
  });
  document.body.append(dialog);
}

function open(fig, from) {
  const art = fig.querySelector('.ill, img');
  if (!art || typeof HTMLDialogElement === 'undefined') return;
  if (!dialog) build(document.querySelector('[data-lightbox-strings]')?.dataset.close || 'Close');
  opener = from || fig.querySelector('[data-zoom]');
  const copy = art.cloneNode(true);
  if (copy.tagName === 'IMG') copy.removeAttribute('loading');
  const box = dialog.querySelector('[data-art]');
  box.textContent = '';
  box.append(copy);
  dialog.querySelector('[data-cap]').textContent = art.getAttribute('alt') || art.querySelector('svg')?.getAttribute('aria-label') || '';
  dialog.setAttribute('aria-label', dialog.querySelector('[data-cap]').textContent);
  document.documentElement.classList.add('has-lightbox');
  dialog.showModal();
  dialog.querySelector('[data-close]').focus();
}

export function initLightbox(scope = document) {
  scope.addEventListener('click', (e) => {
    const fig = e.target.closest('[data-zoomable]');
    if (!fig || e.defaultPrevented) return;
    const btn = e.target.closest('[data-zoom]');
    open(fig, btn || fig.querySelector('[data-zoom]'));
  });
}
