import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  defaultDaily, recordResult, isPlayed, winPercent, gameStats, playedAnyToday,
} from '../js/daily/stats.js';

const melodyWin = (day, guesses = 3) => ({ day, solved: true, guesses, maxGuesses: 3, rows: [] });
const melodyFail = (day) => ({ day, solved: false, guesses: 3, maxGuesses: 3, rows: [] });
const sprintRun = (day, correct = 8, elapsedMs = 60000) => ({
  day, correct, rounds: 12, elapsedMs, marks: [],
});

test('first play starts a streak of one', () => {
  const s = recordResult(defaultDaily(), 'melody', melodyWin(1));
  assert.equal(s.streak, 1);
  assert.equal(s.maxStreak, 1);
  const m = gameStats(s, 'melody');
  assert.equal(m.wins, 1);
  assert.equal(m.played, 1);
  assert.deepEqual(m.dist, [0, 0, 1, 0, 0]); // 5 buckets (fixed 5-note day)
});

test('consecutive days extend the streak', () => {
  let s = recordResult(defaultDaily(), 'melody', melodyWin(1, 2));
  s = recordResult(s, 'melody', melodyWin(2, 3));
  assert.equal(s.streak, 2);
  assert.equal(s.maxStreak, 2);
});

// The headline change of ADR-0004: the streak measures showing up, not winning.
test('a soft fail keeps the streak alive', () => {
  let s = recordResult(defaultDaily(), 'melody', melodyWin(1, 2));
  s = recordResult(s, 'melody', melodyFail(2));
  assert.equal(s.streak, 2);
  assert.equal(gameStats(s, 'melody').played, 2);
  assert.equal(gameStats(s, 'melody').wins, 1);
});

test('playing only Sprint keeps the streak alive', () => {
  let s = recordResult(defaultDaily(), 'melody', melodyWin(1));
  s = recordResult(s, 'sprint', sprintRun(2));
  assert.equal(s.streak, 2);
});

test('a skipped day resets the streak to one', () => {
  let s = recordResult(defaultDaily(), 'melody', melodyWin(1));
  s = recordResult(s, 'melody', melodyWin(3)); // day 2 skipped
  assert.equal(s.streak, 1);
  assert.equal(s.maxStreak, 2 - 1); // never got past 1
});

test('both games on one day bump the streak once', () => {
  let s = recordResult(defaultDaily(), 'melody', melodyWin(1));
  s = recordResult(s, 'sprint', sprintRun(1));
  assert.equal(s.streak, 1);
  assert.equal(s.maxStreak, 1);
});

test('the day lock is per game', () => {
  const s = recordResult(defaultDaily(), 'melody', melodyWin(5));
  assert.ok(isPlayed(s, 5, 'melody'));
  assert.ok(!isPlayed(s, 5, 'sprint')); // Melody today does not lock Sprint
  assert.ok(!isPlayed(s, 6, 'melody'));
});

test('playedAnyToday is true once either game is done', () => {
  const s = recordResult(defaultDaily(), 'sprint', sprintRun(4));
  assert.ok(playedAnyToday(s, 4));
  assert.ok(!playedAnyToday(s, 5));
});

test('recording one game leaves the other block untouched', () => {
  let s = recordResult(defaultDaily(), 'melody', melodyWin(1));
  s = recordResult(s, 'sprint', sprintRun(1));
  assert.equal(gameStats(s, 'melody').played, 1);
  assert.equal(gameStats(s, 'sprint').played, 1);
  assert.equal(gameStats(s, 'melody').today.day, 1);
});

test('winPercent rounds wins over played', () => {
  let s = recordResult(defaultDaily(), 'melody', melodyWin(1, 1));
  s = recordResult(s, 'melody', melodyFail(2));
  assert.equal(winPercent(gameStats(s, 'melody')), 50);
});

test("Sprint's best keeps the most correct, then the fastest", () => {
  let s = recordResult(defaultDaily(), 'sprint', sprintRun(1, 8, 60000));
  assert.deepEqual(gameStats(s, 'sprint').best, { correct: 8, elapsedMs: 60000 });

  // fewer correct but faster — not better
  s = recordResult(s, 'sprint', sprintRun(2, 7, 30000));
  assert.deepEqual(gameStats(s, 'sprint').best, { correct: 8, elapsedMs: 60000 });

  // more correct — better regardless of time
  s = recordResult(s, 'sprint', sprintRun(3, 9, 90000));
  assert.deepEqual(gameStats(s, 'sprint').best, { correct: 9, elapsedMs: 90000 });

  // same correct, faster — better
  s = recordResult(s, 'sprint', sprintRun(4, 9, 45000));
  assert.deepEqual(gameStats(s, 'sprint').best, { correct: 9, elapsedMs: 45000 });
});

test('finishing clears that game in-progress record', () => {
  const prev = defaultDaily();
  prev.games.melody.progress = { day: 1, guesses: [[1, 2, 3]] };
  const s = recordResult(prev, 'melody', melodyWin(1));
  assert.equal(gameStats(s, 'melody').progress, null);
});
