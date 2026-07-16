// Daily stats — pure reducer over completed puzzles. Persisted in the Store's
// `daily` block; the UI renders it and feeds finished results back in.
//
// Daily is a shelf of games (ADR-0004), so the shape is: Daily-level streak
// fields shared across games, plus one block per game under `games`. The lock
// is per game — `today` lives in the game's block — but the streak is one
// number for all of Daily.
//
// The streak counts consecutive days on which the player finished ANY Daily
// game, regardless of how they did: a Melody soft fail keeps it alive, and a
// Sprint can rescue a bad Melody day. It measures showing up, not winning — see
// ADR-0004 for the trade-off (a streak people keep beats a streak people
// respect). Only a fully skipped day breaks it.

import { MAX_MELODY_LENGTH } from './schedule.js';

export function defaultMelodyStats() {
  return {
    today: null, // { day, solved, guesses, maxGuesses, rows }
    progress: null, // in-progress puzzle: { day, guesses: [[d…]…] } — resumed on re-entry
    played: 0,
    wins: 0,
    // One bucket per possible guess count (a Guess per note, up to the hardest day).
    dist: new Array(MAX_MELODY_LENGTH).fill(0),
  };
}

export function defaultSprintStats() {
  return {
    // `answers` is kept so the Reveal still works on a locked re-entry — the
    // Questions regenerate from the seed, but what the player said would be lost.
    today: null, // { day, correct, rounds, elapsedMs, marks, answers }
    progress: null, // in-progress run: { day, answers: [d…], elapsedMs }
    played: 0,
    best: null, // { correct, elapsedMs } — most correct, then fastest
  };
}

export function defaultDaily() {
  return {
    lastDay: null, // last day ANY game was finished — the streak's anchor
    streak: 0,
    maxStreak: 0,
    games: {
      melody: defaultMelodyStats(),
      sprint: defaultSprintStats(),
    },
  };
}

/** A game's stats block, defaulted — callers shouldn't care if it's new. */
export function gameStats(daily, gameId) {
  return daily?.games?.[gameId] ?? (gameId === 'sprint' ? defaultSprintStats() : defaultMelodyStats());
}

/** True if this day's puzzle for this game is already finished (lock the screen). */
export function isPlayed(daily, day, gameId) {
  const today = gameStats(daily, gameId).today;
  return !!today && today.day === day;
}

/** Did the player finish any Daily game today? (drives the picker's streak copy) */
export function playedAnyToday(daily, day) {
  return daily.lastDay === day;
}

// Most correct wins; ties break on the faster run.
function bestSprint(prev, next) {
  if (!prev) return { correct: next.correct, elapsedMs: next.elapsedMs };
  if (next.correct > prev.correct) return { correct: next.correct, elapsedMs: next.elapsedMs };
  if (next.correct === prev.correct && next.elapsedMs < prev.elapsedMs) {
    return { correct: next.correct, elapsedMs: next.elapsedMs };
  }
  return prev;
}

function foldMelody(prev, result) {
  const { day, solved, guesses, maxGuesses, rows } = result;
  const dist = [...prev.dist];
  if (solved) dist[guesses - 1] += 1;
  return {
    today: { day, solved, guesses, maxGuesses, rows },
    progress: null,
    played: prev.played + 1,
    wins: prev.wins + (solved ? 1 : 0),
    dist,
  };
}

function foldSprint(prev, result) {
  const { day, correct, rounds, elapsedMs, marks, answers = [] } = result;
  return {
    today: { day, correct, rounds, elapsedMs, marks, answers },
    progress: null,
    played: prev.played + 1,
    best: bestSprint(prev.best, result),
  };
}

const FOLDS = { melody: foldMelody, sprint: foldSprint };

/**
 * Fold a finished result into the stats block. Idempotency is the caller's job
 * (guard with isPlayed) — this always advances that game's `played`.
 *   recordResult(prev, 'melody', { day, solved, guesses, maxGuesses, rows })
 *   recordResult(prev, 'sprint', { day, correct, rounds, elapsedMs, marks })
 *
 * The streak advances at most once a day: the second game finished today finds
 * lastDay already set and leaves the streak where the first game put it.
 */
export function recordResult(prev, gameId, result) {
  const { day } = result;
  const alreadyToday = prev.lastDay === day;
  const consecutive = prev.lastDay === day - 1;
  const streak = alreadyToday ? prev.streak : consecutive ? prev.streak + 1 : 1;
  return {
    lastDay: day,
    streak,
    maxStreak: Math.max(prev.maxStreak, streak),
    games: {
      ...prev.games,
      [gameId]: FOLDS[gameId](gameStats(prev, gameId), result),
    },
  };
}

/** Win rate for a game block that tracks wins (Melody). */
export function winPercent(stats) {
  return stats.played ? Math.round((stats.wins / stats.played) * 100) : 0;
}
