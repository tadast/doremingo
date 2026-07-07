# 10 — Input and playback polish

Status: done

## Parent

`.scratch/doremingo/PRD.md`

## What to build

Quality-of-life controls across desktop and mobile: keyboard shortcuts (1–7 answer, space replays the note, c replays the Cadence), on-screen replay buttons for note and Cadence, tap-to-skip the Resolution, loading indicator while piano samples fetch (with retry on failure), and a portrait-layout pass ensuring big tap targets and no hover dependence.

## Acceptance criteria

- [ ] Keyboard: 1–7 answers, space replays note, c replays Cadence; shortcuts inert while typing is impossible anyway but never conflict with browser defaults
- [ ] Replay buttons work mid-Question without breaking grading
- [ ] Tapping during Resolution skips it immediately
- [ ] Slow-network load shows progress state; failed sample fetch offers retry instead of silent broken audio
- [ ] All interactive elements ≥44px touch targets in portrait; no hover-only affordances

## Blocked by

- 03-bar-level-clear-persistence
