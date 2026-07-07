// Quiz engine — the shared Question lifecycle host.
//
// Learn and Warmup are the same game loop (cadence → note → answer →
// resolution)* driven to a cleared Bar; they differ only in the Stage they hand
// to runStage (see CONTEXT.md: Stage). This module owns the active Round, wires
// it to the quiz screen, and exposes the round controls the keyboard and replay
// buttons drive — so neither Mode controller has to know about Round at all.

import { Round } from './round.js';

export function createQuizMode({ piano, view, clock, el, showScreen }) {
  let round = null;

  // Run one Stage to a cleared Bar. The Stage carries its own Session and Bar
  // (the Bar's own drain rule decides whether a miss drains or resets), its
  // key/mode, and the onPersist/onCleared hooks — both handed the live Round.
  function runStage(stage) {
    const { level, session, bar, tonic, mode, title, showBackspace, barView, onPersist, onCleared } = stage;
    el.levelTitle.textContent = title;
    el.backspaceBtn.hidden = !showBackspace;
    view.buildAnswerButtons(level, mode, (d) => round?.answer(d));
    round = new Round({
      level, session, bar, tonic, mode,
      audio: piano, view, clock,
      onPersist: () => onPersist?.(round),
      onCleared: () => onCleared?.(round),
    });
    view.renderBar(barView.value, barView.size);
    showScreen(el.quizScreen);
    round.start();
    return round;
  }

  // Tear down the active round (leaving the quiz screen): cancel its timers,
  // silence audio, clear highlights.
  function stop() {
    round?.stop();
    round = null;
    piano.stopAll?.();
    view.clearHighlights();
  }

  return {
    runStage,
    stop,
    get round() { return round; },
    get bar() { return round?.bar; },
    get phase() { return round?.phase; },
    get answering() { return round?.answering ?? false; },
    answer: (d) => round?.answer(d),
    replayNote: () => round?.replayNote(),
    replayCadence: () => round?.replayCadence(),
    backspace: () => round?.backspace(),
    skip: () => round?.skip(),
  };
}
