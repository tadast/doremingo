// DOM-level tests for the Daily Sprint UI adapter (js/daily/ui-sprint.js),
// driven through a jsdom document — the wiring the pure-module tests can't
// reach: the palette growing per Tier, the stopwatch, the resume, the lock.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { generateSprintRun } from '../js/daily/sprint.js';
import { seededRng } from '../js/daily/rng.js';
import { dailyConfig } from '../js/daily/schedule.js';
import { defaultDaily } from '../js/daily/stats.js';

// The #sprint-* skeleton from index.html, trimmed to what ui-sprint.js queries.
const SPRINT_HTML = `
  <section id="sprint-screen" hidden>
    <button id="sprint-back-btn"></button>
    <span id="sprint-title"></span>
    <span id="sprint-tier" hidden></span>
    <span id="sprint-sub"></span>
    <span id="sprint-clock"></span>
    <span id="sprint-progress"></span>
    <p id="sprint-status" hidden></p>
    <div id="sprint-tour" hidden>
      <p id="sprint-tour-text"></p>
      <button id="sprint-tour-btn"></button>
      <button id="sprint-tour-skip"></button>
    </div>
    <div class="sprint-meters"></div>
    <div id="sprint-play">
      <button id="sprint-start-btn"></button>
      <button id="sprint-replay-btn" hidden></button>
    </div>
    <div id="sprint-board"></div>
    <div id="sprint-degree-buttons"></div>
    <button id="sprint-practice-btn" hidden></button>
    <p id="sprint-reveal" hidden></p>
    <div id="sprint-finish" hidden>
      <button id="sprint-reveal-btn"></button>
      <button id="sprint-results-btn"></button>
    </div>
    <div id="sprint-mascot-stage">
      <p id="sprint-feedback"></p>
      <div id="sprint-mascot"></div>
    </div>
    <div id="sprint-result" hidden>
      <h2 id="sprint-result-title"></h2>
      <div id="sprint-stats"></div>
      <button id="sprint-share-btn"></button>
      <button id="sprint-result-reveal-btn" hidden></button>
      <p id="sprint-share-status"></p>
      <p id="sprint-countdown"></p>
    </div>
  </section>`;

const stubPiano = () => ({
  now: 0,
  buffers: new Map(), // empty → the adapter skips playback that needs samples
  init: async () => {},
  playNote: () => {},
  playChord: (_c, t) => t,
  playSequence: () => {},
  stopAll: () => {},
});

// Samples loaded — the Reveal only runs when there's audio to run it with.
const loadedPiano = () => {
  const p = stubPiano();
  p.buffers.set(60, {});
  return p;
};

const FIXED_DATE = new Date(2026, 6, 16);
const CONFIG = dailyConfig(FIXED_DATE, 'sprint');
const RUN = generateSprintRun(seededRng(CONFIG.seed), CONFIG);

let createSprint;

before(async () => {
  const dom = new JSDOM('<!doctype html><body></body>');
  globalThis.document = dom.window.document;
  globalThis.window = dom.window;
  document.body.innerHTML = SPRINT_HTML;
  ({ createSprint } = await import('../js/daily/ui-sprint.js'));
});

after(() => {
  delete globalThis.document;
  delete globalThis.window;
});

function freshSprint({ piano = stubPiano(), state = { daily: defaultDaily() }, celebrate = null } = {}) {
  document.body.innerHTML = SPRINT_HTML;
  const sprint = createSprint({
    piano,
    store: { save: () => {} },
    getState: () => state,
    showScreen: (s) => { s.hidden = false; },
    goBack: () => {},
    celebrate,
    onFinished: null,
    now: () => new Date(FIXED_DATE),
    // The real between-Question beats are ~half a second each; no need to sit
    // through twelve of them to test the wiring.
    beats: { correct: 1, wrong: 1, tier: 1 },
  });
  return { sprint, state };
}

const paletteBtn = (d) =>
  document.getElementById('sprint-degree-buttons').querySelector(`[data-degree="${d}"]`);
