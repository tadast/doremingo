# Slice 8 — Pure degree-to-staff-position

**Type:** AFK · **Blocked by:** None — can start immediately
**PRD:** `docs/prd/2026-07-growth-differentiation-roadmap.md` (story 22)

## What to build

Implement the pure function `degreeToStaffPosition(degree, clef, key) → staff
coordinates`, testable independent of any rendering. Maps a movable-do Degree, in a
given Key and clef, to its position on the staff. Foundation for the Sight-Sing Mode
render in Slice 9. Movable-do framing only — no drift into absolute note-name training.

## Acceptance criteria

- [ ] `degreeToStaffPosition(degree, clef, key)` returns correct coordinates
- [ ] Correct across all Degrees, multiple clefs, and multiple Keys
- [ ] Movable-do framing preserved (consistent with [ADR-0001])
- [ ] Unit tests across Degree, clef, and Key variation

## Blocked by

None — can start immediately.
