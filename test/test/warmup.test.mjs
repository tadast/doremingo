import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createWarmup,
  WARMUP_STAGES,
  WARMUP_MAX_QUESTIONS,
} from '../js/warmup.js';

test('starts on the home chord, Do-Mi-Sol', () => {
  const w = createWarmup();
  assert.deepEqual(w.pool, [1, 3, 5]);
});

test('advancing climbs the playlist, reporting each new note', () => {
  const w = createWarmup();
  const first = w.advance(); // + Re
  assert.equal(first.addedDegree, 2);
  assert.deepEqual(w.pool, [1, 2, 3, 5]);

  const second = w.advance(); // + La — the major pentatonic
  assert.equal(second.addedDegree, 6);
  assert.deepEqual(w.pool, [1, 2, 3, 5, 6]);
});

test('advancing past the top Stage reports done', () => {
  const w = createWarmup();
  w.advance();
  w.advance();
  const past = w.advance();
  assert.equal(past.done, true);
  assert.deepEqual(w.pool, [1, 2, 3, 5, 6], 'cursor stays on the top Stage when done');
});

test('countQuestion reports the cap on the last allowed Question', () => {
  const w = createWarmup();
  let hit = false;
  for (let i = 0; i < WARMUP_MAX_QUESTIONS; i++) hit = w.countQuestion();
  assert.equal(hit, true, 'cap reached at WARMUP_MAX_QUESTIONS');

  const w2 = createWarmup();
  let last = false;
  for (let i = 0; i < WARMUP_MAX_QUESTIONS - 1; i++) last = w2.countQuestion();
  assert.equal(last, false, 'not yet capped one Question short');
});

test('the ramp never introduces Fa (4) or Ti (7)', () => {
  for (const stage of WARMUP_STAGES) {
    assert.ok(!stage.includes(4), 'Fa must not appear');
    assert.ok(!stage.includes(7), 'Ti must not appear');
  }
});
