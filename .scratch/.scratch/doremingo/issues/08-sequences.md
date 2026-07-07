# 08 — Sequence levels (2–3 notes)

Status: done

## Parent

`.scratch/doremingo/PRD.md`

## What to build

Top-of-progression levels where a Question plays 2–3 notes and the player answers with the Degrees in order. Answer UI becomes multi-tap with a visible answer slot row, backspace/clear, and submit (or auto-submit on last slot). Grading is all-or-nothing for the Bar but feedback shows per-note correctness; Resolution plays from the last note home to Do.

## Acceptance criteria

- [ ] Sequence levels play 2 then 3 note Questions per level definition
- [ ] Multi-tap answering with visible slots, correction before submit, works on mobile portrait
- [ ] Per-note feedback on wrong answers; Resolution from final note
- [ ] Sequence generation and grading covered by `node --test`
- [ ] Explainer introduces the concept (hearing melodies as Degrees)

## Blocked by

- 07-advanced-levels
