# Daily is a shelf of games, and Daily Sprint is the second

ADR-0003 built the Daily shell game-agnostic and registered `sprint` and `climb` as
stubs "to trial later and **pick the keeper**". This supersedes that last clause:
Daily is a **shelf** — several games live side by side, each with its own day lock,
sharing one streak. **Daily Sprint** is the second game to ship. `climb` stays a stub.

_Why the change:_ a returning player needs more than one reason to open the app, and
one puzzle a day is a thin hook. Two short games is more daily surface than one longer
one, and the shell was already built to carry them. "Pick the keeper" assumed the games
compete for one slot; they don't — they cost one route each.

## Daily Sprint

Sixteen single-note Degree Questions: cadence, a note, tap the Degree. Rounds 1-4 draw
from the Easy pool, 5-8 Medium, 9-12 Hard, 13-16 Master, with the cadence re-anchoring at
each Tier change and the palette visibly growing. Seeded from the date, so everyone gets
the same sixteen. Roughly 90 seconds.

Sprint reuses the Tier pools rather than inventing a second difficulty vocabulary. This
generalises **Tier** from "a property of the day" to "a Degree-pool width": Melody plays
one per day, Sprint climbs all four. Four rows of four also makes the shared grid a
square, which is what the format wants to be.

- **Master opens the whole keyboard — a Sprint-only departure from "Daily is
  diatonic".** ADR-0003 dropped chromatics from Daily because "half-tones are an
  advanced-learner skill that deters the newcomers Daily is meant to pull in".
  Sprint's fourth Tier adds the five chromatic colours (Ra, Me, Fi, Le, Te) anyway.
  The rule isn't wrong; its *reason* doesn't reach here. In Melody the Tier **is
  the day** — a chromatic Tier makes a newcomer's one attempt unwinnable and the
  shared grid a wall of grey. In Sprint the pool widens **per round**: a newcomer
  answers twelve diatonic Questions and has a shareable grid before Master arrives,
  and flunking all four costs four cells, not the day. A bonus row you're expected
  to miss is a different object from a difficulty setting you're stuck with.

  The trade-off we accept: 12/16 becomes the realistic ceiling for most players, so
  the score reads lower than the old 12/12 did for the same ear. Worth it — the old
  ceiling was reachable, and a run you can max out has nothing left to chase. If
  Master turns out to read as failure rather than a stretch, the fix is the copy
  ("it's a bonus row, not a wall") before the pool.

- **A pitch-compare game was rejected.** The idea that prompted this work was "which
  of these sounds was highest". It contradicts ADR-0001: pitch height is heard without
  tonal context, and *"pitch content of questions is meaningless without the preceding
  cadence"*. It also has no usable difficulty curve — adults resolve two-semitone gaps
  cold, so ramping means shrinking toward cents, which tests audio equipment and not
  the ear we train. Sprint keeps the interaction shape that made the idea appealing
  (listen → one tap → short ramping run → shareable grid) and drops the acontextual
  skill.

- **A stopwatch, never a countdown.** ADR-0003 recorded that a "time element" was
  dropped because *"a countdown reintroduces a fail-clock that clashes with the
  ethos"* — while `registry.js` simultaneously described Sprint as "raced for
  time/accuracy". Both cannot stand. The resolution: ADR-0003 banned a fail-*clock*,
  not a *score*. Sprint's stopwatch measures and reports; it never expires. A player
  can sit on a Question for a minute and still answer it. Time is a flex, exactly as
  replays already are in Melody.

- **Teaching is deferred to an end-of-run Reveal, and offered rather than forced.**
  Resolution after every answer is the methodology's core device (ADR-0001), but twelve
  resolutions cost ~24 seconds and a Sprint that stops to teach twelve times is not a
  Sprint. Nor can Sprint teach nothing — that would make it a test, indefensible
  against ADR-0001. So misses are banked and Revealed together at the end, each note
  replayed with its Resolution and its Degree named. This mirrors Melody, which already
  defers teaching to a single Reveal beat.

  The Reveal does **not** play automatically: the run ends on a choice — hear what you
  missed, or go straight to the grid — and the offer stays on the result card
  afterwards. (The player's answers are stored alongside the day's result so the offer
  survives a reload; the Questions themselves regenerate from the seed.) Two trade-offs
  we are taking knowingly:

  1. **Teaching lands later than the error**, where it binds less tightly to the moment
     of being wrong. The alternative — resolving on each miss — punishes the clock
     exactly when the player is already behind.
  2. **A player can now skip the lesson entirely.** That genuinely weakens "Sprint
     teaches" as the answer to ADR-0001, and it is a real departure from Melody, where
     a soft fail Reveals whether you like it or not. We take it because a lesson played
     at someone reaching for their score is a lesson nobody hears — twelve seconds of
     piano between the player and the thing they came for. Offered teaching that gets
     chosen beats forced teaching that gets sat through. If the Reveal turns out to go
     untaken, the honest fix is to make it *worth* taking, not to make it mandatory.

- **The day lock is per game; the streak is shared and outcome-blind.** Each game locks
  independently, so both are playable daily and choosing one never burns the other. But
  there is **one** Daily streak, and it survives if the player finishes *either* game —
  regardless of how they did. Two consequences worth naming:

  1. **A Melody soft fail no longer breaks the streak.** That is a change to the
     shipped game. It pulls Daily back toward the no-fail ethos ADR-0003 carved an
     exception out of: the share still reads its honest `X/3`, but the streak now
     measures *showing up*, not *winning*. Showing up is the habit we actually want.
  2. **The second game is a safety net, not a second chore.** A shared streak means a
     bad Melody day can be rescued by a Sprint. A per-game streak would have made each
     new game a new obligation to maintain, and a third game would dilute both.

  The cost: the streak is a weaker claim than it was — "50 days" no longer means "50
  puzzles solved". We think a streak people keep beats a streak people respect.

- **Version 2 wipes saved state.** Nesting `state.daily` per game needs a shape change,
  and `store.js` discards state on version mismatch rather than migrating. Confirmed
  acceptable: there are no players beyond the author. This leaves the debt intact — the
  **next** bump has real users behind it and must migrate rather than wipe.

Implementation follows ADR-0003's split: a pure brain (`js/daily/sprint.js`) behind the
registry, with the impure DOM/Piano adapter split into a shared shell (`ui-shell.js`)
plus one adapter per game. Two concrete adapters, no abstraction over them — a third
game earns that.
