// Daily schedule — maps a calendar date to that day's puzzle parameters.
//
// One shared puzzle per day. Every day is a fixed 5 notes; difficulty rides on
// ONE lever — how wide the Degree pool is — surfaced to the player as an
// Easy / Medium / Hard Tier label before they start. Diatonic only: chromatic
// colours (Fi/Te) live in Learn, never in the newcomer-facing Daily.
//   Easy   = major pentatonic (no tendency tones)
//   Medium = + Ti (leading tone — strong pull home, the easier tendency tone)
//   Hard   = + Fa = full diatonic
// Everything stays in the home octave: an octave spread makes the same Degree
// sound like a different note to the untrained ear this game targets. Major
// mode only for v1.
//
// Guesses = length - 2 (floor 3): with length fixed at 5 this is a uniform 3
// every day. Replaying the tune isn't budgeted here: the UI auto-replays after
// each Guess + one manual replay per turn.

// Degree pools per Tier. Single-Degree steps, hardest note (Fa) added last.
const EASY = [1, 2, 3, 5, 6]; // major pentatonic
const MEDIUM = [1, 2, 3, 5, 6, 7]; // + Ti
const HARD = [1, 2, 3, 4, 5, 6, 7]; // + Fa = full diatonic

// Daily #1. Adjust before public launch if needed; changing it renumbers every
// puzzle (cosmetic — the puzzles themselves are seeded by the date string).
export const DAILY_EPOCH = { y: 2026, m: 5, d: 29 }; // 2026-06-29 (month is 0-based)

// Keyed by JS Date.getDay(): 0 = Sunday … 6 = Saturday. Length fixed at 5. The
// weekday→Tier map is a deliberate sawtooth (not a smooth ramp) — an easy day
// is never more than one day away, so a newcomer landing mid-week has a decent
// chance of a gentle puzzle.
export const DAILY_SCHEDULE = {
  1: { length: 5, pool: EASY, octaves: [0], tier: 'Easy' }, // Mon
  2: { length: 5, pool: MEDIUM, octaves: [0], tier: 'Medium' }, // Tue
  3: { length: 5, pool: EASY, octaves: [0], tier: 'Easy' }, // Wed
  4: { length: 5, pool: HARD, octaves: [0], tier: 'Hard' }, // Thu
  5: { length: 5, pool: MEDIUM, octaves: [0], tier: 'Medium' }, // Fri
  6: { length: 5, pool: MEDIUM, octaves: [0], tier: 'Medium' }, // Sat
  0: { length: 5, pool: HARD, octaves: [0], tier: 'Hard' }, // Sun
};

// Every day is 5 notes now — the upper bound for guess rows / distribution
// buckets. (Kept as a named constant: stats sizes its histogram from it.)
export const MAX_MELODY_LENGTH = 5;

const MS_PER_DAY = 86400000;

/** Local YYYY-MM-DD string — the RNG seed and lock key for the given date. */
export function localDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Puzzle number for a date (Daily #1 = DAILY_EPOCH). Computed from the date's
 * local Y-M-D normalised through UTC, so DST shifts can't push it off by a day.
 */
export function dayNumber(date) {
  const today = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  const epoch = Date.UTC(DAILY_EPOCH.y, DAILY_EPOCH.m, DAILY_EPOCH.d);
  return Math.floor((today - epoch) / MS_PER_DAY) + 1;
}

/** Everything needed to build and grade the day's puzzle. */
export function dailyConfig(date) {
  const base = DAILY_SCHEDULE[date.getDay()];
  return {
    gameId: 'melody',
    mode: 'major',
    day: dayNumber(date),
    seed: localDateKey(date),
    maxGuesses: Math.max(3, base.length - 2), // fewer chances than notes → uniform 3
    ...base,
  };
}
