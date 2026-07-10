import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dayNumber, localDateKey, dailyConfig, DAILY_SCHEDULE } from '../js/daily/schedule.js';

test('epoch date is Daily #1', () => {
  assert.equal(dayNumber(new Date(2026, 5, 29)), 1); // 2026-06-29
});

test('day number advances by one each calendar day', () => {
  assert.equal(dayNumber(new Date(2026, 5, 30)), 2);
  assert.equal(dayNumber(new Date(2026, 6, 9)), 11);
});

test('day number is stable regardless of time of day (no DST drift)', () => {
  assert.equal(dayNumber(new Date(2026, 9, 25, 0, 30)), dayNumber(new Date(2026, 9, 25, 23, 30)));
});

test('localDateKey is the YYYY-MM-DD seed', () => {
  assert.equal(localDateKey(new Date(2026, 5, 29)), '2026-06-29');
  assert.equal(localDateKey(new Date(2026, 0, 3)), '2026-01-03');
});

test('config maps weekday to a difficulty Tier', () => {
  // 2026-06-29 is a Monday → Easy (major pentatonic, no tendency tones)
  assert.equal(new Date(2026, 5, 29).getDay(), 1);
  const mon = dailyConfig(new Date(2026, 5, 29));
  assert.equal(mon.length, 5);
  assert.equal(mon.gameId, 'melody');
  assert.equal(mon.tier, 'Easy');
  assert.deepEqual(mon.pool, [1, 2, 3, 5, 6]);
  assert.equal(mon.maxGuesses, 3); // 5 - 2
  // Sunday → Hard = full diatonic (adds Fa)
  const sun = dailyConfig(new Date(2026, 6, 5)); // 2026-07-05 is a Sunday
  assert.equal(sun.length, 5);
  assert.equal(sun.tier, 'Hard');
  assert.deepEqual(sun.pool, [1, 2, 3, 4, 5, 6, 7]);
  assert.equal(sun.maxGuesses, 3);
  assert.deepEqual(sun.octaves, [0]);
});

test('every day stays in the home octave — no octave spread', () => {
  for (let i = 0; i < 7; i++) {
    const cfg = dailyConfig(new Date(2026, 5, 29 + i));
    assert.deepEqual(cfg.octaves, [0], `${cfg.seed} has an octave spread`);
  }
});

test('every day is a fixed 5 notes → uniform 3 guesses', () => {
  for (let i = 0; i < 7; i++) {
    const cfg = dailyConfig(new Date(2026, 5, 29 + i));
    assert.equal(cfg.length, 5, `${cfg.seed} is not 5 notes`);
    assert.equal(cfg.maxGuesses, 3, `${cfg.seed} is not 3 guesses`);
  }
});

test('the Daily is diatonic only — no chromatic colours in any pool', () => {
  for (let i = 0; i < 7; i++) {
    const cfg = dailyConfig(new Date(2026, 5, 29 + i));
    for (const d of cfg.pool) {
      assert.equal(typeof d, 'number', `${cfg.seed} pool has a chromatic Degree ${d}`);
      assert.ok(d >= 1 && d <= 7, `${cfg.seed} pool has out-of-range Degree ${d}`);
    }
  }
});

test('every day carries an Easy/Medium/Hard Tier', () => {
  for (let i = 0; i < 7; i++) {
    const cfg = dailyConfig(new Date(2026, 5, 29 + i));
    assert.ok(['Easy', 'Medium', 'Hard'].includes(cfg.tier), `${cfg.seed} tier ${cfg.tier}`);
  }
});

test('every weekday has a schedule entry', () => {
  for (let d = 0; d <= 6; d++) assert.ok(DAILY_SCHEDULE[d], `missing day ${d}`);
});
