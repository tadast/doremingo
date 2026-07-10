# Slice 3 — Reveal explainer (movable-do "why it resolves")

**Type:** AFK · **Blocked by:** None — can start immediately
**PRD:** `docs/prd/2026-07-growth-differentiation-roadmap.md` (stories 9, 10, 11, 12)

## What to build

When a player soft-fails a Daily Melody and the tune is Revealed, add one plain,
jargon-free sentence explaining why a notable Degree resolves the way it does —
movable-do framing ("Sol pulls home to Do"), grounded in the Cadence-established Key.
Turns the Reveal into a teaching beat rather than a bare answer. Explainer copy lives
with existing content/messages so tone stays tunable.

## Acceptance criteria

- [ ] Pure explainer generator in the theory module: Degree + Key → sentence
- [ ] Language is movable-do and jargon-free; references the established Key
- [ ] Explainer renders in the existing Daily Melody Reveal
- [ ] Copy sourced from content/messages, not hardcoded in the UI
- [ ] Test asserts output never emits interval-name or absolute-pitch language (guards [ADR-0001])

## Blocked by

None — can start immediately.