const cells = () => [...document.querySelectorAll('#sprint-board .daily-cell')];
const cellState = (i) => {
  const c = cells()[i];
  return ['green', 'grey', 'filled', 'cue'].filter((s) => c.classList.contains(s)).join(' ') || 'empty';
};
const openDegrees = () =>
  [...document.querySelectorAll('#sprint-degree-buttons button[data-degree]')]
    .filter((b) => !b.disabled)
    .map((b) => b.dataset.degree);

async function startAndUnlock(sprint) {
  sprint.start();
  document.getElementById('sprint-start-btn').click(); // unlocks audio + opens the palette
  await Promise.resolve();
  await Promise.resolve();
}

// Practice opens on the coach bubble — walk it to hand the board over.
async function enterPractice(sprint) {
  document.getElementById('sprint-practice-btn').click();
  for (let i = 0; i < 3; i++) {
    document.getElementById('sprint-tour-btn').click();
    await Promise.resolve();
    await Promise.resolve();
  }
}

// Answer n Questions correctly, awaiting the inter-round timer each time.
async function answerCorrectly(n, from = 0) {
  for (let i = from; i < from + n; i++) {
    paletteBtn(RUN.questions[i].degree).click();
    await new Promise((r) => setTimeout(r, 12)); // let the "next Question" timer fire
  }
}

test('the palette opens on the Easy pentatonic only', async (t) => {
  const { sprint } = freshSprint();
  t.after(() => sprint.stop());
  await startAndUnlock(sprint);

  assert.deepEqual(openDegrees(), ['1', '2', '3', '5', '6']);
  assert.equal(paletteBtn(4).disabled, true, 'Fa is not in the Easy pool');
  assert.equal(paletteBtn(7).disabled, true, 'Ti is not in the Easy pool');
});

test('the palette stays shut until the run starts', async (t) => {
  const { sprint } = freshSprint();
  t.after(() => sprint.stop());
  sprint.start();

  assert.deepEqual(openDegrees(), [], 'no key is tappable before the first tap unlocks audio');
});

test('the palette grows a Degree at each Tier', async (t) => {
  const { sprint } = freshSprint();
  t.after(() => sprint.stop());
  await startAndUnlock(sprint);

  await answerCorrectly(4);
  assert.deepEqual(openDegrees(), ['1', '2', '3', '5', '6', '7'], 'Medium adds Ti');
  assert.equal(document.getElementById('sprint-tier').textContent, 'Medium');

  await answerCorrectly(4, 4);
  assert.deepEqual(openDegrees(), ['1', '2', '3', '4', '5', '6', '7'], 'Hard adds Fa');
  assert.equal(document.getElementById('sprint-tier').textContent, 'Hard');

  await answerCorrectly(4, 8);
  assert.equal(document.getElementById('sprint-tier').textContent, 'Master');
  // Master is the whole board — the five black keys unlock (ADR-0004).
  assert.deepEqual(openDegrees().sort(), ['1', '2', '3', '4', '5', '6', '7', 'fi', 'le', 'me', 'ra', 'te'].sort());
  assert.equal(paletteBtn('fi').disabled, false, 'Fi is playable at Master');
});

test('progress counts up and the run ends after sixteen', async (t) => {
  const { sprint, state } = freshSprint();
  t.after(() => sprint.stop());
  await startAndUnlock(sprint);

  assert.equal(document.getElementById('sprint-progress').textContent, '1 of 16');
  await answerCorrectly(1);
  assert.equal(document.getElementById('sprint-progress').textContent, '2 of 16');

  await answerCorrectly(15, 1);
  await new Promise((r) => setTimeout(r, 20));
  assert.equal(state.daily.games.sprint.today.correct, 16);
  assert.equal(state.daily.games.sprint.today.rounds, 16);
  assert.equal(state.daily.streak, 1, 'finishing any Daily game starts the streak');
});

