// Daily game registry — keyed by gameId from dailyConfig().
//
// Daily is a shelf of games (ADR-0004), and this is the shelf: the shell
// (routing, seeding, the day lock, stats, share) stays game-agnostic and a new
// game slots in here. "melody" and "sprint" ship; "climb" is a stub kept on file.
//
// Each factory takes the shape its own game needs — the registry maps ids to
// brains, it does not pretend the brains are interchangeable. The UI adapter for
// a game knows which one it is calling.

import { createMelodyGame } from './melody.js';
import { createSprintGame } from './sprint.js';

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

/** Games with a playable Daily today, in the order the picker lists them. */
export const DAILY_GAME_IDS = ['melody', 'sprint'];
