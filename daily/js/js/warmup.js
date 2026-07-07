// Warmup — the pure brain for the transient warmup ramp. No DOM, no audio.
//
// A short ear-calibration run modelled as a playlist of Stages: start on the
// home chord (Do-Mi-Sol) and advance to the next Stage each time the player
// strings together WARMUP_ADVANCE_STREAK correct answers, climbing to the major
// pentatonic (Do-Re-Mi-Sol-La). The pentatonic deliberately stops short of Fa
// and Ti, the two semitone "tendency tones" that are hardest to hear —
// pentatonic-first is the textbook beginner set.
//
// The streak itself is no longer tracked here: a Warmup Stage's Bar uses a
// reset-on-miss drain rule (createBar(..., { drain: Infinity })), so the Bar IS
// the streak and the Round clears the Stage on a 3-in-a-row. This brain only
// owns the playlist cursor and the question cap — the safety net that ends the
// run for a player who can never string three together. Nothing here persists —
// see ADR-0002.

export const WARMUP_STAGES = [
  [1, 3, 5], // Do Mi Sol — the home chord
  [1, 2, 3, 5], // + Re
  [1, 2, 3, 5, 6], // + La — the major pentatonic
];
export const WARMUP_ADVANCE_STREAK = 3;
export const WARMUP_MAX_QUESTIONS = 20;

export function createWarmup() {
  let stageIndex = 0;
  let questionsAsked = 0;

  return {
    /** The Degree pool for the current Stage. */
    get pool() {
      return WARMUP_STAGES[stageIndex];
    },
    get stageIndex() {
      return stageIndex;
    },
    /** Count one graded Question; true once the cap (the safety net) is reached. */
    countQuestion() {
      questionsAsked += 1;
      return questionsAsked >= WARMUP_MAX_QUESTIONS;
    },
    /**
     * Advance the playlist after a cleared Stage:
     *   { addedDegree } — moved up a Stage, here is the new note it introduces
     *   { done: true }  — the top Stage was cleared; the warmup is complete
     */
    advance() {
      if (stageIndex >= WARMUP_STAGES.length - 1) return { done: true };
      const before = WARMUP_STAGES[stageIndex];
      stageIndex += 1;
      return { addedDegree: WARMUP_STAGES[stageIndex].find((d) => !before.includes(d)) };
    },
  };
}
