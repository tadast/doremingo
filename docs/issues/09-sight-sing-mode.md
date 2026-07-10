# Slice 9 — Sight-Sing Mode (notation)

**Type:** AFK · **Blocked by:** Slice 8
**PRD:** `docs/prd/2026-07-growth-differentiation-roadmap.md` (stories 21, 23, 24, 29)

## What to build

A new Mode that shows a Degree on the staff and asks the player to identify it,
bundling sight-reading with ear training. Render the staff via the SVG/art layer using
`degreeToStaffPosition` (Slice 8). Reuse the existing Degree vocabulary, Cadence, and
feedback of the ear modes; progression mirrors the Learn Level shape (small Degree pool
that expands). Reachable as a Mode from the home chooser.

## Acceptance criteria

- [ ] Sight-Sing selectable as a Mode from the home chooser
- [ ] Staff renders the target Degree via the Slice 8 function
- [ ] Player identifies the Degree; shares feedback vocabulary with ear modes
- [ ] Progression starts with a small Degree pool and expands, Level-like
- [ ] Movable-do framing throughout (no absolute note-name training)

## Blocked by

- Slice 8 — Pure degree-to-staff-position
