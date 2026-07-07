# 07 — Advanced levels: chromatic, minor, random keys

Status: done

## Parent

`.scratch/doremingo/PRD.md`

## What to build

Extend the progression past the diatonic levels: chromatic Degrees (Fi/Si/Te etc. with their buttons appearing only at these levels), minor mode (cadence and resolutions adapted), random major keys per run, then random keys with all Degrees. Octave range widens (~C3–C6). Theory core gains chromatic naming, minor-mode math, and per-key cadence voicings; each new level gets its theory explainer and (where a new Degree appears) Meet-the-Note moment.

## Acceptance criteria

- [ ] Chromatic levels quiz and label chromatic Degrees correctly; buttons appear only where unlocked
- [ ] Minor-mode level uses a minor Cadence and correct resolutions
- [ ] Random-key levels re-establish the new Key by Cadence each run/change
- [ ] Wider octave range in effect at the designated levels
- [ ] Chromatic/minor/key math covered by `node --test`
- [ ] New levels have explainers and Meet-the-Note moments

## Blocked by

- 04-level-system-and-map
- 05-meet-the-note-tutorial
- 06-theory-explainers

## Comments

Listed deps 05/06 are about reusing their explainer/meet-the-note surfaces; if building out of order, coordinate.
