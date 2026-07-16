// Daily Sprint — the pure game brain plus its run generation. No DOM, no audio
// (the UI adapter owns playback, rendering and the stopwatch), mirroring how
// melody.js splits from ui.js.
//
// Sixteen single-note Degree Questions climbing the four Tiers four at a time:
// Easy pentatonic → + Ti → full diatonic → the whole keyboard (Master, the one
// place Daily goes chromatic — see ADR-0004). One tap answers; there is no undo
// and no partial credit. Misses are banked and Revealed together once the run
// ends — resolving after every answer would cost ~30s and stop a Sprint being a
// sprint — and the Reveal is offered, never forced.
//
// The clock is NOT in here. A stopwatch is a score, not a rule: nothing about
// grading depends on it, so the UI stamps elapsed time and hands it to result().
// See ADR-0004 for why it never counts down.

import { degreeToMidi } from '../theory.js';
import { seededTonic } from './puzzle.js';
import { pick } from './rng.js';

/**
 * Build the day's run. Returns:
 *   { tonic, mode, questions: [{ degree, tier, pool, tierIndex }, …] }
 * Deterministic given the rng, so everyone gets the same sixteen. Adjacent
 * repeats are avoided (as in generateMelody) — hearing the same Degree twice
 * running reads as a bug, not a question.
 */
export function generateSprintRun(rng, config) {
  const { tiers, perTier, mode = 'major' } = config;
  // Practice pins its tonic so repeat visits sound identical; the Daily seeds one.
  const tonic = config.tonic ?? seededTonic(rng);
  const questions = [];
  let prev = null;
  tiers.forEach(({ tier, pool }, tierIndex) => {
    for (let i = 0; i < perTier; i++) {
      let degree;
      do {
        degree = pick(pool, rng);
      } while (pool.length > 1 && degree === prev);
      questions.push({ degree, tier, pool, tierIndex });
      prev = degree;
    }
  });
  return { tonic, mode, questions };
}

/** MIDI pitch for one Question, for the Piano to play. Home octave throughout. */
export function questionMidi(run, question) {
  return degreeToMidi(run.tonic, question.degree, 0, run.mode);
}

export function createSprintGame({ questions }) {
  const answers = []; // [{ degree, answer, correct, tier, tierIndex }]

  return {
    get questions() {
      return questions;
    },
    get answers() {
      return answers;
    },
    /** Index of the Question now being asked (== how many are answered). */
    get index() {
      return answers.length;
    },
    get current() {
      return questions[answers.length] ?? null;
    },
    get done() {
      return answers.length >= questions.length;
    },
    get correct() {
      return answers.filter((a) => a.correct).length;
    },

    /** True when the next Question opens a new Tier — the UI re-anchors the key there. */
    isTierStart(i = answers.length) {
      const q = questions[i];
      return !!q && (i === 0 || questions[i - 1].tierIndex !== q.tierIndex);
    },

    /**
     * Grade one answer. Returns the row — `index` is the Question's place in the
     * run, so the board can find the cell it belongs to (and the Reveal can
     * light it up again later). Throws once the run is over.
     */
    answer(degree) {
      if (this.done) throw new Error('run already finished');
      const index = answers.length;
      const q = questions[index];
      const row = { ...q, index, answer: degree, correct: String(q.degree) === String(degree) };
      answers.push(row);
      return row;
    },

    /** The rows to walk through in the end-of-run Reveal. */
    misses() {
      return answers.filter((a) => !a.correct);
    },

    /**
     * Final result, for stats + share. `marks` is one entry per Question in
     * order — the share grid chunks it back into Tier rows. `answers` is what
     * the player actually tapped: stored so the Reveal can still name what they
     * said after a reload (the Questions themselves regenerate from the seed).
     */
    result(elapsedMs = 0) {
      return {
        correct: this.correct,
        rounds: questions.length,
        elapsedMs,
        marks: answers.map((a) => (a.correct ? 'green' : 'grey')),
        answers: answers.map((a) => a.answer),
      };
    },
  };
}
