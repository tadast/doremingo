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
    <div id="daily-tour" hidden>
      <p id="daily-tour-text"></p>
      <button id="daily-tour-btn"></button>
      <button id="daily-tour-skip"></button>
    </div>
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
  calls: [], // recording: 'chord' / 'seq' per playback call (see recordingPiano)
});

// Variant that records playback so tests can tell cadence from melody.
const recordingPiano = () => {
  const p = stubPiano();
  p.playChord = (_c, t) => { p.calls.push('chord'); return t + 0.55; };
  p.playSequence = () => { p.calls.push('seq'); };
  return p;
};

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

function freshDaily(piano = stubPiano()) {
  document.body.innerHTML = DAILY_HTML;
  let state = {};
  const daily = createDaily({
    piano,
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

// ---- practice tour (coach bubble) ----

const $id = (id) => document.getElementById(id);

async function enterPractice(daily) {
  await daily.start();
  $id('daily-practice-btn').click();
}

async function clickTourBtn() {
  $id('daily-tour-btn').click();
  await Promise.resolve(); // let advanceTour's await ensurePiano() settle
  await Promise.resolve();
}

test('real Daily never shows the tour', async (t) => {
  const daily = freshDaily();
  t.after(() => daily.stop());
  await daily.start();
  assert.equal($id('daily-tour').hidden, true);
  assert.equal($id('daily-play').hidden, false);
});

test('practice entry opens the tour: play row hidden, palette locked, home step first', async (t) => {
  const daily = freshDaily();
  t.after(() => daily.stop());
  await enterPractice(daily);

  assert.equal($id('daily-tour').hidden, false);
  assert.equal($id('daily-play').hidden, true);
  assert.equal($id('daily-tour-btn').textContent, '▶ Play home');
  for (const b of $id('daily-degree-buttons').querySelectorAll('button')) {
    assert.equal(b.disabled, true, 'palette locked during the tour');
  }
});

test('tour steps play cadence alone, then melody alone, then hand the board over', async (t) => {
  const piano = recordingPiano();
  const daily = freshDaily(piano);
  t.after(() => daily.stop());
  await enterPractice(daily);

  await clickTourBtn(); // step 1: home
  assert.deepEqual(piano.calls, ['chord', 'chord', 'chord', 'chord'], 'cadence only (I-IV-V-I)');
  assert.equal($id('daily-tour-btn').textContent, '▶ Play the tune');

  await clickTourBtn(); // step 2: the tune
  assert.deepEqual(piano.calls.slice(4), ['seq'], 'melody only');

  await clickTourBtn(); // step 3: your task → hand over
  assert.equal($id('daily-tour').hidden, true);
  assert.equal($id('daily-play').hidden, false);
  const playBtn = $id('daily-play-btn');
  assert.equal(playBtn.textContent, '🔁 Hear it again');
  assert.equal(playBtn.disabled, false, 'manual replay available');
  assert.equal(paletteBtn(1).disabled, false, 'palette open for guessing');
});

test('after the tour a full guess still submits and grades', async (t) => {
  const daily = freshDaily();
  t.after(() => daily.stop());
  await enterPractice(daily);
  await clickTourBtn();
  await clickTourBtn();
  await clickTourBtn();

  // Practice tune is 3 2 1 2 3 3 3 (pool [1,2,3]) — guess it wrong on purpose.
  for (const d of [1, 1, 1, 1, 1, 1, 1]) paletteBtn(d).click();
  assert.match($id('daily-feedback').textContent, /Guess 1 of 5 — keep listening/);
});

test('skip before any audio falls back to the normal first-tap flow', async (t) => {
  const daily = freshDaily();
  t.after(() => daily.stop());
  await enterPractice(daily);

  $id('daily-tour-skip').click();
  assert.equal($id('daily-tour').hidden, true);
  assert.equal($id('daily-play').hidden, false);
  assert.equal($id('daily-play-btn').textContent, '▶ Play the tune');
  assert.equal(paletteBtn(1).disabled, true, 'palette waits for the first play tap');
});

test('skip after hearing home hands over and plays the full tune', async (t) => {
  const piano = recordingPiano();
  const daily = freshDaily(piano);
  t.after(() => daily.stop());
  await enterPractice(daily);
  await clickTourBtn(); // heard home; audio unlocked

  $id('daily-tour-skip').click();
  assert.equal($id('daily-tour').hidden, true);
  assert.equal(paletteBtn(1).disabled, false, 'palette open');
  assert.ok(piano.calls.slice(4).includes('seq'), 'full tune played on skip');
});

test('narration status stays hidden while the tour narrates', async (t) => {
  const daily = freshDaily();
  t.after(() => daily.stop());
  await enterPractice(daily);
  await clickTourBtn();
  assert.equal($id('daily-status').hidden, true, 'after home step');
  await clickTourBtn();
  assert.equal($id('daily-status').hidden, true, 'after melody step');
});

test('leaving practice for the real Daily clears the tour', async (t) => {
  const daily = freshDaily();
  t.after(() => daily.stop());
  await enterPractice(daily);
  assert.equal($id('daily-tour').hidden, false);

  await daily.start();
  assert.equal($id('daily-tour').hidden, true);
  assert.equal($id('daily-play').hidden, false);
});
