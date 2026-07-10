Roadmap PRD grounded in `docs/research/2026-07-music-learning-apps.md`. Sequenced phases, each independently shippable. Respects [ADR-0001] (functional ear training — movable-do scale-degree recognition, never intervals or absolute pitch), [ADR-0002] (Warmup), [ADR-0003] (Daily seeded puzzle). Uses the project glossary throughout.

## Problem Statement

DoReMingo trains the ear well but almost nobody knows it exists, and the one thing that could make it spread — players sharing a result — is under-leveraged. Meanwhile the ear-training market is fragmented with no consumer default (Sonofield, Chet, ToneGym, EarMaster, Perfect Ear each own a slice), and the audience most poorly served — singers who want relative-pitch help and people intimidated by theory — maps almost exactly onto DoReMingo's Kodály/movable-do, no-fail identity. Players currently can only tap a Degree from the palette; they cannot sing, cannot read from the staff, and when they miss on a Daily Melody Reveal they get no plain-language reason why. The product is not yet distinctive enough to pull those niches in, nor viral enough to reach them.

## Solution

A five-phase roadmap that first tightens the growth loop, then deepens the teaching, then builds the moat:

1. **Reddit-ready share flywheel** — a spoiler-free emoji grid + local streaks so a Daily Melody result is worth posting to r/eartraining and friends.
2. **Reveal explainers** — one plain sentence on every Daily Melody Reveal explaining why the tune's Degrees resolve, turning the no-fail teaching beat into a retention hook and answering the "is theory hard?" anxiety.
3. **Sing Mode** — sing the Degree back instead of tapping it, matched relative to the established Key, with Curwen hand-sign visuals. The differentiator no competitor combines with movable-do + a Daily puzzle. Opens r/choral, r/singing, r/perfectpitch.
4. **Notation bundle (Sight-Sing)** — read a Degree off the staff and answer, bundling ear-training and sight-reading that the market ships separately.
5. **Teacher assign (backburner, backend-dependent)** — a teacher shares a practice link and sees student progress. Explicitly future work; requires a backend the app does not have today.

No leaderboards, in any phase — they require login and nobody will log in.

## User Stories

1. As a player who just finished the Daily Melody, I want a spoiler-free emoji grid of my Guesses, so that I can paste my result without revealing the tune.
2. As a player, I want the share text to include the puzzle date and my Guess count, so that friends know which day I played.
3. As a player, I want a running streak of consecutive days played, so that I have a reason to come back tomorrow.
4. As a player, I want my streak shown on the Daily result screen, so that I see my momentum at the moment I might share.
5. As a player who misses a day, I want the streak rule to be clear and forgiving in spirit, so that a single miss does not feel punishing.
6. As a player, I want a one-tap share on both web and iOS, so that posting is frictionless.
7. As a Reddit lurker in r/eartraining, I want to see a shared grid that is intriguing but not spammy, so that I click through instead of scrolling past.
8. As a returning player, I want an optional daily reminder, so that I keep my streak (builds on existing growth/notifications).
9. As a player who soft-fails a Daily Melody and triggers a Reveal, I want a plain-language sentence on why each Degree resolves the way it does, so that I learn from the miss instead of just seeing the answer.
10. As a theory-intimidated beginner, I want the explainer to avoid jargon, so that I do not feel stupid.
11. As a player, I want the explainer to use movable-do language (Do, Re, Mi… Sol pulls home to Do), so that it reinforces functional hearing rather than note names.
12. As a player, I want the explainer to reference the Cadence-established Key, so that the "why" is grounded in the tonal context I just heard.
13. As a singer, I want to sing a Degree back instead of tapping the palette, so that I practice producing pitches, not just recognising them.
14. As a singer, I want my sung pitch matched relative to the current Key, so that I am judged on the right Degree, not on absolute pitch (per [ADR-0001]).
15. As a singer, I want to sing in whatever octave is comfortable, so that my voice range does not lock me out.
16. As a singer, I want to see the Curwen hand sign for the Degree, so that I connect the gesture, the syllable, and the sound.
17. As a singer, I want immediate feedback on whether I hit the Degree, so that I can self-correct.
18. As a singer, I want a no-fail experience consistent with the rest of the game, so that a flat note is a nudge, not a loss.
19. As a player without a microphone or who denies mic access, I want Sing Mode to degrade gracefully back to tap input, so that the app still works.
20. As a choir member, I want a mode built around solfège and relative pitch, so that DoReMingo fits how I already rehearse.
21. As a player, I want a mode that shows a Degree on the staff and asks me to identify it, so that I practice sight-reading alongside ear training.
22. As a player, I want notation to use movable-do framing, so that it stays consistent with the rest of the app and does not drift into absolute note-name training.
23. As a learner, I want the staff mode to start simple (a small Degree pool) and expand, so that it mirrors the Learn Level progression.
24. As a player, I want notation and ear modes to share the same Degree vocabulary and feedback, so that switching between them feels seamless.
25. As a teacher (future), I want to share a practice link with my class, so that students can play a specific configuration without an account.
26. As a teacher (future), I want to see which students practised and how they did, so that I can guide lessons.
27. As a student (future), I want to open a teacher's link with no login, so that starting is frictionless.
28. As the product owner, I want teacher features gated behind a backend decision, so that they do not block the launch-critical phases.
29. As a player, I want every new mode reachable from the home chooser as a Mode, so that discovery is consistent with existing navigation.
30. As a maintainer, I want each phase independently shippable, so that value lands without waiting on the whole roadmap.