test('a wrong answer names the Degree it actually was', async (t) => {
  const { sprint } = freshSprint();
  t.after(() => sprint.stop());
  await startAndUnlock(sprint);

  const right = RUN.questions[0].degree;
  const wrong = right === 1 ? 2 : 1;
  paletteBtn(wrong).click();

  assert.match(document.getElementById('sprint-feedback').textContent, /^✗ That was /);
});

test('a right answer outlines the key green', async (t) => {
  const { sprint } = freshSprint();
  t.after(() => sprint.stop());
  await startAndUnlock(sprint);

  const right = RUN.questions[0].degree;
  paletteBtn(right).click();
  assert.ok(paletteBtn(right).classList.contains('correct'));
  assert.equal(document.querySelectorAll('#sprint-degree-buttons .wrong').length, 0);
});

// Being told you were wrong teaches nothing without being shown what was right.
test('a wrong answer outlines the tap red and the answer green', async (t) => {
  const { sprint } = freshSprint();
  t.after(() => sprint.stop());
  await startAndUnlock(sprint);

  const right = RUN.questions[0].degree;
  const wrong = right === 1 ? 2 : 1;
  paletteBtn(wrong).click();

  assert.ok(paletteBtn(wrong).classList.contains('wrong'), 'the tapped key is marked wrong');
  assert.ok(paletteBtn(right).classList.contains('correct'), 'the real answer is marked correct');
});

test('the marks clear before the next Question sounds', async (t) => {
  const { sprint } = freshSprint();
  t.after(() => sprint.stop());
  await startAndUnlock(sprint);

  paletteBtn(RUN.questions[0].degree).click();
  await new Promise((r) => setTimeout(r, 12)); // past the beat
  assert.equal(document.querySelectorAll('#sprint-degree-buttons .correct, #sprint-degree-buttons .wrong').length, 0);
});

test('the Question note never lights its own key — that would give it away', async (t) => {
  const { sprint } = freshSprint();
  t.after(() => sprint.stop());
  await startAndUnlock(sprint);

  await new Promise((r) => setTimeout(r, 30));
  assert.equal(document.querySelectorAll('#sprint-degree-buttons .playing').length, 0);
});

// The clock is a score, not a rule (ADR-0004) — nothing may expire.
test('a Question stays answerable however long the player thinks', async (t) => {
  const { sprint, state } = freshSprint();
  t.after(() => sprint.stop());
  await startAndUnlock(sprint);

  await new Promise((r) => setTimeout(r, 60)); // "think" for a while
  assert.deepEqual(openDegrees(), ['1', '2', '3', '5', '6'], 'the palette never locks itself');
  paletteBtn(RUN.questions[0].degree).click();
  assert.equal(state.daily.games.sprint.progress.answers.length, 1, 'the answer still counts');
});

test('leaving mid-run saves the answers and the clock', async (t) => {
  const { sprint, state } = freshSprint();
  t.after(() => sprint.stop());
  await startAndUnlock(sprint);
  await answerCorrectly(2);

  const saved = state.daily.games.sprint.progress;
  assert.equal(saved.day, CONFIG.day);
  assert.equal(saved.answers.length, 2);
  assert.ok(saved.elapsedMs >= 0);
});

test('re-entry resumes the run rather than dealing a fresh one', async (t) => {
  const state = { daily: defaultDaily() };
  state.daily.games.sprint.progress = {
    day: CONFIG.day,
    answers: [RUN.questions[0].degree, RUN.questions[1].degree],
    elapsedMs: 30000,
  };
  const { sprint } = freshSprint({ state });
  t.after(() => sprint.stop());
  sprint.start();

  assert.equal(document.getElementById('sprint-progress').textContent, '3 of 16');
  assert.equal(document.getElementById('sprint-clock').textContent, '0:30', 'the clock resumes, it does not reset');
  assert.match(document.getElementById('sprint-start-btn').textContent, /Pick up/);
});

test('the grid lays out one lane per Tier before a note is played', async (t) => {
  const { sprint } = freshSprint();
  t.after(() => sprint.stop());
  sprint.start();

  assert.equal(document.querySelectorAll('#sprint-board .sprint-lane').length, 4);
  assert.equal(cells().length, 16);
  assert.deepEqual(
    [...document.querySelectorAll('#sprint-board .sprint-lane-label')].map((l) => l.textContent),
    ['Easy', 'Medium', 'Hard', 'Master'],
  );
});

