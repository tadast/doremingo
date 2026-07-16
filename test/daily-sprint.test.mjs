import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateSprintRun, createSprintGame, questionMidi } from '../js/daily/sprint.js';
import { seededRng } from '../js/daily/rng.js';
import { dailyConfig, SPRINT_TIERS, SPRINT_PER_TIER } from '../js/daily/schedule.js';

const config = dailyConfig(new Date(2026, 6, 16), 'sprint');
const runFor = (seed = config.seed) => generateSprintRun(seededRng(seed), config);
const gameFor = (run) => createSprintGame({ questions: run.questions });

test('the run is sixteen Questions climbing the four Tiers, four each', () => {
  const run = runFor();
  assert.equal(run.questions.length, 16);
  assert.deepEqual(
    run.questions.map((q) => q.tier),
    [
      ...Array(SPRINT_PER_TIER).fill('Easy'),
      ...Array(SPRINT_PER_TIER).fill('Medium'),
      ...Array(SPRINT_PER_TIER).fill('Hard'),
      ...Array(SPRINT_PER_TIER).fill('Master'),
    ],
  );
});

// Sprint departs from Melody's diatonic-only rule on its last row only (ADR-0004).
test('Master opens the whole keyboard; the Tiers below stay diatonic', () => {
  const run = runFor();
  const diatonic = (d) => /^[1-7]$/.test(String(d));
  for (const q of run.questions) {
    if (q.tier === 'Master') continue;
    assert.ok(diatonic(q.degree), `${q.tier} leaked a chromatic: ${q.degree}`);
  }
  assert.equal(SPRINT_TIERS.at(-1).pool.length, 12, 'Master pool is all twelve keys');
  assert.ok(SPRINT_TIERS.at(-1).pool.includes('fi'), 'chromatics are in there');
});

test('every Question draws from its own Tier pool', () => {
  const run = runFor();
  for (const q of run.questions) {
    const pool = SPRINT_TIERS.find((t) => t.tier === q.tier).pool;
    assert.ok(pool.includes(q.degree), `${q.degree} not in the ${q.tier} pool`);
  }
});

test('the same seed deals the identical run — everyone gets the same sixteen', () => {
  const a = runFor();
  const b = runFor();
  assert.equal(a.tonic, b.tonic);
  assert.deepEqual(a.questions.map((q) => q.degree), b.questions.map((q) => q.degree));
});

test('a different day deals a different run', () => {
  const other = generateSprintRun(seededRng(dailyConfig(new Date(2026, 6, 17), 'sprint').seed), config);
  assert.notDeepEqual(runFor().questions.map((q) => q.degree), other.questions.map((q) => q.degree));
});

// The seed folds in the gameId precisely so this can't happen.
test("Sprint and Melody don't correlate on the same date", () => {
  const date = new Date(2026, 6, 16);
  assert.notEqual(dailyConfig(date, 'melody').seed, dailyConfig(date, 'sprint').seed);
});

test('no Question repeats the Degree before it', () => {
  // sweep a fortnight — a single day could pass by luck
  for (let d = 1; d <= 14; d++) {
    const run = generateSprintRun(seededRng(`2026-07-${String(d).padStart(2, '0')}:sprint`), config);
    for (let i = 1; i < run.questions.length; i++) {
      assert.notEqual(run.questions[i].degree, run.questions[i - 1].degree);
    }
  }
});

test('answering grades against the current Question and advances', () => {
  const run = runFor();
  const game = gameFor(run);
  const first = game.current;
  assert.equal(game.index, 0);

  const row = game.answer(first.degree);
  assert.ok(row.correct);
  assert.equal(game.index, 1);
  assert.equal(game.correct, 1);
  assert.notEqual(game.current, first);
});

test('a wrong answer still advances and is banked as a miss', () => {
  const run = runFor();
  const game = gameFor(run);
  const wrong = run.questions[0].degree === 1 ? 2 : 1;
  const row = game.answer(wrong);
  assert.equal(row.correct, false);
  assert.equal(game.correct, 0);
  assert.equal(game.misses().length, 1);
  assert.equal(game.misses()[0].answer, wrong);
  assert.equal(game.misses()[0].degree, run.questions[0].degree);
});

test('isTierStart marks the first Question of each Tier', () => {
  const run = runFor();
  const game = gameFor(run);
  assert.ok(game.isTierStart(0));
  assert.ok(!game.isTierStart(1));
  assert.ok(game.isTierStart(4)); // Medium opens
  assert.ok(game.isTierStart(8)); // Hard opens
  assert.ok(game.isTierStart(12)); // Master opens
  assert.ok(!game.isTierStart(15));
});

test('the run ends after sixteen and refuses a seventeenth', () => {
  const run = runFor();
  const game = gameFor(run);
  for (const q of run.questions) game.answer(q.degree);
  assert.ok(game.done);
  assert.equal(game.correct, 16);
  assert.throws(() => game.answer(1), /already finished/);
});

test('result carries one mark per Question, in order', () => {
  const run = runFor();
  const game = gameFor(run);
  run.questions.forEach((q, i) => game.answer(i === 2 ? (q.degree === 1 ? 2 : 1) : q.degree));
  const result = game.result(64000);
  assert.equal(result.correct, 15);
  assert.equal(result.rounds, 16);
  assert.equal(result.elapsedMs, 64000);
  assert.equal(result.marks.length, 16);
  assert.equal(result.marks[2], 'grey');
  assert.equal(result.marks[0], 'green');
});

// The brain must not know about the clock — the UI stamps it (ADR-0004).
test('result defaults its elapsed time to zero', () => {
  const run = runFor();
  const game = gameFor(run);
  for (const q of run.questions) game.answer(q.degree);
  assert.equal(game.result().elapsedMs, 0);
});

test('every Question sounds in the home octave', () => {
  const run = runFor();
  // home octave = within an octave above the tonic
  for (const q of run.questions) {
    const midi = questionMidi(run, q);
    assert.ok(midi >= run.tonic && midi < run.tonic + 12, `${midi} outside the home octave`);
  }
});
