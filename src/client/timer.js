// "Hold / wait" timer chips (spec 11.1): <button class="timer" data-seconds="15">. A press starts
// a countdown with a ring; another press stops it. At the end the phone vibrates and a short
// tone plays. Sound is created only inside the press handler, so nothing plays on its own.
import { t } from './core.js';

const SVG = '<svg class="timer-ring" viewBox="0 0 36 36" aria-hidden="true" focusable="false"><circle class="timer-ring-bg" cx="18" cy="18" r="15"/><circle class="timer-ring-fg" cx="18" cy="18" r="15" pathLength="100"/></svg>';

export const clock = (seconds) => {
  const s = Math.max(0, Math.ceil(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
};

let audio = null;
// Called from the press handler: browsers allow an AudioContext only after a user gesture.
function unlockAudio() {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return;
  try {
    audio = audio || new Ctx();
    if (audio.state === 'suspended') audio.resume();
  } catch {
    audio = null;
  }
}

function beep() {
  if (!audio) return;
  try {
    const now = audio.currentTime;
    for (const [at, freq] of [[0, 880], [0.28, 1175]]) {
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, now + at);
      gain.gain.exponentialRampToValueAtTime(0.25, now + at + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + at + 0.22);
      osc.connect(gain).connect(audio.destination);
      osc.start(now + at);
      osc.stop(now + at + 0.25);
    }
  } catch {
    /* no sound: the visual state and vibration still say the time is up */
  }
}

function setup(btn) {
  if (btn.dataset.ready) return;
  btn.dataset.ready = '1';
  const seconds = Number(btn.dataset.seconds) || 0;
  if (!seconds) return;
  const label = btn.querySelector('.timer-label');
  const text = label.textContent;
  btn.insertAdjacentHTML('afterbegin', SVG);
  const act = document.createElement('span');
  act.className = 'timer-act';
  btn.append(act);
  const live = document.createElement('span');
  live.className = 'sr-only';
  live.setAttribute('aria-live', 'polite');
  btn.after(live);
  let end = 0;
  let tick = 0;

  const idle = (again = false) => {
    clearInterval(tick);
    btn.classList.remove('is-running');
    btn.setAttribute('aria-label', t(again ? 'timer.again' : 'timer.start', { time: text }));
    btn.setAttribute('aria-pressed', 'false');
    btn.style.setProperty('--p', 0);
  };
  const update = () => {
    const left = (end - Date.now()) / 1000;
    if (left <= 0) return finish();
    label.textContent = clock(left);
    btn.style.setProperty('--p', 1 - left / seconds);
    btn.setAttribute('aria-label', t('timer.stopLabel', { left: clock(left) }));
  };
  const finish = () => {
    idle(true);
    label.textContent = text;
    act.textContent = t('timer.done');
    btn.classList.add('is-done');
    live.textContent = t('timer.done');
    if (navigator.vibrate) {
      try { navigator.vibrate([220, 120, 220]); } catch { /* not allowed: fine */ }
    }
    beep();
  };
  btn.addEventListener('click', () => {
    if (btn.classList.contains('is-running')) {
      idle();
      label.textContent = text;
      act.textContent = '';
      live.textContent = '';
      return;
    }
    unlockAudio();
    btn.classList.remove('is-done');
    btn.classList.add('is-running');
    btn.setAttribute('aria-pressed', 'true');
    act.textContent = t('timer.stop');
    live.textContent = '';
    end = Date.now() + seconds * 1000;
    update();
    tick = setInterval(update, 250);
  });
  idle();
}

export function initTimers(scope = document) {
  scope.querySelectorAll('button.timer[data-seconds]').forEach(setup);
}
