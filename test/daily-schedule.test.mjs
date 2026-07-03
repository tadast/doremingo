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

test('config maps weekday to difficulty', () => {
  // 2026-06-29 is a Monday → easiest
  assert.equal(new Date(2026, 5, 29).getDay(), 1);
  const mon = dailyConfig(new Date(2026, 5, 29));
  assert.equal(mon.length, 5);
  assert.equal(mon.gameId, 'melody');
  // guesses = length - 2 (floor 3): 5 notes → 3 chances
  assert.equal(mon.maxGuesses, 3);
  // Sunday → hardest, longest (capped at 7), chromatic
  const sun = dailyConfig(new Date(2026, 6, 5)); // 2026-07-05 is a Sunday
  assert.equal(sun.length, 7);
  assert.equal(sun.maxGuesses, 5); // 7 - 2
  assert.ok(sun.pool.includes('fi') && sun.pool.includes('te'));
  assert.deepEqual(sun.octaves, [0]);
});

test('every day stays in the home octave — no octave spread', () => {
  for (let i = 0; i < 7; i++) {
    const cfg = dailyConfig(new Date(2026, 5, 29 + i));
    assert.deepEqual(cfg.octaves, [0], `${cfg.seed} has an octave spread`);
  }
});

test('guesses are length-2 (floor 3), length capped 5–7', () => {
  for (let i = 0; i < 7; i++) {
    const cfg = dailyConfig(new Date(2026, 5, 29 + i));
    assert.ok(cfg.length >= 5 && cfg.length <= 7, `length ${cfg.length} out of 5–7`);
    assert.equal(cfg.maxGuesses, Math.max(3, cfg.length - 2));
  }
});

test('every weekday has a schedule entry', () => {
  for (let d = 0; d <= 6; d++) assert.ok(DAILY_SCHEDULE[d], `missing day ${d}`);
});
