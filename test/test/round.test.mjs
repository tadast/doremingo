import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Round } from '../js/round.js';
import { createSession, createBar } from '../js/quiz.js';

// Fakes for the three adapters the Round drives. Because the Round only
// touches audio/view/clock through these interfaces, the entire Question
// lifecycle is exercisable with no DOM and no real audio.

class FakeAudio {
  constructor() { this.calls = []; this.t = 0; }
  get now() { return this.t; }
  playNote(m, when, dur = 1) { this.calls.push(['note', m, when]); return when + dur; }
  playChord(ms, when, dur = 1) { this.calls.push(['chord', ms, when]); return when + dur; }
  playSequence(ms, when, dur = 0.45, gap = 0.05) { this.calls.push(['seq', ms, when]); return when + ms.length * (dur + gap); }
  stopAll() { this.calls.push(['stop']); }
  kinds() { return this.calls.map((c) => c[0]); }
}

class FakeView {
  constructor() { this.log = []; this.lastResult = null; }
  renderBar(value, size) { this.log.push(['bar', value, size]); }
  beginQuestion() { this.log.push(['begin']); }
  setPrompt(t) { this.log.push(['prompt', t]); }
  enableAnswers() { this.log.push(['enable']); }
  setButtonsEnabled(b) { this.log.push(['btns', b]); }
  setReplaysEnabled(b) { this.log.push(['replays', b]); }
  clearHighlights() { this.log.push(['clearHi']); }
  renderSlots(x) { this.log.push(['slots', x]); }
  showResult(x) { this.lastResult = x; this.log.push(['result', x.correct]); }
  showResolution(path) { this.log.push(['resolution', path.length]); }
  names() { return this.log.map((e) => e[0]); }
}

// One timer is ever pending in a round; flush() fires the earliest.
class FakeClock {
  constructor() { this.pending = []; this.seq = 0; }
  schedule(ms, cb) { const id = ++this.seq; this.pending.push({ id, cb }); return id; }
  cancel(id) { this.pending = this.pending.filter((p) => p.id !== id); }
  flush() { const p = this.pending.shift(); if (p) p.cb(); return !!p; }
}

const LEVEL = { id: 1, name: 'Test', degrees: [1, 3, 5], barSize: 3, cadenceEvery: 1, tonic: 60 };

// Varied deterministic PRNG — a constant rng would lock the Session's
// no-immediate-repeat draw loop (it would keep picking the excluded degree).
function seededRng() {
  let s = 1;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

function makeRound(overrides = {}) {
  const audio = new FakeAudio();
  const view = new FakeView();
  const clock = new FakeClock();
  const persisted = [];
  const cleared = [];
  const round = new Round({
    level: LEVEL,
    session: createSession(LEVEL, seededRng()), // deterministic, non-locking draws
    bar: createBar(3, 0),
    tonic: 60,
    mode: 'major',
    audio, view, clock,
    rng: () => 0,
    onPersist: () => persisted.push(round.bar.value),
    onCleared: () => cleared.push(true),
    ...overrides,
  });
  return { round, audio, view, clock, persisted, cleared };
}

test('start presents the Cadence before the note (ADR-0001 ordering)', () => {
  const { round, audio } = makeRound();
  round.start();
  const kinds = audio.kinds();
  const firstChord = kinds.indexOf('chord');
  const firstNote = kinds.indexOf('note');
  assert.ok(firstChord !== -1, 'a cadence chord plays');
  assert.ok(firstNote > firstChord, 'the question note plays after the cadence');
  assert.equal(round.phase, 'presenting');
});

test('answers are ignored until the answerable timer fires', () => {
  const { round, view } = makeRound();
  round.start();
  round.answer(1); // still presenting
  assert.equal(view.lastResult, null, 'no result while presenting');
  assert.equal(round.phase, 'presenting');
});

test('correct answer fills the bar, plays the Resolution, and advances', () => {
  const { round, audio, view, clock, persisted } = makeRound();
  round.start();
  clock.flush(); // → answering
  assert.equal(round.phase, 'answering');

  const asked = round.session.currentDegree;
  audio.calls.length = 0;
  round.answer(asked);

  assert.equal(view.lastResult.correct, true);
  assert.equal(round.bar.value, 1, 'bar +1 on correct');
  assert.deepEqual(persisted, [1], 'persisted once at new bar value');
  assert.ok(audio.kinds().includes('seq'), 'resolution sequence played');
  assert.equal(round.phase, 'resolving');

  const beginsBefore = view.names().filter((n) => n === 'begin').length;
  clock.flush(); // resolution done → next question
  assert.equal(view.names().filter((n) => n === 'begin').length, beginsBefore + 1, 'next Question presented');
});

test('wrong answer drains the bar and resets the streak', () => {
  const { round, view, clock } = makeRound({ bar: createBar(3, 2) });
  round.start();
  clock.flush();
  const asked = round.session.currentDegree;
  const wrong = [1, 3, 5].find((d) => d !== asked);
  round.streak = 4;
  round.answer(wrong);
  assert.equal(view.lastResult.correct, false);
  assert.equal(round.streak, 0, 'streak reset');
  assert.equal(round.bar.value, 1.5, 'bar drained by 0.5');
});

test('skip during Resolution cancels the timer, stops audio, advances', () => {
  const { round, audio, clock } = makeRound();
  round.start();
  clock.flush();
  round.answer(round.session.currentDegree);
  assert.equal(round.phase, 'resolving');
  const resolveHandle = round.resolveHandle;
  audio.calls.length = 0;
  round.skip();
  assert.ok(audio.kinds().includes('stop'), 'audio stopped');
  assert.ok(!clock.pending.some((p) => p.id === resolveHandle), 'resolution timer cancelled');
  assert.notEqual(round.phase, 'resolving', 'advanced past the Resolution');
});

test('filling the bar fires onCleared and ends the round', () => {
  const { round, clock, cleared } = makeRound({ bar: createBar(1, 0) });
  round.start();
  clock.flush();
  round.answer(round.session.currentDegree); // bar 0 → 1 = full
  clock.flush(); // advance
  assert.deepEqual(cleared, [true]);
  assert.equal(round.phase, 'done');
});

test('stop() tears down pending timers and silences audio', () => {
  const { round, audio, clock } = makeRound();
  round.start();
  round.stop();
  assert.equal(clock.pending.length, 0, 'no pending timers');
  assert.ok(audio.kinds().includes('stop'));
  assert.equal(round.phase, 'idle');
});
