# Slice 6 — Sing Mode wired (audio adapter + Mode)

**Type:** AFK · **Blocked by:** Slice 5
**PRD:** `docs/prd/2026-07-growth-differentiation-roadmap.md` (stories 13, 17, 18, 19, 29)

## What to build

Wire a playable Sing Mode. A thin, minimal Web Audio adapter over the AnalyserNode
yields a live frequency estimate; feed it to `matchSungPitch` (Slice 5) to judge the
sung Degree with immediate feedback. Register Sing Mode as a Mode reachable from the
home chooser. No-fail semantics: a miss lets the player retry, never ends in a loss.
Graceful degradation: no mic or denied permission falls back to palette tap input.

## Acceptance criteria

- [ ] Sing Mode selectable as a Mode from the home chooser
- [ ] Sung pitch produces immediate right/near feedback via the Slice 5 matcher
- [ ] Missing retries; never a loss (no-fail consistent with the rest of the game)
- [ ] Mic denied / unavailable falls back to palette tap input
- [ ] Audio adapter kept thin (untested shell); matcher stays the tested unit

## Blocked by

- Slice 5 — Pure sung-pitch matcher
