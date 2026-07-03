import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateMelody, melodyMidis } from '../js/daily/puzzle.js';
import { seededRng } from '../js/daily/rng.js';
import { dailyConfig } from '../js/daily/schedule.js';
import { degreeToMidi } from '../js/theory.js';

const dateFor = (gen) => generateMelody(seededRng(gen.seed), gen);

test('same date yields an identical melody', () => {
  const cfg = dailyConfig(new Date(2026, 5, 29));
  assert.deepEqual(dateFor(cfg), dateFor(cfg));
});

test('different dates yield different melodies', () => {
  const a = dateFor(dailyConfig(new Date(2026, 5, 29)));
  const b = dateFor(dailyConfig(new Date(2026, 5, 30)));
  assert.notDeepEqual(a, b);
});

test('melody respects the day config', () => {
  const cfg = dailyConfig(new Date(2026, 6, 5)); // Sunday: len 7, octaves -1..1
  const m = dateFor(cfg);
  assert.equal(m.degrees.length, cfg.length);
  assert.equal(m.octaves.length, cfg.length);
  for (const d of m.degrees) assert.ok(cfg.pool.includes(d), `${d} not in pool`);
  for (const o of m.octaves) assert.ok(cfg.octaves.includes(o), `octave ${o} not allowed`);
});

test('no two adjacent degrees repeat', () => {
  for (let d = 0; d < 14; d++) {
    const cfg = dailyConfig(new Date(2026, 5, 29 + d));
    const m = dateFor(cfg);
    for (let i = 1; i < m.degrees.length; i++) {
      assert.notEqual(String(m.degrees[i]), String(m.degrees[i - 1]));
    }
  }
});

test('midis match the degree/octave/tonic', () => {
  const cfg = dailyConfig(new Date(2026, 5, 29));
  const m = dateFor(cfg);
  const midis = melodyMidis(m);
  assert.equal(midis[0], degreeToMidi(m.tonic, m.degrees[0], m.octaves[0], m.mode));
});
