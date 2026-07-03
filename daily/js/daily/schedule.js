// Daily schedule — maps a calendar date to that day's puzzle parameters.
//
// One shared puzzle per day. The day's difficulty ramps across
// the week, Monday easy → Sunday hard: melody length grows 5→7 and the Degree
// pool widens from a diatonic subset to full diatonic + chromatic colours
// (Fi/Te) with an octave spread. Major mode only for v1.
//
// Guesses = length - 2 (floor 3): fewer chances than notes keeps it a real
// challenge (5 notes → 3 guesses, 7 → 5). Replaying the tune isn't budgeted here:
// the UI auto-replays after each Guess + one manual replay per turn.

// Daily #1. Adjust before public launch if needed; changing it renumbers every
// puzzle (cosmetic — the puzzles themselves are seeded by the date string).
export const DAILY_EPOCH = { y: 2026, m: 5, d: 29 }; // 2026-06-29 (month is 0-based)

// Keyed by JS Date.getDay(): 0 = Sunday … 6 = Saturday. Length 5–7.
export const DAILY_SCHEDULE = {
  1: { length: 5, pool: [1, 2, 3, 5], octaves: [0] }, // Mon
  2: { length: 5, pool: [1, 2, 3, 4, 5], octaves: [0] }, // Tue
  3: { length: 6, pool: [1, 2, 3, 4, 5, 6], octaves: [0] }, // Wed
  4: { length: 6, pool: [1, 2, 3, 4, 5, 6, 7], octaves: [0] }, // Thu
  5: { length: 7, pool: [1, 2, 3, 4, 5, 6, 7, 'fi'], octaves: [0] }, // Fri
  6: { length: 7, pool: [1, 2, 3, 4, 5, 6, 7, 'te'], octaves: [-1, 0, 1] }, // Sat
  0: { length: 7, pool: [1, 2, 3, 4, 5, 6, 7, 'fi', 'te'], octaves: [-1, 0, 1] }, // Sun
};

// Hardest day's length — the upper bound for guess rows / distribution buckets.
export const MAX_MELODY_LENGTH = 7;

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
    maxGuesses: Math.max(3, base.length - 2), // fewer chances than notes
    ...base,
  };
}
