// DOM-level tests for the Daily UI adapter (js/daily/ui.js), driven through a
// jsdom document. These cover the wiring the pure-module tests can't: palette
// buttons greying out, board rendering, and the tap → submit flow.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

// The #daily-* skeleton from index.html, trimmed to the elements ui.js queries.
const DAILY_HTML = `
  <section id="daily-screen" hidden>
    <button id="daily-back-btn"></button>
    <span id="daily-title"></span>
    <span id="daily-sub"></span>
    <p id="daily-status" hidden></p>
    <div id="daily-play">
      <button id="daily-play-btn"></button>
      <button id="daily-practice-btn" hidden></button>
    </div>
    <div id="daily-board"></div>
    <div id="daily-degree-buttons"></div>
    <div id="daily-mascot-stage">
      <p id="daily-feedback"></p>
      <div id="daily-mascot"></div>
    </div>
    <div id="daily-result" hidden>
      <h2 id="daily-result-title"></h2>
      <p id="daily-reveal" hidden></p>
      <div id="daily-stats"></div>
      <button id="daily-share-btn"></button>
      <p id="daily-share-status"></p>
      <p id="daily-countdown"></p>
    </div>
  </section>`;

const stubPiano = () => ({
  now: 0,
  buffers: new Map(), // empty → ui skips playback calls that need samples
  init: async () => {},
  playNote: () => {},
  playChord: (_c, t) => t,
  playSequence: () => {},
  stopAll: () => {},
});

// 2026-07-03 (a Friday): pool [1..7,'fi'], tune 3 2 7 2 3 1 3 — La (6) absent.
const FIXED_DATE = new Date(2026, 6, 3);

let createDaily;

before(async () => {
  const dom = new JSDOM('<!doctype html><body></body>');
  globalThis.document = dom.window.document;
  globalThis.window = dom.window;
  document.body.innerHTML = DAILY_HTML;
  ({ createDaily } = await import('../js/daily/ui.js'));
});

after(() => {
  delete globalThis.document;
  delete globalThis.window;
});

function freshDaily() {
  document.body.innerHTML = DAILY_HTML;
  let state = {};
  const daily = createDaily({
    piano: stubPiano(),
    store: { save: (s) => { state = s; } },
    getState: () => state,
    showScreen: (s) => { s.hidden = false; },
    goHome: () => {},
    celebrate: null,
    onFinished: null,
    now: () => new Date(FIXED_DATE),
  });
  return daily;
}

const paletteBtn = (d) =>
  document.getElementById('daily-degree-buttons').querySelector(`[data-degree="${d}"]`);

async function startAndUnlock(daily) {
  await daily.start();
  document.getElementById('daily-play-btn').click(); // unlocks audio + enables palette
  await Promise.resolve(); // let startTune's await piano.init() settle
  await Promise.resolve();
}

test('guessing a degree absent from the tune greys out and disables its button', async (t) => {
  const daily = freshDaily();
  t.after(() => daily.stop());
  await startAndUnlock(daily);

  const la = paletteBtn(6);
  assert.ok(la, 'La button exists in the palette');
  assert.equal(la.disabled, false, 'La starts enabled once the tune has played');

  for (let i = 0; i < 7; i++) la.click(); // full guess of La → auto-submits

  assert.equal(la.disabled, true, 'La is disabled after being proven absent');
  assert.ok(la.classList.contains('absent'), 'La is marked absent');
});

test('degrees present in the tune stay enabled after a guess', async (t) => {
  const daily = freshDaily();
  t.after(() => daily.stop());
  await startAndUnlock(daily);

  // Tune is 3 2 7 2 3 1 3 — guess a row mixing present (1) and absent (4, 5).
  for (const d of [1, 4, 5, 4, 5, 4, 1]) paletteBtn(d).click();

  assert.equal(paletteBtn(1).disabled, false, 'Do (in the tune) stays enabled');
  assert.equal(paletteBtn(4).disabled, true, 'Fa (absent) is locked');
  assert.equal(paletteBtn(5).disabled, true, 'Sol (absent) is locked');
  assert.ok(!paletteBtn(1).classList.contains('absent'));
});

test('absent degrees stay locked when the palette re-enables after the next turn', async (t) => {
  const daily = freshDaily();
  t.after(() => daily.stop());
  await startAndUnlock(daily);

  for (let i = 0; i < 7; i++) paletteBtn(6).click();

  // Auto-replay + re-enable happens each turn; absent buttons must stay locked.
  const la = paletteBtn(6);
  assert.equal(la.disabled, true);
  paletteBtn(1).click(); // interact again on the next turn
  assert.equal(la.disabled, true, 'La stays locked mid-next-guess');
});

test('resume re-greys degrees proven absent by saved guesses', async (t) => {
  const daily = freshDaily();
  t.after(() => daily.stop());
  await startAndUnlock(daily);
  for (let i = 0; i < 7; i++) paletteBtn(6).click(); // one committed guess of La

  // Re-enter (same day): saved progress replays, La must come back locked.
  await daily.start();
  const la = paletteBtn(6);
  assert.equal(la.disabled, true, 'La re-locked from saved progress');
  assert.ok(la.classList.contains('absent'));
});
