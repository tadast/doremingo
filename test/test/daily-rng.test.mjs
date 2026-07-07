import { test } from 'node:test';
import assert from 'node:assert/strict';
import { seededRng, cyrb53 } from '../js/daily/rng.js';

test('same seed yields the same sequence', () => {
  const a = seededRng('2026-06-29');
  const b = seededRng('2026-06-29');
  const seqA = Array.from({ length: 10 }, () => a());
  const seqB = Array.from({ length: 10 }, () => b());
  assert.deepEqual(seqA, seqB);
});

test('different seeds diverge', () => {
  const a = seededRng('2026-06-29');
  const b = seededRng('2026-06-30');
  assert.notDeepEqual(
    Array.from({ length: 10 }, () => a()),
    Array.from({ length: 10 }, () => b()),
  );
});

test('values are floats in [0, 1)', () => {
  const r = seededRng('x');
  for (let i = 0; i < 1000; i++) {
    const v = r();
    assert.ok(v >= 0 && v < 1, `${v} out of range`);
  }
});

test('hash is stable across runs', () => {
  assert.equal(cyrb53('2026-06-29'), cyrb53('2026-06-29'));
});
