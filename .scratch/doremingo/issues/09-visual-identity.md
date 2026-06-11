# 09 — Visual identity: mascot, theme, hand signs, celebrations

Status: done

## Parent

`.scratch/doremingo/PRD.md`

## What to build

DoReMingo's look and feel. Bright cheerful palette (flamingo pink anchor), the flamingo mascot with personality (reacts to right/wrong/streaks/level-clear), Curwen Hand Sign SVG icons on degree buttons and in Meet-the-Note, confetti on level clear, escalating streak cheer, happy CSS-first animations throughout. Whole-game pass — home, question screen, explainers, celebrations.

HITL: design taste — user reviews in Chrome before this merges. Iterate on the user's feedback.

## Acceptance criteria

- [ ] Distinct bright theme applied across all screens; genuinely playful, not template-grey
- [ ] Flamingo mascot present with at least: idle, correct, incorrect, celebrate states
- [ ] All 7 diatonic Hand Sign SVGs on buttons (chromatic levels may share nearest sign or omit)
- [ ] Confetti + sound on level clear; visible escalating streak feedback
- [ ] Animations don't block input; respects `prefers-reduced-motion`
- [ ] User has reviewed and approved the design in Chrome

## Blocked by

- 03-bar-level-clear-persistence
