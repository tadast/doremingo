// Practice — a fixed, forgiving sandbox for each Daily game. Unlike the Daily it
// never changes, never locks, and never touches stats: a safe place to learn the
// mechanics before spending your one attempt of the day (CONTEXT.md: Practice).
//
// Melody practises on "Mary had a little lamb" — a tune the ear already knows, so
// only the solfège mapping is new. Sprint practises on the home chord alone.
// Fixed C tonic throughout (like Warmup) so repeat visits sound identical.

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

// The Sprint sandbox: four notes drawn from the home chord (Do-Mi-Sol) — Learn's
// Level 1 pool, the widest-spaced and most distinct notes in the key. Deliberately
// NARROWER than the Easy Tier: this teaches the mechanic (hear one note, tap it),
// so the ear should never be the hard part. One short lane, no Tier ladder to
// climb and no clock — the real Sprint introduces those once the tapping is
// second nature.
export const PRACTICE_SPRINT = {
  pool: [1, 3, 5], // home chord — Do, Mi, Sol
  tonic: 60,
  mode: 'major',
  rounds: 4,
};

/** Config shaped like dailyConfig(date, 'sprint') so ui-sprint drives either. */
export function sprintPracticeConfig() {
  const { pool, tonic, mode, rounds } = PRACTICE_SPRINT;
  return {
    gameId: 'sprint',
    practice: true,
    mode,
    tonic, // fixed, so practice sounds the same every visit
    seed: 'practice:sprint',
    octaves: [0],
    // One lane, no Tier: the practice pool is narrower than Easy, so calling it
    // a Tier would break what Tier means (CONTEXT.md: Tier).
    tiers: [{ tier: null, pool }],
    perTier: rounds,
    rounds,
    pool,
  };
}
