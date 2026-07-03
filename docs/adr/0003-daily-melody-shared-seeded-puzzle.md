# Daily is a date-seeded shared puzzle, and Daily Melody may soft-fail

Daily Mode is a single puzzle generated from the calendar date — the **same for
every player that day** (the daily shared-puzzle model popularised by word games),
built so a player can share a spoiler-free result and pull friends in. The first
Daily game is **Daily Melody**: echo a hidden melody by Degree, per-position feedback, with
**one Guess per note** (a 5-note tune gives 5 Guesses). Several choices here are
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

- **Difficulty ramps by weekday; guesses derive from length.** Monday is easy
  (5 notes, diatonic subset), Sunday hard (7 notes — the cap — chromatic Fi/Te,
  octave spread). You get **fewer Guesses than notes** — length minus 2, floor 3 —
  so even a long tune stays a real challenge rather than a transcription exercise.
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