test('the grid marks where you are, and fills as you answer', async (t) => {
  const { sprint } = freshSprint();
  t.after(() => sprint.stop());
  await startAndUnlock(sprint);

  assert.equal(cellState(0), 'filled', 'you-are-here sits on the first cell');
  assert.equal(cellState(1), 'empty');

  await answerCorrectly(1);
  assert.equal(cellState(0), 'green', 'the answered cell keeps its result');
  assert.equal(cellState(1), 'filled', 'the marker moves on');

  paletteBtn(RUN.questions[1].degree === 1 ? 2 : 1).click(); // a miss
  assert.equal(cellState(1), 'grey');
});

test('the current lane is the Tier you are on', async (t) => {
  const { sprint } = freshSprint();
  t.after(() => sprint.stop());
  await startAndUnlock(sprint);

  const lanes = () => [...document.querySelectorAll('#sprint-board .sprint-lane')];
  const currentLane = () => lanes().findIndex((l) => l.classList.contains('current'));
  assert.equal(currentLane(), 0, 'Easy');

  await answerCorrectly(4);
  assert.equal(currentLane(), 1, 'Medium — the lane moves with the ladder');

  await answerCorrectly(4, 4);
  assert.equal(currentLane(), 2, 'Hard');
});

test('a finished grid has no you-are-here marker left', async (t) => {
  const { sprint } = freshSprint();
  t.after(() => sprint.stop());
  await startAndUnlock(sprint);

  await answerCorrectly(16);
  await new Promise((r) => setTimeout(r, 20));
  assert.equal(document.querySelectorAll('#sprint-board .filled').length, 0);
  assert.equal(document.querySelectorAll('#sprint-board .green').length, 16);
});

// The Reveal is offered, never forced (ADR-0004) — a player after their grid
// shouldn't have to sit through a lesson to reach it.
test('finishing with misses offers the Reveal instead of playing it', async (t) => {
  const { sprint } = freshSprint({ piano: loadedPiano() });
  t.after(() => sprint.stop());
  await startAndUnlock(sprint);

  const wrong = (i) => (RUN.questions[i].degree === 1 ? 2 : 1);
  for (let i = 0; i < 16; i++) {
    paletteBtn(wrong(i)).click();
    await new Promise((r) => setTimeout(r, 12));
  }

  assert.equal(document.getElementById('sprint-finish').hidden, false, 'the choice is on screen');
  assert.equal(document.getElementById('sprint-result').hidden, true, 'results wait to be asked for');
  assert.match(document.getElementById('sprint-reveal').textContent, /16 to put right/);
});

// The point of the grid during a Reveal: twelve notes in, "you said Do" means
// nothing without knowing WHICH one.
test('the Reveal cues the cell the miss came from', async (t) => {
  const { sprint } = freshSprint({ piano: loadedPiano() });
  t.after(() => sprint.stop());
  await startAndUnlock(sprint);

  // miss only Question 6 (Medium, second cell of the middle lane)
  for (let i = 0; i < 16; i++) {
    const q = RUN.questions[i];
    paletteBtn(i === 5 ? (q.degree === 1 ? 2 : 1) : q.degree).click();
    await new Promise((r) => setTimeout(r, 12));
  }
  document.getElementById('sprint-reveal-btn').click();
  await new Promise((r) => setTimeout(r, 30));

  assert.ok(cells()[5].classList.contains('cue'), 'the missed cell is lit');
  assert.equal(document.querySelectorAll('#sprint-board .cue').length, 1, 'exactly one');
  assert.match(document.getElementById('sprint-reveal').textContent, /^Medium · you said /, 'and it says which Tier');
});

