# 01 — Playable core loop

Status: done

## Parent

`.scratch/doremingo/PRD.md`

## What to build

The thinnest complete game loop, playable in a browser. Open the page, tap to start (unlocks audio per mobile autoplay policy), hear the I-IV-V-I Cadence in C major, hear a question note drawn from Do/Mi/Sol (C4–B4), answer via three big solfège+number buttons, get right/wrong feedback, hear the Resolution walk the note home to Do, next Question. Real piano sound via a small set of public-domain samples pitch-shifted with Web Audio. Endless loop is fine — no Bar, no levels, no persistence yet.

Establishes the module split: pure theory core (degree↔MIDI math, cadence voicing, resolution paths) separate from audio engine and UI, native ES modules, no build step.

## Acceptance criteria

- [ ] Page served statically plays the full Question loop on desktop Chrome and Chrome mobile emulation (portrait)
- [ ] Cadence, question note, and Resolution all sound with piano timbre
- [ ] Buttons show solfège + number (Do/1, Mi/3, Sol/5); correct/incorrect visibly indicated
- [ ] Wrong answer reveals the actual Degree
- [ ] Audio starts only after first user gesture; no console errors
- [ ] Theory core covered by `node --test` (degree↔MIDI, resolution path endpoints at Do, cadence chord content); tests pass with zero dependencies
- [ ] No note names (C, D…) anywhere in the UI (ADR-0001)

## Blocked by

None - can start immediately
