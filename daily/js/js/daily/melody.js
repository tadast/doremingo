// Daily Melody — the pure game brain. No DOM, no audio (the UI adapter owns
// playback and rendering, mirroring how Round/Warmup split brain from glue).
//
// The player echoes a hidden melody by Degree. Each submitted Guess is a full-
// length row, scored per position (feedback.js). Up to maxGuesses rows; solving
// (all green) ends it. Running out is a *soft fail* — the brain flips `revealed`
// so the UI can play the tune out (a teaching beat, not a punishment). This is
// the one place the game's no-fail ethos is relaxed, scoped to Daily — see
// ADR-0003.
//
// Replaying the tune isn't a scored resource — the UI auto-replays after each
// Guess and allows one manual replay per turn — so the brain doesn't track it.

import { scoreGuess, isSolved } from './feedback.js';

export function createMelodyGame({ target, maxGuesses = 6 }) {
  const rows = []; // [{ guess: [d…], marks: ['green'|'yellow'|'grey'…] }]
  let solved = false;
  let failed = false;
  const targetSet = new Set(target.map(String));

  return {
    get rows() {
      return rows;
    },
    get guessesUsed() {
      return rows.length;
    },
    get solved() {
      return solved;
    },
    get failed() {
      return failed;
    },
    get done() {
      return solved || failed;
    },
    /** Soft-fail reveal: once failed, the UI should play the tune in full. */
    get revealed() {
      return failed;
    },

    /** Is this Degree absent from the tune? (drives greying-out its button) */
    isAbsent(degree) {
      return !targetSet.has(String(degree));
    },

    /** Grade a full-length guess. Returns the new row. Throws once the game is done. */
    submit(guess) {
      if (this.done) throw new Error('game already finished');
      const marks = scoreGuess(target, guess);
      const row = { guess: [...guess], marks };
      rows.push(row);
      if (isSolved(marks)) solved = true;
      else if (rows.length >= maxGuesses) failed = true;
      return row;
    },

    /** Final result, for stats + share. */
    result() {
      return {
        solved,
        failed,
        guesses: rows.length,
        maxGuesses,
        rows: rows.map((r) => r.marks),
      };
    },
  };
}
