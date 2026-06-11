# 04 — Level system and level map

Status: done

## Parent

`.scratch/doremingo/PRD.md`

## What to build

The full Level progression as data plus a home screen to navigate it. Levels define degree pool, key pool, mode, cadence policy, octave range, and bar size, following the shape: Do-Mi-Sol → +Re → +Fa → +La → +Ti → no-cadence-repeat/faster (later slices add chromatic/minor/random-key/sequence levels on top of this structure). Question generation respects the level's pools and re-queues a similar question soon after a wrong answer. Home screen shows the level map with cleared/current/locked states, lets the player jump to any level (including uncleared ones, per PRD story 16) and replay cleared ones, and shows overall journey stats.

## Acceptance criteria

- [ ] Levels 1–6 playable per the progression shape; each draws only from its degree pool
- [ ] Early levels replay the Cadence every Question; the designated later level establishes Key once per run
- [ ] Wrong answer causes a similar Question to reappear within the next few Questions
- [ ] Level map shows progress states, allows jump/replay, shows totals
- [ ] Level gating, question generation pools, and re-queue covered by `node --test`

## Blocked by

- 03-bar-level-clear-persistence
