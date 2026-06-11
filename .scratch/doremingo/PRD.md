# PRD: DoReMingo — functional ear training game

Status: ready-for-agent

## Problem Statement

People who want to learn music by ear have no patient, fun way to practise. Existing ear-training tools assume musical education (they speak in intervals and note names), feel like exams, and punish mistakes. A complete beginner — zero music education — wants to open a link on their phone, play a cheerful game for a few minutes, and gradually develop the real, transferable skill of recognising notes by ear. The author's long-term goal is for this skill to feed into guitar playing.

## Solution

DoReMingo: a free, static, mobile-first browser game that trains scale-degree recognition using established functional ear training (Kodály movable-do tradition). A Cadence establishes the Key, the game plays a note, the player answers with a Degree (Do/Re/Mi… buttons with Curwen Hand Signs). Every answer ends with the note's Resolution walking home to Do — the teaching mechanism itself. Levels introduce Degrees one at a time starting from the tonic triad, progressing to chromatic notes, minor mode, random keys, and short Sequences. Between levels, friendly plain-language theory explainers teach the concepts just encountered, assuming zero musical education. Progress is celebrated (fill-the-bar, confetti, mascot) and saved in localStorage. No fail states, bright colours, flamingo mascot.

## User Stories

1. As a complete beginner, I want the game to explain what a "key" and "home note" are in plain words, so that I can play without any musical education.
2. As a new player, I want a 60-second interactive tutorial (hear the Cadence, tap Do/Mi/Sol, hear a Resolution), so that I understand the game loop before being quizzed.
3. As a player, I want to hear a Cadence before questions, so that my ear has a tonal context to judge the note against.
4. As a player, I want to answer by tapping big solfège buttons (Do/Re/Mi with numbers), so that I can play comfortably on a phone.
5. As a player, I want each answer button to show its Curwen Hand Sign, so that I get an extra visual memory hook from real pedagogy.
6. As a player, I want to hear the note walk home to Do after every answer (right or wrong), so that I learn the note's function even from mistakes.
7. As a player in a hurry, I want to tap to skip the Resolution, so that I can keep a fast quiz rhythm when streaking.
8. As a player who answered wrong, I want to see which Degree it really was and get a similar question again soon, so that I learn rather than just lose points.
9. As a beginner, I want Level 1 to use only Do, Mi, Sol in C major, so that my first session feels achievable.
10. As a progressing player, I want each new level to add one new Degree with a "Meet-the-Note" moment, so that difficulty grows gently.
11. As a progressing player, I want a short, friendly theory explainer before each level (what's new, why it sounds the way it does), so that I understand what I'm about to train.
12. As an impatient player, I want to skip or revisit theory explainers at any time, so that reading is never forced.
13. As an advanced player, I want levels with chromatic Degrees, minor mode, random Keys, and 2–3 note Sequences, so that the game stays challenging all the way up.
14. As a returning player, I want my progress saved in the browser (levels cleared, current bar), so that I continue where I left off without an account.
15. As a confident player, I want to jump to any unlocked level — or replay any cleared one — from a level map, so that I control my practice.
16. As an experimenting player, I want to optionally start at any level even without clearing prior ones, so that I can find my own starting difficulty.
17. As a player, I want a progress Bar that fills on correct answers and only gently drains on mistakes, so that I never feel punished or "fail".
18. As a player, I want clearing a level celebrated (confetti, happy mascot animation, cheerful sound), so that progress feels rewarding.
19. As a player, I want streaks acknowledged with escalating cheer, so that good runs feel exciting.
20. As a phone user, I want the game fully playable on a mobile browser in portrait (large tap targets, no hover dependence, audio after first tap), so that I can practise anywhere.
21. As a desktop user, I want keyboard shortcuts (1–7 for Degrees, space to replay), so that I can drill quickly.
22. As a player, I want to replay the question note and the Cadence on demand, so that I can listen again before answering.
23. As a player, I want the note played with a real piano sound, so that what I learn transfers to real music.
24. As a player on a slow connection, I want the game to load fast and show loading state for samples, so that the first experience isn't broken silence.
25. As a player, I want bright colours, playful animations, and a flamingo mascot with personality, so that practice feels like a game, not a drill.
26. As a player with no patience for settings, I want zero required configuration, so that I'm playing within seconds of opening the link.
27. As a returning player, I want to see my overall journey (levels cleared, totals) on the home screen, so that I can see how far I've come.
28. As an aspiring guitarist, I want the skill taught (Degrees relative to a Key) to be the one used in real-world playing, so that later guitar-specific features build on the same foundation.

## Implementation Decisions

- Methodology fixed by ADR-0001: functional ear training (scale-degree recognition with cadence-established tonal context). Note names never appear as answers; the UI speaks Degrees (solfège + number).
- Vanilla HTML/CSS/JS with native ES modules, no framework, no build step, no runtime dependencies. Deployed on GitHub Pages from the repo.
- Six modules:
  - **Theory core** — pure functions; Key/Degree↔MIDI math, solfège naming (incl. chromatic Fi/Si/Te…), Cadence chord voicings (I-IV-V-I), Resolution path generation (stepwise to Do, up or down by proximity). No DOM, no audio.
  - **Quiz engine** — pure logic; Level definitions (degree pool, key pool, mode, cadence policy, sequence length), question generation with wrong-answer re-queue, Bar state machine (+1 correct, −0.5 wrong, floor 0, full = cleared), grading. Consumes Theory core.
  - **Progress store** — localStorage persistence of cleared levels, current level/bar, settings; schema versioned for future migration; storage injectable.
  - **Audio engine** — Web Audio; loads a subset (~15–25) of public-domain piano samples (Salamander), pitch-shifts via playbackRate between sampled pitches; plays notes, chords (Cadence), and timed sequences (Resolution, Sequences). Unlocks on first user gesture (mobile autoplay policy).
  - **UI** — screens: home/level map, theory explainer, Meet-the-Note, question, level-clear celebration. Animations CSS-first. Curwen Hand Signs as inline SVG.
  - **Theory content** — plain data: per-level explainer copy written for zero musical education, in glossary vocabulary ("home note Do", not "tonic" — or introducing "tonic" gently as the formal word).
- Level progression shape (counts tunable): Do-Mi-Sol → +Re → +Fa → +La → +Ti (full diatonic) → no-cadence-repeat/faster → chromatic Degrees → minor mode → random major keys → random keys all Degrees → Sequences of 2–3.
- Cadence is I-IV-V-I. Early levels replay the Cadence every Question; later levels establish Key once per run as a difficulty step.
- Question notes span C4–B4 at early levels, widening to roughly C3–C6 later.
- Theory explainers appear before a level's first question on first entry; always re-readable from the level map; always skippable.
- Single shared progress slot (no profiles, no accounts).

## Testing Decisions

- A good test exercises external behaviour through the module's public interface — inputs and observable outputs — never internal state or call patterns.
- Automated tests for **Theory core** and **Quiz engine** via Node's built-in `node --test` runner (zero dependencies, honours no-build constraint). Examples: degree-to-MIDI across keys and modes, chromatic naming, resolution path endpoints, level gating, bar arithmetic and floor, wrong-answer re-queue behaviour.
- **Progress store**, **Audio engine**, **UI**: verified manually in Chrome (mobile emulation for touch/portrait), per user decision. Audio correctness checked by ear against the level spec.
- No prior art in the repo (greenfield); these tests set the convention.

## Out of Scope

- Guitar-specific features (fretboard mapping of Degrees, guitar timbre option) — explicit later goal; methodology chosen to remain compatible.
- Backend, accounts, sync across devices, leaderboards.
- Microphone input / singing the answer.
- Harmonic dictation, chord-quality recognition, rhythm training.
- Multiple instrument timbres, volume/tempo settings beyond the minimum.
- Localisation (English only for now).
- Offline/PWA support (may come later; static architecture keeps the door open).

## Further Notes

- Name: **DoReMingo** — flamingo mascot anchors the visual identity (pink + bright palette).
- Domain glossary in `CONTEXT.md`; methodology rationale in `docs/adr/0001`. Implementers should keep UI copy consistent with the glossary (Degree, Cadence, Resolution, Meet-the-Note, Bar).
- Manual run: serve repo root with any static server (user alias `servedir`, port 5555); test in Chrome including mobile emulation.
