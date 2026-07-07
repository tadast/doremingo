import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createQuizMode } from '../js/quiz-mode.js';
import { createSession, createBar } from '../js/quiz.js';

// The engine drives a Round through the same three adapters the Round itself
// uses, plus a tiny `el`/showScreen surface. Spying on them lets us prove Learn
// and Warmup share one engine with no DOM and no real audio.

class FakeAudio {
  constructor() { this.t = 0; }
  get now() { return this.t; }
  playNote(m, when, dur = 1) { return when + dur; }
  playChord(ms, when, dur = 1) { return when + dur; }
  playSequence(ms, when, dur = 0.45, gap = 0.05) { return when + ms.length * (dur + gap); }
  stopAll() {}
}

class FakeView {
  constructor() { this.bars = []; this.built = 0; }
  buildAnswerButtons() { this.built += 1; }
  renderBar(value, size) { this.bars.push([value, size]); }
  beginQuestion() {}
  setPrompt() {}
  enableAnswers() {}
  setButtonsEnabled() {}
  setReplaysEnabled() {}
  clearHighlights() {}
  renderSlots() {}
  showResult() {}
  showResolution() {}
}

class FakeClock {
  constructor() { this.pending = []; this.seq = 0; }
  schedule(ms, cb) { const id = ++this.seq; this.pending.push({ id, cb }); return id; }
  cancel(id) { this.pending = this.pending.filter((p) => p.id !== id); }
  flush() { const p = this.pending.shift(); if (p) p.cb(); return !!p; }
}

function seededRng() {
  let s = 1;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

function setup() {
  const view = new FakeView();
  const clock = new FakeClock();
  const el = { levelTitle: {}, backspaceBtn: {}, quizScreen: {} };
  let shown = null;
  const quizMode = createQuizMode({
    piano: new FakeAudio(), view, clock, el,
    showScreen: (s) => { shown = s; },
  });
  return { quizMode, view, clock, el, shown: () => shown };
}

const LEVEL = { id: 1, name: 'Test', degrees: [1, 3, 5], cadenceEvery: 1, tonic: 60 };

// Answer the current question correctly, flushing the answerable + resolution timers.
function answerCorrect(quizMode, clock) {
  clock.flush(); // → answering
  quizMode.answer(quizMode.round.session.currentDegree);
  clock.flush(); // resolution → advance
}

test('runStage builds answers, renders the Bar, shows the quiz screen, starts a Round', () => {
  const { quizMode, view, el, shown } = setup();
  quizMode.runStage({
    level: LEVEL, session: createSession(LEVEL, seededRng()),
    bar: createBar(3, 0), tonic: 60, mode: 'major',
    title: 'Level 1', showBackspace: false, barView: { value: 0, size: 3 },
  });
  assert.equal(view.built, 1);
  assert.deepEqual(view.bars[0], [0, 3]);
  assert.equal(el.levelTitle.textContent, 'Level 1');
  assert.equal(shown(), el.quizScreen);
  assert.equal(quizMode.phase, 'presenting');
});

test('a Learn Stage (draining Bar) drains on a miss but does not reset', () => {
  const { quizMode, clock } = setup();
  quizMode.runStage({
    level: LEVEL, session: createSession(LEVEL, seededRng()),
    bar: createBar(5, 2), tonic: 60, mode: 'major',
    title: 'Learn', showBackspace: false, barView: { value: 2, size: 5 },
  });
  clock.flush(); // → answering
  const asked = quizMode.round.session.currentDegree;
  const wrong = [1, 3, 5].find((d) => d !== asked);
  quizMode.answer(wrong);
  assert.equal(quizMode.bar.value, 1.5, 'drained by 0.5, not reset');
});

test('a Warmup Stage (reset-on-miss Bar) clears after a 3-streak and fires onCleared', () => {
  const { quizMode, clock } = setup();
  let cleared = 0;
  let persists = 0;
  quizMode.runStage({
    level: LEVEL, session: createSession(LEVEL, seededRng()),
    bar: createBar(3, 0, { drain: Infinity }), tonic: 60, mode: 'major',
    title: 'Warmup', showBackspace: false, barView: { value: 0, size: 3 },
    onPersist: () => { persists += 1; },
    onCleared: () => { cleared += 1; },
  });
  answerCorrect(quizMode, clock);
  answerCorrect(quizMode, clock);
  answerCorrect(quizMode, clock);
  assert.equal(cleared, 1, 'three in a row clears the Warmup Stage');
  assert.equal(persists, 3, 'onPersist ran once per graded answer');
  assert.equal(quizMode.phase, 'done');
});

test('a reset-on-miss Bar drops to 0 on a miss mid-streak', () => {
  const { quizMode, clock } = setup();
  quizMode.runStage({
    level: LEVEL, session: createSession(LEVEL, seededRng()),
    bar: createBar(3, 0, { drain: Infinity }), tonic: 60, mode: 'major',
    title: 'Warmup', showBackspace: false, barView: { value: 0, size: 3 },
  });
  clock.flush();
  quizMode.answer(quizMode.round.session.currentDegree); // 1
  clock.flush();
  assert.equal(quizMode.bar.value, 1);
  clock.flush(); // → answering on next question
  const asked = quizMode.round.session.currentDegree;
  const wrong = [1, 3, 5].find((d) => d !== asked);
  quizMode.answer(wrong);
  assert.equal(quizMode.bar.value, 0, 'streak reset to zero');
});