test('"See results" skips the Reveal but keeps it on offer', async (t) => {
  const { sprint } = freshSprint({ piano: loadedPiano() });
  t.after(() => sprint.stop());
  await startAndUnlock(sprint);

  for (let i = 0; i < 16; i++) {
    paletteBtn(RUN.questions[i].degree === 1 ? 2 : 1).click();
    await new Promise((r) => setTimeout(r, 12));
  }
  document.getElementById('sprint-results-btn').click();

  assert.equal(document.getElementById('sprint-result').hidden, false);
  assert.equal(document.getElementById('sprint-finish').hidden, true);
  assert.equal(document.getElementById('sprint-result-reveal-btn').hidden, false, 'the lesson is still one tap away');
});

test('a clean sweep goes straight to results — no lesson to offer', async (t) => {
  const { sprint } = freshSprint({ piano: loadedPiano() });
  t.after(() => sprint.stop());
  await startAndUnlock(sprint);

  await answerCorrectly(16);
  await new Promise((r) => setTimeout(r, 20));

  assert.equal(document.getElementById('sprint-finish').hidden, true);
  assert.equal(document.getElementById('sprint-result').hidden, false);
  assert.equal(document.getElementById('sprint-result-reveal-btn').hidden, true);
});

test('the Reveal survives a reload — stored answers rebuild it', async (t) => {
  const state = { daily: defaultDaily() };
  state.daily.games.sprint.today = {
    day: CONFIG.day, correct: 11, rounds: 16, elapsedMs: 64000,
    marks: new Array(16).fill('green'),
    // one miss: the player said something else on the first Question
    answers: RUN.questions.map((q, i) => (i === 0 ? (q.degree === 1 ? 2 : 1) : q.degree)),
  };
  const { sprint } = freshSprint({ piano: loadedPiano(), state });
  t.after(() => sprint.stop());
  sprint.start();

  assert.equal(document.getElementById('sprint-result-reveal-btn').hidden, false, 'still offered tomorrow-morning');
});

test('a locked re-entry with no misses stored offers nothing', async (t) => {
  const state = { daily: defaultDaily() };
  state.daily.games.sprint.today = {
    day: CONFIG.day, correct: 12, rounds: 16, elapsedMs: 64000,
    marks: new Array(16).fill('green'),
    answers: RUN.questions.map((q) => q.degree),
  };
  const { sprint } = freshSprint({ piano: loadedPiano(), state });
  t.after(() => sprint.stop());
  sprint.start();

  assert.equal(document.getElementById('sprint-result-reveal-btn').hidden, true);
});

// ---- Practice: the sandbox (practice.js) ----

test('practice is four notes from the home chord, no Tier, no clock', async (t) => {
  const { sprint } = freshSprint();
  t.after(() => sprint.stop());
  document.getElementById('sprint-practice-btn').click();

  assert.equal(cells().length, 4, 'one short lane');
  assert.equal(document.querySelectorAll('#sprint-board .sprint-lane-label').length, 0, 'no Tier label');
  assert.equal(document.getElementById('sprint-tier').hidden, true, 'no Tier badge');
  assert.equal(document.querySelector('.sprint-meters').hidden, true, 'no clock to hurry you');
  assert.match(document.getElementById('sprint-title').textContent, /practice/i);
});

test('practice opens only Do, Mi and Sol', async (t) => {
  const { sprint } = freshSprint();
  t.after(() => sprint.stop());
  await enterPractice(sprint);

  assert.deepEqual(openDegrees(), ['1', '3', '5']);
});

test('practice never records, never locks', async (t) => {
  const { sprint, state } = freshSprint({ celebrate: () => {} });
  t.after(() => sprint.stop());
  await enterPractice(sprint);

  // answer all four however
  for (let i = 0; i < 4; i++) {
    openDegrees().length && paletteBtn(Number(openDegrees()[0])).click();
    await new Promise((r) => setTimeout(r, 12));
  }
  assert.equal(state.daily.games.sprint.today, null, 'no result recorded');
  assert.equal(state.daily.games.sprint.progress, null, 'nothing to resume');
  assert.equal(state.daily.games.sprint.played, 0);
  assert.equal(state.daily.streak, 0, 'a sandbox cannot feed the streak');
});

