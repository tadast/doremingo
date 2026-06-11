# 03 — Bar, level clear, persistence

Status: ready-for-agent

## Parent

`.scratch/doremingo/PRD.md`

## What to build

Turn the endless loop into a clearable level. Add the Bar: +1 per correct answer, −0.5 per wrong, floor 0, full (~15) clears the level with a celebration moment (can be simple — polish comes in the visual identity slice). Persist progress (cleared levels, current bar) in localStorage behind a versioned, storage-injectable Progress store; reload resumes where the player left off. There is no fail state.

## Acceptance criteria

- [ ] Bar visible during play, fills/drains per the rules, never goes below 0
- [ ] Full Bar triggers a level-clear screen and marks the level cleared
- [ ] Reloading the page restores cleared state and in-progress Bar
- [ ] Stored data carries a schema version
- [ ] Bar arithmetic covered by `node --test`

## Blocked by

- 01-playable-core-loop
