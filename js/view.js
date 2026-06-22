// View — the DOM adapter for the Question round. The Round emits intents to
// this interface; the only DOM the lifecycle touches lives here. Tests drive
// the Round with a recorder standing in for this adapter (the second adapter
// that justifies the seam).
//
// createGameView(el) closes over the element map and the resolution-walk
// highlight timers. It also exposes buildAnswerButtons() and showWalk() for
// the meet / notes-reference screens, which reuse the walk animation.

import { degreeInfo, midiToDegree } from './theory.js';
import { HAND_SIGNS } from './art.js';
import { streakMessage, missMessage } from './messages.js';

export function createGameView(el) {
  let highlightTimeouts = [];

  function setMascot(state) {
    el.quizMascot.className = `mascot mascot-sm${state ? ` ${state}` : ''}`;
  }

  function setButtonsEnabled(enabled) {
    for (const b of el.degrees.querySelectorAll('button')) b.disabled = !enabled;
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
    const spans = midis.map((midi) => {
      const key = midiToDegree(walkTonic, midi, walkMode);
      const span = document.createElement('span');
      span.className = 'walk-note';
      span.textContent = key === null ? '·' : degreeInfo(key, walkMode).name;
      return span;
    });
    walkEl.replaceChildren(...spans);

    midis.forEach((midi, i) => {
      const key = midiToDegree(walkTonic, midi, walkMode);
      const btn = withButtons && key !== null
        ? el.degrees.querySelector(`[data-degree="${key}"]`)
        : null;
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

    // Build the answer buttons for a Level's Degree pool; each tap → onAnswer(d).
    buildAnswerButtons(level, mode, onAnswer) {
      el.degrees.replaceChildren(
        ...level.degrees.map((d) => {
          const info = degreeInfo(d, mode);
          const btn = document.createElement('button');
          btn.className = 'degree-btn';
          btn.dataset.degree = String(d);
          const sign = HAND_SIGNS[d] ? `<span class="sign">${HAND_SIGNS[d]}</span>` : '';
          btn.innerHTML = `${sign}<span>${info.name}</span><span class="num">${info.label}</span>`;
          btn.addEventListener('click', (e) => {
            e.stopPropagation(); // don't let the answering tap skip its own resolution
            onAnswer(d);
          });
          return btn;
        }),
      );
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
