// Daily stats — pure reducer over completed puzzles. Persisted in the Store's
// `daily` block; the UI renders it and feeds finished results back in.
//
// Streak counts consecutive *solved* days (a soft fail or a skipped day breaks
// it). `dist` is a 6-bucket histogram of winning guess counts (index 0 = solved
// in 1). `today` snapshots the last finished puzzle so the screen can lock to a
// result view and rebuild the share grid until the next local midnight.

import { MAX_MELODY_LENGTH } from './schedule.js';

export function defaultDaily() {
  return {
    lastDay: null,
    today: null, // { day, solved, guesses, maxGuesses, rows }
    progress: null, // in-progress puzzle: { day, guesses: [[d…]…] } — resumed on re-entry
    streak: 0,
    maxStreak: 0,
    played: 0,
    wins: 0,
    // One bucket per possible guess count (a Guess per note, up to the hardest day).
    dist: new Array(MAX_MELODY_LENGTH).fill(0),
  };
}

/** True if the given day's puzzle is already finished (lock the screen). */
export function isPlayed(daily, day) {
  return !!daily.today && daily.today.day === day;
}

/**
 * Fold a finished result into the stats block. Idempotency is the caller's job
 * (guard with isPlayed) — this always advances `played`.
 *   result: { day, solved, guesses, rows }
 */
export function recordResult(prev, result) {
  const { day, solved, guesses, maxGuesses, rows } = result;
  const consecutive = prev.lastDay === day - 1;
  const streak = solved ? (consecutive ? prev.streak + 1 : 1) : 0;
  const dist = [...prev.dist];
  if (solved) dist[guesses - 1] += 1;
  return {
    lastDay: day,
    today: { day, solved, guesses, maxGuesses, rows },
    streak,
    maxStreak: Math.max(prev.maxStreak, streak),
    played: prev.played + 1,
    wins: prev.wins + (solved ? 1 : 0),
    dist,
  };
}

export function winPercent(daily) {
  return daily.played ? Math.round((daily.wins / daily.played) * 100) : 0;
}
