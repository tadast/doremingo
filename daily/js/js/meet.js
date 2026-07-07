// Meet-the-Note — the step sequence shown when a Degree is first unlocked,
// and the first-run tutorial (a chain of meets plus "meet the Cadence").
//
// The stepper (MeetSequence) is pure: it holds the steps and a cursor and
// nothing else. Rendering each step and the audio-unlock on the first step
// stay in the caller (main.js), so this module is testable on its own.

import { degreeInfo } from './theory.js';

// One blurb per Degree, shown the first time it appears.
export const MEET_BLURBS = {
  1: 'Do is home itself — the most restful note of all. Tap it to hear it.',
  2: 'Re sits one step above home, always ready to slide back down. Tap to hear it walk home.',
  3: 'Mi floats a little above home — sunny and settled. Tap to hear it lean back down to Do.',
  4: 'Fa is the gentle leaner — it loves drifting down toward Mi. Tap to hear it find its way home.',
  5: 'Sol is the bright one, higher up — it loves climbing to the next Do. Tap it!',
  6: 'La is the dreamy one, floating above Sol. Tap to hear it climb home.',
  7: 'Ti lives right under the next Do — so close it can’t resist pulling up. Tap it!',
  fi: 'Fi squeezes in between Fa and Sol — sharp, curious, a little cheeky. Tap to hear it tip up into Sol and climb home.',
  te: 'Te is the mellow rebel — a softened Ti that sits a step lower. Tap to hear it push up through Ti to reach home.',
};

// The first-run tutorial: welcome (unlocks audio) → meet the Cadence →
// meet Do/Mi/Sol → ready to play.
export function tutorialSteps() {
  return [
    {
      title: 'Welcome to DoReMingo! 🦩',
      body: 'You’ll learn to recognise notes by how they feel inside music. No experience needed — just your ears.',
      nextLabel: 'Start Tutorial',
      initAudio: true,
    },
    {
      title: 'This is home 🏠',
      body: 'Every piece of music has a key — a home base. This little chord pattern is how DoReMingo shows your ear where home is. It plays before each question.',
      sound: 'cadence',
      nextLabel: 'I heard it!',
      helpHtml: 'Don’t hear anything? Turn up your volume and check the silent switch on the side of your device.',
    },
    { title: 'Meet Do', body: MEET_BLURBS[1], stage: 1 },
    { title: 'Meet Mi', body: MEET_BLURBS[3], stage: 3, resolve: true },
    { title: 'Meet Sol', body: MEET_BLURBS[5], stage: 5, resolve: true },
    {
      title: 'Ready to play! 🎉',
      body: 'You’ll hear home, then one mystery note. Tap which note you think it was. Wrong guesses are great too — every note walks home afterwards, so your ear learns either way.',
      nextLabel: 'Start Level 1',
    },
  ];
}

// The meets shown at a Level's start for Degrees the player hasn't met yet.
export function levelMeetSteps(unmet, tonic, mode) {
  return unmet.map((d, i) => ({
    title: `Meet ${degreeInfo(d, mode).name}`,
    body: MEET_BLURBS[d],
    stage: d,
    resolve: true,
    tonic,
    mode,
    nextLabel: i === unmet.length - 1 ? 'Got it — quiz me!' : 'Next',
  }));
}

/** A cursor over a list of meet steps. Pure — no DOM, no audio. */
export class MeetSequence {
  constructor(steps) {
    this.steps = steps;
    this.idx = 0;
  }

  get index() {
    return this.idx;
  }

  get current() {
    return this.steps[this.idx];
  }

  get isLast() {
    return this.idx >= this.steps.length - 1;
  }

  /** Advance one step. Returns { done: true } when already at the last step. */
  next() {
    if (this.isLast) return { done: true };
    this.idx += 1;
    return { done: false, step: this.current };
  }
}
