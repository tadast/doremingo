// View — the DOM adapter for the Question round. The Round emits intents to
// this interface; the only DOM the lifecycle touches lives here. Tests drive
// the Round with a recorder standing in for this adapter (the second adapter
// that justifies the seam).
//
// createGameView(el) closes over the element map and the resolution-walk
// highlight timers. It also exposes buildAnswerButtons() and showWalk() for
// the meet / notes-reference screens, which reuse the walk animation.

import { degreeInfo, midiToDegree } from './theory.js';
import { buildPianoKeys } from './piano-keys.js';
import { streakMessage, missMessage } from './messages.js';

export function createGameView(el) {
  let highlightTimeouts = [];

  function setMascot(state) {
    el.quizMascot.className = `mascot mascot-sm${state ? ` ${state}` : ''}`;
  }

  function setButtonsEnabled(enabled) {
    // Keys outside the level's pool (.off) stay disabled through every phase.
    for (const b of el.degrees.querySelectorAll('button')) {
      b.disabled = !enabled || b.classList.contains('off');
    }
  }

  function setReplaysEnabled(enabled) {
    el.replayNoteBtn.disabled = !enabled;
    el.replayCadenceBtn.disabled = !enabled;
  }

  function clearMarks() {
    for (const b of el.degrees.querySelectorAll('button')) {
      b.classList.remove('correct', 'wrong', 'playing');
    }
  }

  function clearHighlights() {
    for (const id of highlightTimeouts) clearTimeout(id);
    highlightTimeouts = [];
    for (const b of el.degrees.querySelectorAll('.playing')) b.classList.remove('playing');
    el.walk.replaceChildren();
    el.meetWalk.replaceChildren();
  }

  /**
   * Show a resolution walk as a row of note names, lighting each name (and
   * its degree button, when buttons are in play) while that note sounds.
   * Matches a playSequence(midis, startDelay, noteDuration, gap) schedule.
   */
  function showWalk(midis, startDelaySec, {
    walkEl = el.walk,
    withButtons = true,
    walkTonic,
    walkMode,
    noteDuration = 0.45,
    gap = 0.05,
  } = {}) {
    const stepMs = (noteDuration + gap) * 1000;
    // The playable keys live in one octave, plus a disabled Do′ key one octave
    // up so an upward walk has somewhere to land. Other off-octave notes are
    // marked (a prime per octave above, a comma per octave below) with no glow.
    const octaveOf = (midi) => Math.floor((midi - walkTonic) / 12);
    const keyFor = (key, oct) => {
      if (key === null) return null;
      if (oct === 0) return el.degrees.querySelector(`[data-degree="${key}"]:not([data-octave])`);
      if (oct === 1 && key === 1) return el.degrees.querySelector('[data-degree="1"][data-octave="1"]');
      return null;
    };
    const spans = midis.map((midi) => {
      const key = midiToDegree(walkTonic, midi, walkMode);
      const oct = octaveOf(midi);
      const span = document.createElement('span');
      span.className = oct === 0 ? 'walk-note' : 'walk-note walk-note-octave';
      const mark = oct > 0 ? '′'.repeat(oct) : ','.repeat(-oct);
      span.textContent = key === null ? '·' : degreeInfo(key, walkMode).name + mark;
      return span;
    });
    walkEl.replaceChildren(...spans);

    midis.forEach((midi, i) => {
      const key = midiToDegree(walkTonic, midi, walkMode);
      const btn = withButtons ? keyFor(key, octaveOf(midi)) : null;
      highlightTimeouts.push(setTimeout(() => {
        spans[i].classList.add('lit');
        btn?.classList.add('playing');
        highlightTimeouts.push(setTimeout(() => {
          spans[i].classList.remove('lit');
          btn?.classList.remove('playing');
        }, noteDuration * 1000));
      }, startDelaySec * 1000 + i * stepMs));
    });
  }

  return {
    setMascot,
    clearHighlights,
    showWalk,

    // Build the answer keyboard for a Level's Degree pool; each tap → onAnswer(d).
    buildAnswerButtons(level, mode, onAnswer) {
      el.degrees.classList.add('piano');
      el.degrees.replaceChildren(...buildPianoKeys(level.degrees, mode, onAnswer));
    },

    renderBar(value, size) {
      el.barFill.style.width = `${(value / size) * 100}%`;
    },
    beginQuestion() {
      clearMarks();
      clearHighlights();
      setButtonsEnabled(false);
      setReplaysEnabled(false);
      el.feedback.textContent = '';
      el.feedback.className = 'feedback';
      setMascot(null);
    },
    setPrompt(text) {
      el.prompt.textContent = text;
    },
    enableAnswers() {
      setButtonsEnabled(true);
      setReplaysEnabled(true);
    },
    setButtonsEnabled,
    setReplaysEnabled,
    renderSlots({ seqLen, asked, pending, mode: m, verdict, answering }) {
      if (seqLen === 1) {
        el.slots.hidden = true;
        return;
      }
      el.slots.hidden = false;
      el.slots.replaceChildren(
        ...Array.from({ length: seqLen }, (_, i) => {
          const slot = document.createElement('span');
          slot.className = 'slot';
          const picked = pending[i];
          if (picked !== undefined) {
            slot.classList.add('filled');
            slot.textContent = degreeInfo(picked, m).name;
          }
          if (verdict) {
            slot.classList.remove('filled');
            slot.classList.add(picked === asked[i] ? 'good' : 'bad');
            if (picked !== asked[i]) {
              slot.textContent = `${degreeInfo(picked, m).name}→${degreeInfo(asked[i], m).name}`;
            }
          }
          return slot;
        }),
      );
      el.backspaceBtn.disabled = !answering || pending.length === 0 || !!verdict;
    },
    showResult({ correct, tapped, asked, names, streak, missStreak, seqLen, pending, mode: m }) {
      if (correct) {
        if (tapped != null) el.degrees.querySelector(`[data-degree="${tapped}"]`)?.classList.add('correct');
        const cheer = streak >= 7 ? '🔥🦩🔥' : streak >= 5 ? '🔥🔥' : streak >= 3 ? '🔥' : '🎉';
        const flavour = streakMessage(streak);
        const streakNote = flavour
          ? ` <span class="streak-pop">${cheer} ${flavour}</span>`
          : ` ${cheer}`;
        el.feedback.innerHTML = `Yes! That was ${names}${streakNote}`;
        el.feedback.className = 'feedback good';
        setMascot(streak >= 5 ? 'party' : 'good');
      } else {
        if (tapped != null) el.degrees.querySelector(`[data-degree="${tapped}"]`)?.classList.add('wrong');
        if (seqLen === 1) {
          el.degrees.querySelector(`[data-degree="${asked}"]`)?.classList.add('correct');
        }
        const cheer = missMessage(missStreak);
        el.feedback.textContent = cheer
          ? `It was ${names}. ${cheer}`
          : `It was ${names} — hear it walk home`;
        el.feedback.className = 'feedback bad';
        setMascot('bad');
      }
      if (seqLen > 1) {
        this.renderSlots({ seqLen, asked: [].concat(asked), pending, mode: m, verdict: true, answering: false });
      }
    },
    showResolution(path, startDelaySec, { tonic, mode }) {
      showWalk(path, startDelaySec, { walkTonic: tonic, walkMode: mode });
    },
  };
}
