# Warmup is a transient, pentatonic-capped, streak-driven ramp

The Warmup Mode caps at the **major pentatonic** (Do-Re-Mi-Sol-La), advances on a
**streak of 3** correct answers, and **persists nothing** (it resets every entry,
with a hard 20-question cap as a safety net). Each of these was a deliberate choice
over a plausible alternative.

- **Pentatonic cap, not full diatonic.** The pentatonic omits Fa and Ti — the two
  semitone "tendency tones" that are hardest to hear. A warmup should re-tune the ear,
  not stress it; pentatonic-first is the textbook beginner set. Learn Mode is where the
  hard notes belong.
- **Streak of 3, not rolling accuracy (e.g. 4-of-5).** Rolling-window accuracy is more
  robust to lucky guessing and is the right tool for an open-ended *practice* mode. But
  Warmup is short and low-stakes (calibration, not assessment), where a streak is simpler,
  more legible to the player, and the lucky-guess risk over ~9–20 questions is negligible.
- **Transient, never persisted.** Starting easy *every* session is the whole point of a
  warmup; persisting a climbed level would turn it into progress tracking and defeat the
  intent. So Warmup writes nothing to the `Store`.

This also keeps the original ask honest: the raw idea (endless climb, never reset) was
adaptive *practice* mislabelled "warmup". If we later want that endless ladder, it should
be a separate Mode — not a tweak to this one.

Implementation: Warmup is a **playlist of Stages** (see CONTEXT.md: Stage) over the shared
quiz engine (`js/quiz-mode.js`). Each Stage is its own `Round` (`js/round.js`) over the
current Degree pool, with a Bar whose drain rule is **reset-on-miss** (`createBar(…, { drain:
Infinity })`) — so the Bar *is* the streak, and a 3-in-a-row clears the Stage. The pure brain
in `js/warmup.js` is now just the playlist cursor (`pool`, `advance()`) plus the question cap
(`countQuestion()`); clearing the top Stage finishes the run. The streak no longer lives in
the brain, and the old synthetic mutable-Level trick (growing `level.degrees` in place and
force-clearing the Bar) is gone — promotion is simply running the next Stage.
