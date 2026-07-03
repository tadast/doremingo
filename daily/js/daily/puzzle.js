// Daily Melody puzzle generation — pure, deterministic given an rng.
//
// Builds the hidden melody from a day's config: a seeded Key (movable-do, so no
// absolute-pitch crutch — ADR-0001), then a run of Degrees drawn from the day's
// pool, each at a seeded octave. The answer is Degree-only; octave just changes
// which pitch is *played* (harder to hear), never the answer — exactly how Learn
// L10 works. Adjacent identical Degrees are avoided to keep it melodic; non-
// adjacent repeats are allowed (they are what makes the "right note, wrong spot" hint bite).

import { degreeToMidi } from '../theory.js';
import { pick } from './rng.js';

/** Seeded tonic in G3–F#4, the same range Learn's random-key levels use. */
function seededTonic(rng) {
  return 55 + Math.floor(rng() * 12);
}

/**
 * Generate the day's melody. Returns:
 *   { tonic, mode, degrees: [d, …], octaves: [o, …] }
 * `degrees` is the answer key; `octaves` pairs with it for playback.
 */
export function generateMelody(rng, config) {
  const { length, pool, octaves = [0], mode = 'major' } = config;
  const tonic = seededTonic(rng);
  const degrees = [];
  const noteOctaves = [];
  let prev = null;
  for (let i = 0; i < length; i++) {
    let d;
    do {
      d = pick(pool, rng);
    } while (pool.length > 1 && d === prev);
    degrees.push(d);
    noteOctaves.push(pick(octaves, rng));
    prev = d;
  }
  return { tonic, mode, degrees, octaves: noteOctaves };
}

/** MIDI pitches for a generated melody, for the Piano to play. */
export function melodyMidis(puzzle) {
  return puzzle.degrees.map((d, i) => degreeToMidi(puzzle.tonic, d, puzzle.octaves[i], puzzle.mode));
}