test('practice is identical every visit', async (t) => {
  const read = () => {
    const { sprint } = freshSprint();
    sprint.start();
    document.getElementById('sprint-practice-btn').click();
    const marks = cells().map((_, i) => i);
    sprint.stop();
    return marks.length;
  };
  assert.equal(read(), 4);
  assert.equal(read(), 4);
});

test('practice hands over to the real Sprint when it ends', async (t) => {
  const calls = [];
  const { sprint } = freshSprint({ celebrate: (opts) => calls.push(opts) });
  t.after(() => sprint.stop());
  await enterPractice(sprint);

  for (let i = 0; i < 4; i++) {
    const open = openDegrees();
    if (open.length) paletteBtn(Number(open[0])).click();
    await new Promise((r) => setTimeout(r, 12));
  }

  assert.equal(calls.length, 1, 'the payoff fires');
  assert.match(calls[0].buttonText, /today's Sprint/i);
  // and taking it deals the real thing
  calls[0].onContinue();
  assert.equal(cells().length, 16);
  assert.equal(document.querySelector('.sprint-meters').hidden, false, 'the clock is back');
});

// ---- the practice tour (tour.js) ----

test('practice opens on the coach bubble, board shut', async (t) => {
  const { sprint } = freshSprint();
  t.after(() => sprint.stop());
  document.getElementById('sprint-practice-btn').click();

  assert.equal(document.getElementById('sprint-tour').hidden, false, 'the bubble leads');
  // The row itself stays (it reserves the keyboard's position) — its buttons go.
  assert.equal(document.getElementById('sprint-start-btn').hidden, true, 'no competing call to action');
  assert.equal(document.getElementById('sprint-replay-btn').hidden, true);
  assert.deepEqual(openDegrees(), [], 'the keyboard waits');
  assert.match(document.getElementById('sprint-tour-text').textContent, /home/i);
  assert.match(document.getElementById('sprint-tour-btn').textContent, /Play home/i);
});

test('the tour walks home → one note → your task, then hands over', async (t) => {
  const { sprint } = freshSprint();
  t.after(() => sprint.stop());
  document.getElementById('sprint-practice-btn').click();

  const tap = async () => {
    document.getElementById('sprint-tour-btn').click();
    await Promise.resolve();
    await Promise.resolve();
  };
  await tap(); // home played → step 2
  assert.match(document.getElementById('sprint-tour-btn').textContent, /Play a note/i);
  await tap(); // note played → step 3
  assert.match(document.getElementById('sprint-tour-text').textContent, /Do, Mi and Sol/i);
  await tap(); // hand over

  assert.equal(document.getElementById('sprint-tour').hidden, true, 'bubble gone');
  assert.equal(document.getElementById('sprint-play').hidden, false, 'play row back');
  assert.deepEqual(openDegrees(), ['1', '3', '5'], 'board open');
});

// jsdom has no layout, so this can't measure pixels — it pins the CAUSE instead:
// the play row must stay in the flow across every state, because it sits between
// the grid and the keyboard and reserves the keyboard's position.
test('the play row never leaves the layout, whatever the state', async (t) => {
  const { sprint } = freshSprint({ piano: loadedPiano() });
  t.after(() => sprint.stop());
  const row = () => document.getElementById('sprint-play');

  sprint.start();
  assert.equal(row().hidden, false, 'before start');

  document.getElementById('sprint-start-btn').click();
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(row().hidden, false, 'mid-run');

  for (let i = 0; i < 16; i++) {
    paletteBtn(RUN.questions[i].degree === 1 ? 2 : 1).click();
    await new Promise((r) => setTimeout(r, 12));
  }
  assert.equal(row().hidden, false, 'at the end-of-run offer');

  document.getElementById('sprint-results-btn').click();
  assert.equal(row().hidden, false, 'on the result');
});

test('the tour never runs on the real Daily', async (t) => {
  const { sprint } = freshSprint();
  t.after(() => sprint.stop());
  sprint.start();
  assert.equal(document.getElementById('sprint-tour').hidden, true);
});

test('leaving practice for the real Sprint clears the bubble', async (t) => {
  const { sprint } = freshSprint();
  t.after(() => sprint.stop());
  document.getElementById('sprint-practice-btn').click();
  assert.equal(document.getElementById('sprint-tour').hidden, false);

  sprint.start(); // back to today's run
  assert.equal(document.getElementById('sprint-tour').hidden, true);
});

test('skipping before any audio falls back to the normal first-tap flow', async (t) => {
  const { sprint } = freshSprint();
  t.after(() => sprint.stop());
  document.getElementById('sprint-practice-btn').click();
  document.getElementById('sprint-tour-skip').click();

  assert.equal(document.getElementById('sprint-tour').hidden, true);
  assert.equal(document.getElementById('sprint-play').hidden, false);
  assert.equal(document.getElementById('sprint-start-btn').hidden, false, 'start still unlocks audio');
});

// "again" is a lie on the first cadence, and practice has no Tier to name —
// naming it printed "null — here's home again".
test('the first cadence introduces home; later ones say "again" with the Tier', async (t) => {
  const { sprint } = freshSprint();
  t.after(() => sprint.stop());
  await startAndUnlock(sprint);

  assert.equal(document.getElementById('sprint-status').textContent, '🏠 This is home — the key');

  await answerCorrectly(4); // crosses into Medium → cadence re-anchors
  assert.equal(document.getElementById('sprint-status').textContent, "🏠 Medium — here's home again");
});

test('practice never prints a null Tier', async (t) => {
  const { sprint } = freshSprint();
  t.after(() => sprint.stop());
  await enterPractice(sprint);

  const status = document.getElementById('sprint-status').textContent;
  assert.ok(!status.includes('null'), `status leaked a null: ${status}`);
});

test('entering a run wipes the last run\'s narration', async (t) => {
  const { sprint } = freshSprint();
  t.after(() => sprint.stop());
  await startAndUnlock(sprint);
  await answerCorrectly(4); // status now reads "Medium — here's home again"
  assert.match(document.getElementById('sprint-status').textContent, /Medium/);

  document.getElementById('sprint-practice-btn').click(); // into the sandbox
  assert.equal(document.getElementById('sprint-status').textContent, '', 'no stale narration');
});

test('the practice door is hidden while practising, and open on a locked day', async (t) => {
  const state = { daily: defaultDaily() };
  state.daily.games.sprint.today = {
    day: CONFIG.day, correct: 12, rounds: 16, elapsedMs: 1000,
    marks: new Array(16).fill('green'), answers: RUN.questions.map((q) => q.degree),
  };
  const { sprint } = freshSprint({ state });
  t.after(() => sprint.stop());

  sprint.start(); // locked result view
  assert.equal(document.getElementById('sprint-practice-btn').hidden, false, 'still a way to play');

  document.getElementById('sprint-practice-btn').click();
  assert.equal(document.getElementById('sprint-practice-btn').hidden, true, 'hidden inside the sandbox');
  assert.equal(cells().length, 4, 'and the lock did not block practice');
});

test('a finished run locks the day to a result view', async (t) => {
  const state = { daily: defaultDaily() };
  state.daily.games.sprint.today = {
    day: CONFIG.day, correct: 9, rounds: 16, elapsedMs: 64000,
    marks: new Array(16).fill('green'),
  };
  const { sprint } = freshSprint({ state });
  t.after(() => sprint.stop());
  sprint.start();

  assert.equal(document.getElementById('sprint-result').hidden, false);
  assert.equal(document.getElementById('sprint-start-btn').hidden, true, 'no way to play it again');
  assert.equal(document.getElementById('sprint-replay-btn').hidden, true);
  assert.equal(document.getElementById('sprint-degree-buttons').hidden, true);
  assert.match(document.getElementById('sprint-result-title').textContent, /9\/16 in 1:04/);
  assert.equal(document.getElementById('sprint-clock').textContent, '1:04');
});
