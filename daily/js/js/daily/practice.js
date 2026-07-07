// Practice tune — a fixed, famously recognisable melody for first-timers (and
// anyone warming up). Unlike the Daily it never changes, never locks, and never
// touches stats: a safe sandbox to learn the board mechanics on a tune the ear
// already knows, so only the solfège mapping is new.
//
// "Hot Cross Buns": Mi Re Do · Mi Re Do — six notes from a three-note pool.
// Fixed C tonic (like Warmup) so repeat visits sound identical.

export const PRACTICE_TUNE = {
  // title: 'Hot Cross Buns',
  // degrees: [3, 2, 1, 3, 2, 1],
  title: "Marry had a little lamb",
  degrees:  [3,2,1,2,3,3,3],
  pool: [1, 2, 3],
  tonic: 60,
  mode: 'major',
};

/** Config shaped like dailyConfig() so the UI can drive either interchangeably. */
export function practiceConfig() {
  const { degrees, pool, mode } = PRACTICE_TUNE;
  return {
    gameId: 'melody',
    mode,
    length: degrees.length,
    pool,
    octaves: [0],
    maxGuesses: Math.max(3, degrees.length - 2), // same formula as the Daily
  };
}

/** Puzzle shaped like generateMelody()'s output, for melodyMidis() and grading. */
export function practiceMelody() {
  const { tonic, mode, degrees } = PRACTICE_TUNE;
  return { tonic, mode, degrees: [...degrees], octaves: degrees.map(() => 0) };
}
