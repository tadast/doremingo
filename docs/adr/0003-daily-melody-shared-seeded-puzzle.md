# Daily is a date-seeded shared puzzle, and Daily Melody may soft-fail

Daily Mode is a single puzzle generated from the calendar date — the **same for
every player that day** (the daily shared-puzzle model popularised by word games),
built so a player can share a spoiler-free result and pull friends in. The first
Daily game is **Daily Melody**: echo a hidden melody by Degree, per-position feedback, with
**fewer Guesses than notes** (a fixed 5-note tune gives 3 Guesses). Several choices here are
deliberate and not obvious.

- **Date-seeded determinism, local midnight.** "Same for everyone" needs a
  reproducible puzzle, so Daily cannot use `Math.random()`. The local `YYYY-MM-DD`
  string seeds a small PRNG (`js/daily/rng.js`: cyrb53 → mulberry32) that drives
  Key, Degrees and octaves. Rollover is the player's **local** midnight (as the
  popular daily word games do) — no server, no clock sync. The trade-off: friends in different time zones
  play the same *numbered* puzzle but not at the same instant. Acceptable for v1;
  a server-issued UTC puzzle is the escalation if it ever matters.

- **Soft fail — a scoped exception to "no fail state".** The game's spine (the Bar,
  Learn, Warmup) has **no fail state** by design: wrong answers teach the same way
  right ones do (see ADR-0001's ethos, ADR-0002). But the daily-puzzle genre's stakes — the dreaded
  X/N — are exactly what make a result worth sharing. We resolve the tension with a
  **soft fail**: once the Guesses run out the hidden tune is *Revealed and played in
  full* (a teaching beat, kin to Resolution) rather than ending in a bare loss. The
  share still reads `X/N`, but the player always leaves having *heard* the answer. The
  no-fail exception is **scoped to Daily only** — Learn and Warmup are untouched.

- **Difficulty is a single pool-width lever, labelled by Tier.** _Updated
  2026-07-10 (supersedes the original length-ramp below)._ Every day is a **fixed
  5 notes**; difficulty rides on **how wide the Degree pool is**, surfaced to the
  player as an **Easy / Medium / Hard Tier** badge shown before the first note.
  The pools are single-Degree steps with the hardest note added last: **Easy** =
  major pentatonic `[1,2,3,5,6]` (no tendency tones, = Warmup's ceiling),
  **Medium** = + Ti `[1,2,3,5,6,7]` (leading tone, the easier tendency tone),
  **Hard** = + Fa `[1,2,3,4,5,6,7]` (full diatonic). The Daily is **diatonic
  only** — chromatic colours (Fi/Te) were dropped from Daily (they live in Learn),
  because half-tones are an advanced-learner skill that deters the newcomers Daily
  is meant to pull in. The weekday→Tier map is a deliberate **sawtooth** (Mon E,
  Tue M, Wed E, Thu H, Fri M, Sat M, Sun H) so an easy day is never more than one
  day away. _Why the change:_ length-7 tunes with chromatics read as too hard on a
  shared, viral, newcomer-facing surface; capping the ceiling (not personalising
  it) keeps the one-shared-puzzle invariant intact.

  _Original (2026-07 launch, now superseded):_ difficulty ramped by weekday with
  melody length growing 5→7 and the pool widening to full diatonic + chromatic
  Fi/Te. Every day stays in the **home octave**: an octave spread was tried and
  dropped (2026-07-04) — to the untrained ear the target user has, the same Degree
  an octave apart sounds like a different note, turning the puzzle into a
  register-recognition test. You get **fewer Guesses than notes** — length minus 2,
  floor 3 (now a uniform 3, since length is fixed at 5) — so the tune stays a real
  challenge rather than a transcription exercise.
  Replaying isn't a scored resource: the tune **auto-replays
  after each Guess**, plus **one manual replay per turn** — enough to listen without
  turning memory into the puzzle. A Guess **commits on its last note** (no undo, no
  submit button), and a Degree shown **absent is locked out of the palette** — both
  reduce fiddling and make each Guess deliberate. There is no timer: an earlier
  "time element" idea was dropped
  because a countdown reintroduces a fail-clock that clashes with the ethos above —
  the score is Guesses used, replays a flex.

- **Independent of Learn progress.** Everyone gets the same puzzle, so Daily cannot
  gate on unlocked Degrees. Hard days may use Degrees a newcomer has not met in Learn;
  the palette always shows the day's full Degree set with hand-signs, and the Reveal
  teaches. Accepting "hard days are hard" is the price of a genuinely shared puzzle.

The shell is built **game-agnostic** so the daily concept can be trialled: routing,
seeding, the day lock, stats and share live in `js/daily/`, and a `registry.js` keys
games by `gameId`. Only `melody` is implemented; `sprint` (seeded time-trial) and
`climb` (seeded timed ladder) are registered stubs to trial later and pick the keeper.

Implementation mirrors the Round/Warmup split: pure, tested brains (`rng`, `schedule`,
`puzzle`, `feedback`, `melody`, `stats`, `share`) under `js/daily/`, with a single impure
adapter (`js/daily/ui.js`) owning the DOM and Piano. Stats persist in the `Store`'s new
`daily` block (durable on iOS via the existing Preferences-backed storage).
