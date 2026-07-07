import { test } from 'node:test';
import assert from 'node:assert/strict';

import { PRACTICE_TUNE, practiceConfig, practiceMelody } from '../js/daily/practice.js';
import { melodyMidis } from '../js/daily/puzzle.js';
import { createMelodyGame } from '../js/daily/melody.js';

test('practice config mirrors the daily config shape', () => {
  const cfg = practiceConfig();
  assert.equal(cfg.gameId, 'melody');
  assert.equal(cfg.mode, 'major');
  assert.equal(cfg.length, PRACTICE_TUNE.degrees.length);
  assert.deepEqual(cfg.pool, PRACTICE_TUNE.pool);
  assert.deepEqual(cfg.octaves, [0]);
  assert.equal(cfg.maxGuesses, Math.max(3, cfg.length - 2));
});

test('practice tune only uses degrees from its own pool', () => {
  const pool = new Set(PRACTICE_TUNE.pool);
  for (const d of PRACTICE_TUNE.degrees) assert.ok(pool.has(d), `degree ${d} not in pool`);
});

test('practice melody is playable and gradeable like a daily puzzle', () => {
  const puzzle = practiceMelody();
  assert.equal(puzzle.degrees.length, puzzle.octaves.length);

  const midis = melodyMidis(puzzle);
  assert.equal(midis.length, puzzle.degrees.length);
  for (const m of midis) assert.equal(typeof m, 'number');

  const game = createMelodyGame({ target: puzzle.degrees, maxGuesses: practiceConfig().maxGuesses });
  game.submit([...PRACTICE_TUNE.degrees]);
  assert.ok(game.solved);
});

test('practice melody returns fresh copies (no shared mutable state)', () => {
  const a = practiceMelody();
  a.degrees[0] = 999;
  assert.notEqual(practiceMelody().degrees[0], 999);
  assert.notEqual(PRACTICE_TUNE.degrees[0], 999);
});
