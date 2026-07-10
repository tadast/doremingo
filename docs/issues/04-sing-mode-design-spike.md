# Slice 4 — Sing Mode design spike

**Type:** HITL · **Blocked by:** None
**PRD:** `docs/prd/2026-07-growth-differentiation-roadmap.md` (stories 13–20)

## What to build

Decide the Sing Mode judgment rules before building. Requires human sign-off on:
pitch-match tolerance band (cents), octave-folding behavior (accept any comfortable
octave), how a sung frequency maps to a Degree relative to the current Key, the
no-fail retry loop, and the mic-permission / no-mic fallback UX to palette tap input.
Output is a short decision note that unblocks Slices 5–7. No production code.

## Acceptance criteria

- [ ] Tolerance band and octave-folding rule agreed and written down
- [ ] Frequency → Degree mapping approach agreed (relative to Key, per [ADR-0001])
- [ ] Mic-denied / no-mic fallback behavior agreed
- [ ] No-fail retry semantics agreed
- [ ] Decision note captured (short markdown, feeds Slice 5)

## Blocked by

None.
