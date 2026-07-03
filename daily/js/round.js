// Round — the Question lifecycle as a deep module.
//
// Owns what happens between a Cadence and the next Question: present
// (cadence → note), enable answers, grade, play the Resolution, advance.
// All timing/phase state lives here; side effects go through three injected
// adapters so the whole loop is testable without a browser or real audio:
//
//   audio  — now, playNote, playChord, playSequence, stopAll  (the Piano in prod)
//   view   — renders prompts/answers/feedback/resolution        (DOM in prod, spy in tests)
//   clock  — schedule(ms, cb) → handle, cancel(handle)          (setTimeout in prod)
//
// Encodes ADR-0001's "Cadence before Question" ordering in one place.

import { degreeToMidi, degreeInfo, resolutionPath, cadenceChords } from './theory.js';
import { applyAnswer, isFull } from './quiz.js';

export class Round {
  constructor({ level, session, bar, tonic, mode, audio, view, clock, rng = Math.random, onPersist = () => {}, onCleared = () => {} }) {
    this.level = level;
    this.session = session;
    this.bar = bar;
    this.tonic = tonic;
    this.mode = mode;
    this.audio = audio;
    this.view = view;
    this.clock = clock;
    this.rng = rng;
    this.onPersist = onPersist;
    this.onCleared = onCleared;

    this.phase = 'idle'; // idle → presenting → answering → resolving → (advance) | done
    this.currentNoteMidis = [];
    this.pendingAnswer = [];
    this.streak = 0;
    this.missStreak = 0;
    this.answerHandle = null;
    this.resolveHandle = null;
  }

  get answering() {
    return this.phase === 'answering';
  }

  seqLen() {
    return this.level.sequenceLength ?? 1;
  }

  start() {
    this.ask();
  }

  /** Present one Question: optional Cadence, then the note(s); enable answers after. */
  ask() {
    this.view.beginQuestion();
    this.pendingAnswer = [];
    this.phase = 'presenting';

    const cadence = this.session.cadenceDue();
    const question = this.session.next();
    const degrees = [].concat(question);
    const octaves = this.level.octaves ?? [0];
    const octave = octaves[Math.floor(this.rng() * octaves.length)];
    this.currentNoteMidis = degrees.map((d) => degreeToMidi(this.tonic, d, octave, this.mode));

    let t = this.audio.now + 0.1;
    if (cadence) {
      this.view.setPrompt('Listen… this is home 🏠');
      for (const chord of cadenceChords(this.tonic, this.mode)) {
        t = this.audio.playChord(chord, t, 0.55) + 0.05;
      }
      t += 0.4;
    } else {
      this.view.setPrompt('Listen…');
    }
    if (this.currentNoteMidis.length === 1) {
      t = this.audio.playNote(this.currentNoteMidis[0], t, 1.2, 0.95);
    } else {
      t = this.audio.playSequence(this.currentNoteMidis, t, 0.55, 0.1);
    }
    this.renderSlots();

    const msUntilAnswerable = (t - this.audio.now) * 1000 + 300;
    this.answerHandle = this.clock.schedule(msUntilAnswerable, () => {
      this.view.setPrompt(this.seqLen() === 1 ? 'Which note was that?' : 'Which notes were those, in order?');
      this.view.enableAnswers();
      this.phase = 'answering';
      this.renderSlots();
    });
  }

  renderSlots(verdict = false) {
    this.view.renderSlots({
      seqLen: this.seqLen(),
      asked: [].concat(this.session.currentDegree ?? []),
      pending: this.pendingAnswer,
      mode: this.mode,
      verdict,
      answering: this.phase === 'answering',
    });
  }

  /** Record a tapped Degree. On sequence levels, accumulate until full. */
  answer(degree) {
    if (this.phase !== 'answering') return;

    if (this.seqLen() > 1) {
      this.pendingAnswer.push(degree);
      this.audio.playNote(degreeToMidi(this.tonic, degree, 0, this.mode), this.audio.now + 0.02, 0.4, 0.6);
      this.renderSlots();
      if (this.pendingAnswer.length < this.seqLen()) return;
      this.finishQuestion(this.session.recordAnswer(this.pendingAnswer), null);
      return;
    }

    this.finishQuestion(this.session.recordAnswer(degree), degree);
  }

  /** Undo the last tap on a sequence level. */
  backspace() {
    if (this.phase !== 'answering' || !this.pendingAnswer.length) return;
    this.pendingAnswer.pop();
    this.renderSlots();
  }

  finishQuestion(correct, tapped) {
    this.phase = 'resolving';
    this.view.setButtonsEnabled(false);

    const asked = this.session.currentDegree;
    this.bar = applyAnswer(this.bar, correct);
    this.view.renderBar(this.bar.value, this.bar.size);
    this.lastAnswerCorrect = correct; // for onPersist hooks (e.g. Warmup) to read
    this.onPersist();

    if (correct) { this.streak += 1; this.missStreak = 0; }
    else { this.streak = 0; this.missStreak += 1; }
    const names = [].concat(asked).map((d) => degreeInfo(d, this.mode).name).join(' → ');
    this.view.showResult({
      correct, tapped, asked, names,
      streak: this.streak, missStreak: this.missStreak,
      seqLen: this.seqLen(), pending: this.pendingAnswer, mode: this.mode,
    });

    // Resolution: the (last) note walks home to Do (the teaching device, ADR-0001)
    this.view.setReplaysEnabled(false);
    const lastMidi = this.currentNoteMidis[this.currentNoteMidis.length - 1];
    const path = resolutionPath(this.tonic, lastMidi, this.mode);
    const end = this.audio.playSequence(path, this.audio.now + 0.45);
    this.view.showResolution(path, 0.45, { tonic: this.tonic, mode: this.mode });
    // A flavour message (streak ≥2 or 2+ misses) is longer to read, so linger.
    const hasFlavour = this.streak >= 2 || this.missStreak >= 2;
    const msUntilNext = (end - this.audio.now) * 1000 + 700 + (hasFlavour ? 1600 : 0);
    this.resolveHandle = this.clock.schedule(msUntilNext, () => this.advance());
  }

  /** Tap during the Resolution to skip straight to the next Question. */
  skip() {
    if (this.phase !== 'resolving') return;
    this.clock.cancel(this.resolveHandle);
    this.audio.stopAll();
    this.view.clearHighlights();
    this.advance();
  }

  /** Abandon the round (leaving the quiz): cancel pending timers, silence audio. */
  stop() {
    this.clock.cancel(this.answerHandle);
    this.clock.cancel(this.resolveHandle);
    this.audio.stopAll();
    this.phase = 'idle';
  }

  advance() {
    this.resolveHandle = null;
    if (isFull(this.bar)) {
      this.phase = 'done';
      this.onCleared();
    } else {
      this.ask();
    }
  }

  replayNote() {
    if (!this.currentNoteMidis.length || this.phase === 'resolving') return;
    if (this.currentNoteMidis.length === 1) {
      this.audio.playNote(this.currentNoteMidis[0], this.audio.now + 0.05, 1.2, 0.95);
    } else {
      this.audio.playSequence(this.currentNoteMidis, this.audio.now + 0.05, 0.55, 0.1);
    }
  }

  replayCadence() {
    if (this.phase === 'resolving') return;
    let t = this.audio.now + 0.05;
    for (const chord of cadenceChords(this.tonic, this.mode)) {
      t = this.audio.playChord(chord, t, 0.55) + 0.05;
    }
  }
}
