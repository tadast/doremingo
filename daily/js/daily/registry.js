// Daily game registry — keyed by gameId from dailyConfig().
//
// Only "melody" (Daily Melody) is implemented. "sprint" and "climb" are the two
// other daily-game concepts kept on file to trial later and pick the keeper;
// they are registered as stubs so the shell (routing, seeding, day lock, stats,
// share) stays game-agnostic and a future game just slots in here. The shell
// only ever instantiates gameId 'melody' today.

import { createMelodyGame } from './melody.js';

// Daily Sprint (NOT IMPLEMENTED) — a seeded time-trial: the same fixed run of
// single-note Degree Questions for everyone, raced for time/accuracy. Would
// reuse createSession(level, seededRng).
function createSprintGame() {
  throw new Error('Daily Sprint is not implemented yet');
}

// Daily Climb (NOT IMPLEMENTED) — a seeded, timed Warmup-style ladder: the pool
// grows as you streak; share the peak tier reached before the clock runs out.
function createClimbGame() {
  throw new Error('Daily Climb is not implemented yet');
}

export const DAILY_GAMES = {
  melody: createMelodyGame,
  sprint: createSprintGame,
  climb: createClimbGame,
};
