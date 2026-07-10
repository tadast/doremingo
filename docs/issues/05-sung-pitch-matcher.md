# Slice 5 — Pure sung-pitch matcher

**Type:** AFK · **Blocked by:** Slice 4
**PRD:** `docs/prd/2026-07-growth-differentiation-roadmap.md` (stories 14, 15)

## What to build

Implement the pure matcher `matchSungPitch(frequency, key) → Degree`, using the
tolerance band and octave-folding rule decided in Slice 4. Fully testable, no Web
Audio — takes a frequency estimate and the current Key, returns the matched Degree (or
none if outside the band). Judged relative to Key, never absolute pitch.

## Acceptance criteria

- [ ] `matchSungPitch(frequency, key)` returns the correct Degree for in-band pitches
- [ ] Octave-folding: same Degree matched across multiple octaves
- [ ] Out-of-band frequencies return no match
- [ ] Correct behavior across multiple Keys (movable-do, relative, per [ADR-0001])
- [ ] Unit tests covering octaves, in/out-of-band, and Key variation

## Blocked by

- Slice 4 — Sing Mode design spike