## Implementation Decisions

**Cross-cutting**
- The app stays a vanilla ES-module static site with no build step; phases 1–4 introduce no backend. Phase 5 is the only backend-dependent work and is explicitly deferred.
- Every new game type is registered as a Mode surfaced from the home chooser, consistent with Learn / Warmup / Daily.
- No leaderboards are built in any phase (login-dependent, out of scope by decision).
- All new behavior respects [ADR-0001]: relative, movable-do, scale-degree recognition; no interval-naming or absolute-pitch training.

**Phase 1 — Share flywheel**
- Extend the existing Daily share module to produce a spoiler-free emoji grid encoding per-position Guess feedback (right Degree right spot / right Degree wrong spot / absent), plus puzzle date and Guess count. Grid tuned to read well when pasted into Reddit.
- Streaks live in the Daily stats module and persist via existing durable storage; streak surfaces on the Daily result screen. Streak logic: consecutive local days with a completed Daily; a single missed day breaks the streak (kept simple, no freeze mechanic in v1).
- Share entry point is one-tap on web (Clipboard/Web Share) and iOS (native share sheet via Capacitor); reuse existing growth/notifications for the return reminder.

**Phase 2 — Reveal explainers**
- Add a pure explainer generator to the theory module: given a Degree and the established Key, return one jargon-free, movable-do sentence about its resolution tendency. The Daily Melody Reveal renders one explainer beat per notable Degree.
- Explainer copy lives with existing content/messages, not hardcoded in UI, so tone can be tuned.

**Phase 3 — Sing Mode**
- New Mode. Split cleanly into a pure matcher and a thin audio adapter:
  - Pure: `matchSungPitch(frequency, key) → Degree` (with octave-folding and a tolerance band), fully testable, no Web Audio.
  - Impure shell: a thin adapter over the Web Audio AnalyserNode that yields a frequency estimate; kept minimal and untested.
- Curwen hand-sign SVGs sourced from the existing art assets (see the project's svg-asset pipeline); Sing Mode shows the sign for the target/answered Degree.
- No-fail semantics consistent with the rest of the game; missing lets you retry, never ends in a loss.
- Graceful degradation: no mic or denied permission falls back to palette tap input.

**Phase 4 — Notation bundle**
- New Mode. Pure `degreeToStaffPosition(degree, clef, key) → staff coordinates`, testable independent of rendering; staff drawn via the SVG/art layer.
- Reuses the Degree vocabulary, Cadence, and feedback of the ear modes; progression mirrors the Learn Level shape (small Degree pool expanding).

**Phase 5 — Teacher assign (deferred)**
- Requires a backend to persist student progress; not designed in detail here. The only client-side piece that could land early without a server is pure `encode/decodeAssignment(link)` for a shareable practice configuration and a no-login student entry view — but even this is backburnered until the backend direction is decided.
- Flag any App Store data-collection / privacy-policy implications when this phase is picked up (currently "no data collected" for v1).

## Testing Decisions

- Good tests assert external behavior of a module, not implementation details, following the existing pattern: import the module directly, inject a seeded RNG where randomness matters, assert on returned values. Prior art: `test/daily-stats.test.mjs`, `test/daily-melody.test.mjs`, `test/daily-feedback.test.mjs`, `test/theory.test.mjs`, `test/quiz.test.mjs`.
- Phase 1: test the share-grid/text builder (given a Guess history + streak → exact share string) and the streak calculator (sequences of play/skip days → streak count) as pure functions, mirroring `daily-stats`.
- Phase 2: test the explainer generator (Degree + Key → expected sentence family) in the theory test file; assert it never emits interval-name or absolute-pitch language (guards [ADR-0001]).
- Phase 3: test `matchSungPitch` across octaves, in-band and out-of-band frequencies, and multiple Keys; the Web Audio adapter is a thin untested shell.
- Phase 4: test `degreeToStaffPosition` across Degrees, clefs, and Keys. The SVG render is not unit-tested.
- Phase 5: no tests until the backend direction is chosen.
- All tests run under `node --test 'test/**/*.test.mjs'`; DOM-heavy rendering stays out of the tested surface, consistent with current practice.

## Out of Scope

- Leaderboards of any kind (require login; explicitly dropped).
- Any backend for phases 1–4.
- A fully specified teacher/classroom product (phase 5 is a placeholder pending a backend decision).
- Absolute-pitch or interval-naming training (forbidden by [ADR-0001]).
- Account systems / user auth.
- Changes to the Learn Level progression or Warmup mechanics.
- Reddit posting automation or growth-hacking beyond making the share output good.

## Further Notes

- Grounding research and competitor map: `docs/research/2026-07-music-learning-apps.md`.
- Strategic bet is Phase 3 (Sing Mode) — the one capability no competitor combines with movable-do + a Daily puzzle, and the direct answer to the underserved singer/choir niche. Phases 1–2 are cheap growth/retention plumbing that should ship first to make a Reddit launch land. Phase 4 bundles the ear + sight-reading niche users repeatedly ask to have combined.
- Launch channel etiquette (give-more-than-you-take) matters more than any feature for the r/eartraining / r/musictheory launch; the share output should invite, not spam.
