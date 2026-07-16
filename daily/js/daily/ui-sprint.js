// Daily Sprint — the impure UI adapter. Owns the DOM and the Piano; drives the
// pure sprint brain (sprint.js), the way ui.js drives the melody brain.
//
// Flow: enter → (locked? show result) → tap Start (the gesture that unlocks
// audio) → hear home, then a note → tap the Degree → tick/cross, next note.
// Every fourth Question opens a new Tier: the key is re-anchored and the palette
// grows. After sixteen, the clock stops and the misses are Revealed one by one —
// each replayed with its Resolution and named. Then stats persist and the game
// locks until the next local midnight.
//
// The stopwatch never gates anything: no Question expires, and a player can sit
// and think. Time is a score, not a rule (ADR-0004).

import { degreeInfo, degreeToMidi, midiToDegree, cadenceChords, resolutionPath } from '../theory.js';
import { buildPianoKeys } from '../piano-keys.js';
import { dailyConfig } from './schedule.js';
import { sprintPracticeConfig } from './practice.js';
import { seededRng } from './rng.js';
import { generateSprintRun, questionMidi } from './sprint.js';
import { sprintTourSteps } from './tour.js';
import { DAILY_GAMES } from './registry.js';
import { buildSprintShareText, formatElapsed } from './share.js';
import { defaultDaily, recordResult, isPlayed, gameStats } from './stats.js';
import { copyShare, createCountdown } from './ui-common.js';

const degName = (d, mode) => degreeInfo(d, mode).name;

// How long the answer outlines stay up before the next Question sounds: a beat
// to see green (or red beside green) and take it in. A Tier change gets a touch
// longer — the palette grows and the cadence re-anchors on the far side of it.
// Injectable so DOM tests don't sit through sixteen real seconds.
const BEATS = { correct: 1000, wrong: 1000, tier: 1200 };

export function createSprint({ piano, store, getState, showScreen, goBack, celebrate, onFinished, now = () => new Date(), beats = BEATS }) {
  const $ = (id) => document.getElementById(id);
  const el = {
    screen: $('sprint-screen'),
    back: $('sprint-back-btn'),
    title: $('sprint-title'),
    tier: $('sprint-tier'),
    sub: $('sprint-sub'),
    status: $('sprint-status'),
    clock: $('sprint-clock'),
    progress: $('sprint-progress'),
    play: $('sprint-play'),
    board: $('sprint-board'),
    startBtn: $('sprint-start-btn'),
    replayBtn: $('sprint-replay-btn'),
    practiceBtn: $('sprint-practice-btn'),
    meters: document.querySelector('#sprint-screen .sprint-meters'),
    tour: $('sprint-tour'),
    tourText: $('sprint-tour-text'),
    tourBtn: $('sprint-tour-btn'),
    tourSkip: $('sprint-tour-skip'),
    finish: $('sprint-finish'),
    revealBtn: $('sprint-reveal-btn'),
    resultsBtn: $('sprint-results-btn'),
    resultRevealBtn: $('sprint-result-reveal-btn'),
    palette: $('sprint-degree-buttons'),
    mascotStage: $('sprint-mascot-stage'),
    feedback: $('sprint-feedback'),
    mascot: $('sprint-mascot'),
    result: $('sprint-result'),
    resultTitle: $('sprint-result-title'),
    reveal: $('sprint-reveal'),
    stats: $('sprint-stats'),
    shareBtn: $('sprint-share-btn'),
    shareStatus: $('sprint-share-status'),
    countdown: $('sprint-countdown'),
  };

  let config = null;
  let run = null;
  let game = null;
  let started = false;
  let practice = false; // sandbox run: home chord, no clock, no stats, no lock
  let tourStep = -1; // -1 = tour inactive; 0..2 = coach-bubble step (practice only)
  let revealing = false; // end-of-run Reveal is walking — palette stays shut
  let elapsedMs = 0; // banked time from earlier visits (resume)
  let startedAt = null; // wall clock when this visit's timing began
  let clockTimer = null;
  let timers = [];

  const countdown = createCountdown({ el: el.countdown, now, isVisible: () => !el.screen.hidden });

  // ---- clock ----
  // Elapsed time survives leaving and coming back: a reload must not hand back a
  // fresh clock, or the run's only score is free to reset (same reasoning as
  // Melody's guess resume).

  const elapsed = () => elapsedMs + (startedAt === null ? 0 : Date.now() - startedAt);

  function renderClock() {
    el.clock.textContent = formatElapsed(elapsed());
  }

  function startClock() {
    if (startedAt === null) startedAt = Date.now();
    clearInterval(clockTimer);
    renderClock();
    clockTimer = setInterval(renderClock, 200);
  }

  function stopClock() {
    if (startedAt !== null) {
      elapsedMs += Date.now() - startedAt;
      startedAt = null;
    }
    clearInterval(clockTimer);
    clockTimer = null;
    renderClock();
  }

  // ---- audio ----

  function clearTimers() {
    for (const t of timers) clearTimeout(t);
    timers = [];
  }

  function playCadence(t) {
    for (const chord of cadenceChords(run.tonic, run.mode)) t = piano.playChord(chord, t, 0.5) + 0.05;
    return t;
  }

  function playQuestion(t = piano.now + 0.15) {
    const q = game.current;
    if (!q) return t;
    piano.playNote(questionMidi(run, q), t, 1.1, 0.95);
    return t + 1.1;
  }

  // The first cadence of a run is an introduction, not a reminder — "again" only
  // makes sense once you've heard it. And a Tier is only named when there is one:
  // practice has a single unnamed lane (practice.js), so naming it printed "null".
  function cadenceCopy() {
    if (game.index === 0) return '🏠 This is home — the key';
    const tier = game.current?.tier;
    return tier ? `🏠 ${tier} — here's home again` : "🏠 Here's home again";
  }

  // A new Tier re-anchors the key before its first note — the pool just widened,
  // and the fresh Degree is only findable against home.
  function askCurrent({ withCadence = false } = {}) {
    clearTimers();
    if (!game.current) return;
    let t = piano.now + 0.15;
    if (withCadence) {
      el.status.hidden = false;
      el.status.textContent = cadenceCopy();
      t = playCadence(t) + 0.25;
      timers.push(setTimeout(() => { el.status.hidden = true; }, (t - piano.now) * 1000));
    } else {
      el.status.hidden = true;
    }
    playQuestion(t);
  }

  // ---- rendering ----

  function setMascot(stateName) {
    el.mascot.className = `mascot mascot-sm${stateName ? ` ${stateName}` : ''}`;
  }

  /**
   * The live grid: one lane per Tier, four cells each, in Question order — the
   * same shape the shared grid pastes as, so the thing you play on and the
   * thing you post are recognisably one object.
   *
   * Cells are answered (green/grey), current (`filled` — the you-are-here
   * marker), or waiting. `cueIndex` lights one cell during the Reveal so the
   * player can see WHICH note is being walked home, not just hear it.
   */
  function renderBoard({ cueIndex = null } = {}) {
    const answered = game.answers;
    const lanes = config.tiers.map(({ tier }, tierIndex) => {
      const lane = document.createElement('div');
      lane.className = 'daily-lane sprint-lane';
      // The current Tier is named as you reach it — the ladder is the ramp, so
      // seeing "Medium" arrive is the point (CONTEXT.md: Tier).
      const isCurrentTier = !game.done && game.current?.tierIndex === tierIndex;
      lane.classList.toggle('current', isCurrentTier);

      // Practice has one unlabelled lane — no Tier to name (practice.js).
      if (tier) {
        const label = document.createElement('span');
        label.className = 'sprint-lane-label';
        label.textContent = tier;
        lane.append(label);
      }

      for (let i = 0; i < config.perTier; i++) {
        const index = tierIndex * config.perTier + i;
        const cell = document.createElement('span');
        cell.className = 'daily-cell';
        const row = answered[index];
        if (row) cell.classList.add(row.correct ? 'green' : 'grey');
        else if (index === game.index && !game.done) cell.classList.add('filled');
        if (index === cueIndex) cell.classList.add('cue');
        lane.append(cell);
      }
      return lane;
    });
    el.board.replaceChildren(...lanes);
  }

  function renderProgress() {
    const q = game.current;
    const total = config.rounds;
    const n = Math.min(game.index + 1, total);
    el.progress.textContent = game.done ? `${total} of ${total}` : `${n} of ${total}`;
    const tier = q?.tier ?? config.tiers.at(-1).tier;
    // Practice has no Tier badge — there is no ladder to place you on.
    el.tier.hidden = !tier;
    if (!tier) return;
    el.tier.textContent = tier;
    el.tier.className = `daily-tier tier-${tier.toLowerCase()}`;
  }

  // The palette is rebuilt per Tier: buildPianoKeys always lays out all seven
  // whites and disables those outside the pool, so a wider pool lights keys up
  // in place rather than reflowing the keyboard under the player's thumb.
  function buildPalette(pool) {
    el.palette.classList.add('piano');
    el.palette.replaceChildren(...buildPianoKeys(pool, config.mode, tapDegree));
  }

  function setPaletteEnabled(on) {
    for (const b of el.palette.querySelectorAll('button')) {
      if (b.classList.contains('off')) continue;
      b.disabled = !on;
    }
  }

  /**
   * Show/hide the play row's buttons — never the row itself. The row sits between
   * the grid and the keyboard, and #sprint-play reserves its height, so hiding
   * the buttons swaps the controls without moving the keyboard under the thumb.
   */
  function setPlayRow({ start = false, replay = false } = {}) {
    el.startBtn.hidden = !start;
    el.replayBtn.hidden = !replay;
  }

  const keyFor = (d) => el.palette.querySelector(`[data-degree="${d}"]:not([data-octave])`);

  // The playable keys are one octave, plus a disabled Do′ an octave up for
  // upward walks to land on (see piano-keys.js). Anything else has no key.
  function keyForMidi(midi) {
    const degree = midiToDegree(run.tonic, midi, run.mode);
    if (degree === null) return null;
    const octave = Math.floor((midi - run.tonic) / 12);
    if (octave === 0) return keyFor(degree);
    if (octave === 1 && degree === 1) return el.palette.querySelector('[data-degree="1"][data-octave="1"]');
    return null;
  }

  function clearMarks() {
    for (const b of el.palette.querySelectorAll('button')) {
      b.classList.remove('correct', 'wrong', 'playing');
    }
  }

  // Same vocabulary as the quiz board (js/view.js): green outline on the right
  // Degree, red on what you actually tapped. A miss shows both — being told you
  // were wrong teaches nothing without being shown what was right.
  function markAnswer(row) {
    keyFor(row.answer)?.classList.add(row.correct ? 'correct' : 'wrong');
    if (!row.correct) keyFor(row.degree)?.classList.add('correct');
  }

  /** Light a key while its note sounds, matching a playNote/playSequence schedule. */
  function lightKey(btn, delaySec, durationSec) {
    if (!btn) return;
    timers.push(setTimeout(() => {
      btn.classList.add('playing');
      timers.push(setTimeout(() => btn.classList.remove('playing'), durationSec * 1000));
    }, delaySec * 1000));
  }

  // ---- interaction ----

  function tapDegree(d) {
    if (!started || revealing || game.done) return;
    const q = game.current;
    const row = game.answer(d);
    markAnswer(row);
    renderBoard(); // the cell you just earned lands with the outline
    setMascot(row.correct ? 'happy' : null);
    el.feedback.textContent = row.correct ? '✓ Yes!' : `✗ That was ${degName(q.degree, run.mode)}`;
    saveProgress();

    if (game.done) {
      finish();
      return;
    }
    renderProgress();
    const newTier = game.isTierStart();
    // A beat to read the outlines, then straight on — the run should feel brisk.
    const beat = newTier ? beats.tier : row.correct ? beats.correct : beats.wrong;
    timers.push(setTimeout(() => {
      // Rebuilding the palette for a new Tier drops the marks with it.
      if (newTier) buildPalette(game.current.pool);
      else clearMarks();
      renderBoard(); // move the you-are-here marker on (and the lane, at a Tier)
      askCurrent({ withCadence: newTier });
    }, beat));
  }

  // The replay is free: no budget, no penalty. The clock is the only cost, and
  // that is the point — Melody rations replays because it has no clock to.
  function replayQuestion() {
    if (!started || revealing || game.done) return;
    clearTimers();
    playQuestion();
  }

  async function ensurePiano() {
    try {
      await piano.init();
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  }

  // The triggering tap is the gesture that unlocks the AudioContext.
  async function startRun() {
    el.startBtn.disabled = true;
    el.startBtn.classList.remove('pulse-cta');
    if (!(await ensurePiano())) {
      el.startBtn.disabled = false;
      el.status.hidden = false;
      el.status.textContent = 'Could not load the piano — tap Start to retry.';
      return;
    }
    started = true;
    setPlayRow({ replay: true });
    setPaletteEnabled(true);
    startClock();
    el.feedback.textContent = '';
    askCurrent({ withCadence: true });
  }

  // ---- practice tour ----
  // A three-step coach bubble for first-timers (practice only): home → one note
  // → your task. Tap-to-advance; the first two steps play their own audio (the
  // bubble IS the narration, so no status line). The play row and palette stay
  // shut until the tour ends. No persistence: practice is opt-in, so it always
  // runs — mirroring Melody's tour in ui.js.

  const steps = () => sprintTourSteps({ rounds: config.rounds });

  function renderTourStep() {
    const step = steps()[tourStep];
    el.tourText.textContent = step.text;
    el.tourBtn.textContent = step.button;
    el.tourBtn.disabled = false;
    el.tour.hidden = false;
  }

  function startTour() {
    tourStep = 0;
    setPlayRow({}); // the bubble's button is the only call to action
    renderTourStep();
  }

  function hideTour() {
    tourStep = -1;
    el.tour.hidden = true;
  }

  // Hand the board over to the normal flow: audio is unlocked by now, so the
  // play row returns as the per-Question replay and the first Question stands.
  function endTour() {
    hideTour();
    started = true;
    setPlayRow({ replay: true });
    setPaletteEnabled(true);
    startClock();
    el.feedback.textContent = '';
  }

  async function advanceTour() {
    const step = steps()[tourStep];
    if (step.plays === 'cadence') { // step 1: this tap unlocks the AudioContext
      el.tourBtn.disabled = true;
      if (!(await ensurePiano())) {
        el.tourText.textContent = 'Could not load the piano — tap “Play home” to retry.';
        el.tourBtn.disabled = false;
        return; // stay on this step
      }
      playCadence(piano.now + 0.25);
    } else if (step.plays === 'note') {
      // The run's real first Question — the tour teaches on the thing itself, so
      // the player has already heard it once when the board opens.
      playQuestion(piano.now + 0.2);
    }
    tourStep += 1;
    if (tourStep >= steps().length) { endTour(); return; }
    renderTourStep();
  }

  // Skip: returning players know the drill. If audio never got unlocked, fall
  // back to the normal first-tap flow; if it did, hand the board over and play
  // the first Question so they still hear it.
  function skipTour() {
    const unlocked = tourStep > 0;
    hideTour();
    if (unlocked) { endTour(); playQuestion(); return; }
    setPlayRow({ start: true }); // pre-start state: startRun on first tap
  }

  // ---- progress ----

  // Called on every answer AND on the way out (stop / pagehide): saving only on
  // answer would bank the clock at the last answer, so reloading while thinking
  // about a Question would silently refund the thinking time.
  function saveProgress() {
    if (practice) return; // a sandbox has nothing to resume and nothing to protect
    if (!game || !config || !started) return;
    const state = getState();
    state.daily ??= defaultDaily();
    const answers = game.answers.map((a) => a.answer);
    state.daily.games.sprint.progress = game.done
      ? null
      : { day: config.day, answers, elapsedMs: elapsed() };
    store.save(state);
  }

  // ---- finishing ----

  // Teaching lands here rather than after every answer: sixteen Resolutions would
  // cost ~24s and stop this being a Sprint (ADR-0004). Each miss is replayed,
  // named, and walked home.
  //
  // It is OFFERED, not forced: a player who wants their grid shouldn't have to
  // sit through a lesson to reach it, and teaching nobody asked for is teaching
  // nobody hears. The offer persists on the result card, so choosing the grid
  // first doesn't burn the lesson.
  function revealMisses(onDone) {
    const misses = game.misses();
    if (!misses.length || !piano.buffers.size) {
      onDone();
      return;
    }
    revealing = true;
    el.finish.hidden = true;
    el.result.hidden = true;
    el.palette.hidden = false;
    el.reveal.hidden = false;
    setPaletteEnabled(false);

    const NOTE = 0.32;
    const GAP = 0.04;

    let i = 0;
    const step = () => {
      if (i >= misses.length) {
        revealing = false;
        clearMarks();
        renderBoard(); // drop the cue — the grid goes back to being the result
        el.reveal.textContent = 'That was the lot — see you tomorrow 🦩';
        onDone();
        return;
      }
      const m = misses[i++];
      const midi = degreeToMidi(run.tonic, m.degree, 0, run.mode);
      // Light the cell this miss came from: sixteen notes in, "you said Do" means
      // little without knowing WHICH one — and the Tier lane says how far in.
      renderBoard({ cueIndex: m.index });
      el.reveal.textContent = `${m.tier} · you said ${degName(m.answer, run.mode)} — it was ${degName(m.degree, run.mode)}`;

      // Show the miss the way the run did: red on what you tapped, green on the
      // answer — then play the answer, lighting its key as it sounds.
      clearMarks();
      keyFor(m.answer)?.classList.add('wrong');
      keyFor(m.degree)?.classList.add('correct');

      piano.playNote(midi, piano.now + 0.1, 0.9, 0.95);
      lightKey(keyFor(m.degree), 0.1, 0.9);

      // …then walk it home. The Resolution is the teaching device (ADR-0001) —
      // hearing the note alone doesn't tell the ear where it sits. Each step of
      // the walk lights its own key, as the quiz board does (js/view.js).
      const path = resolutionPath(run.tonic, midi, run.mode);
      piano.playSequence(path, piano.now + 1.1, NOTE, GAP);
      path.forEach((noteMidi, n) => lightKey(keyForMidi(noteMidi), 1.1 + n * (NOTE + GAP), NOTE));

      timers.push(setTimeout(step, 1100 + path.length * (NOTE + GAP) * 1000 + 600));
    };
    step();
  }

  function finish() {
    stopClock();
    clearTimers();
    el.status.hidden = true;
    setPlayRow({}); // controls go, the row keeps its height
    setPaletteEnabled(false);

    el.feedback.textContent = '';

    // Practice never records, never locks the day, and has no grid worth sharing.
    // Offer the lesson if there's one to give, then hand over to the real Sprint.
    if (practice) {
      const done = () => finishPractice();
      if (game.misses().length && piano.buffers.size) offerReveal(done);
      else done();
      return;
    }

    const result = { ...game.result(elapsed()), day: config.day };
    const state = getState();
    if (!isPlayed(state.daily, config.day, 'sprint')) {
      state.daily = recordResult(state.daily ?? defaultDaily(), 'sprint', result);
      store.save(state);
      onFinished?.(); // growth hooks (review ask, reminders) — fire-and-forget
    }

    // Nothing missed (or no audio) → there is no lesson to offer; go to the grid.
    if (!game.misses().length || !piano.buffers.size) {
      showResult(true);
      return;
    }
    offerReveal(() => showResult(true));
  }

  // The practice payoff: no stats, no lock — just "you've got it, now play today's".
  function finishPractice() {
    const { correct, rounds } = game.result();
    if (!celebrate) { start(); return; } // no celebration wired → straight to today's
    celebrate({
      title: correct === rounds ? `${correct}/${rounds} — you've got it! 🎉` : `${correct}/${rounds} — that's the idea 🦩`,
      message: "That's the whole game. Today's Sprint climbs Easy → Master — every key by the end — and the clock only keeps score.",
      buttonText: "Play today's Sprint",
      onContinue: () => start(),
    });
  }

  // Where the Reveal hands back to: the day's grid, or (in practice) the payoff.
  let afterReveal = () => showResult(true);

  // Tapping a Reveal button is itself the gesture that unlocks audio — on a
  // locked re-entry the piano was never started, since the day needed no sound.
  async function startReveal() {
    if (revealing) return;
    el.revealBtn.disabled = true;
    el.resultRevealBtn.disabled = true;
    const ok = await ensurePiano();
    el.revealBtn.disabled = false;
    el.resultRevealBtn.disabled = false;
    if (!ok) {
      el.reveal.hidden = false;
      el.reveal.textContent = 'Could not load the piano — tap again to retry.';
      return;
    }
    revealMisses(afterReveal);
  }

  // The run is over and there are misses: hand the player the choice rather
  // than playing at them.
  function offerReveal(onDone) {
    afterReveal = onDone;
    const n = game.misses().length;
    el.reveal.hidden = false;
    el.reveal.textContent = `${n} to put right — hear them, or skip ahead.`;
    el.revealBtn.textContent = n === 1 ? '🔁 Hear the one you missed' : '🔁 Hear what you missed';
    el.resultsBtn.textContent = practice ? 'Skip' : 'See results';
    el.finish.hidden = false;
    el.result.hidden = true;
  }

  function renderStats(stats) {
    const best = stats.best;
    el.stats.innerHTML =
      `<div class="stat-figures">`
      + `<span><b>${stats.played}</b><small>runs</small></span>`
      + `<span><b>${best ? `${best.correct}/${config?.rounds ?? 12}` : '—'}</b><small>best</small></span>`
      + `<span><b>${best ? formatElapsed(best.elapsedMs) : '—'}</b><small>best time</small></span>`
      + `<span><b>${getState().daily.streak}</b><small>streak 🔥</small></span>`
      + `</div>`;
  }

  // live=true right after finishing (we have the run to reveal);
  // live=false on a locked re-entry (rebuilt from stored stats).
  function showResult(live) {
    const stats = gameStats(getState().daily, 'sprint');
    const today = stats.today;
    el.status.hidden = true;
    setPlayRow({});
    el.finish.hidden = true;
    el.palette.hidden = true;
    el.mascotStage.hidden = true;
    el.reveal.hidden = true;
    el.result.hidden = false;
    el.clock.textContent = formatElapsed(today.elapsedMs);
    el.progress.textContent = `${today.rounds} of ${today.rounds}`;

    const all = today.correct === today.rounds;
    el.resultTitle.textContent = all
      ? `Clean sweep — ${today.correct}/${today.rounds}! 🎉`
      : `${today.correct}/${today.rounds} in ${formatElapsed(today.elapsedMs)} 🦩`;

    // The lesson stays on offer from here — including tomorrow-morning-brain on
    // a locked re-entry, which is why the answers are stored (stats.js).
    el.resultRevealBtn.hidden = !game || !game.misses().length;

    renderStats(stats);
    countdown.start();
    if (all && live && celebrate) {
      celebrate({
        title: `All sixteen! ${formatElapsed(today.elapsedMs)} 🎉`,
        message: 'Every Tier, every note. That is a trained ear.',
        buttonText: 'See results',
        onContinue: () => showScreen(el.screen),
      });
    }
  }

  function shareResult() {
    const today = gameStats(getState().daily, 'sprint').today;
    copyShare(
      buildSprintShareText({
        day: today.day,
        correct: today.correct,
        rounds: today.rounds,
        elapsedMs: today.elapsedMs,
        marks: today.marks,
        perTier: config?.perTier ?? 4,
      }),
      el.shareStatus,
    );
  }

  // ---- lifecycle ----

  function start() { enter(false); }
  function startPractice() { enter(true); }

  function enter(isPractice) {
    practice = isPractice;
    clearTimers();
    config = practice ? sprintPracticeConfig() : dailyConfig(now(), 'sprint');
    run = generateSprintRun(seededRng(config.seed), config);
    game = DAILY_GAMES.sprint({ questions: run.questions });
    started = false;
    revealing = false;
    elapsedMs = 0;
    startedAt = null;
    afterReveal = () => showResult(true);

    el.title.textContent = practice ? 'Sprint practice' : `Sprint #${config.day}`;
    el.sub.textContent = practice
      ? `${config.rounds} notes · Do, Mi, Sol · no clock, no streak`
      // Name the actual ends of the ladder, so the copy can't drift from the Tiers.
      : `${config.rounds} notes · ${config.tiers[0].tier} → ${config.tiers.at(-1).tier} · one tap each`;
    // Practice hides the clock outright: it isn't scored, and a running timer
    // says "hurry" to exactly the player who needs to be told not to.
    el.meters.hidden = practice;
    el.shareStatus.textContent = '';
    el.reveal.hidden = true;
    el.reveal.textContent = '';
    el.finish.hidden = true;
    el.resultRevealBtn.hidden = true;
    el.feedback.textContent = '';
    // Wipe the narration too — otherwise the last run's "Hard — here's home
    // again" greets you on the way into a fresh one.
    el.status.hidden = true;
    el.status.textContent = '';
    setMascot(null);
    hideTour(); // reset any coach bubble left from a previous practice visit

    const state = getState();
    state.daily ??= defaultDaily();

    // Already ran today → locked result view, no audio needed. Replay the stored
    // answers back through the brain so the Reveal is still on offer: the
    // Questions come from the seed, the answers from stats.
    // (Practice has no day and never locks — it's a sandbox.)
    if (!practice && isPlayed(state.daily, config.day, 'sprint')) {
      const today = gameStats(state.daily, 'sprint').today;
      for (const d of today.answers ?? []) if (!game.done) game.answer(d);
      started = true; // a finished run: the Reveal may play, the palette may not
      buildPalette(config.pool);
      setPaletteEnabled(false);
      renderBoard();
      setPlayRow({});
      el.mascotStage.hidden = true;
      // Today's run is spent, but the sandbox never locks — there's still a way
      // to keep playing.
      el.practiceBtn.hidden = false;
      el.practiceBtn.textContent = '🎓 Practice run';
      showScreen(el.screen);
      showResult(false);
      return;
    }

    // Resume a run left half-finished — including its clock. One attempt a day
    // means leaving must not deal a fresh run (or a fresh stopwatch).
    // (Practice has no stakes, so it always deals fresh.)
    const saved = practice ? null : gameStats(state.daily, 'sprint').progress;
    if (saved && saved.day === config.day) {
      for (const d of saved.answers) if (!game.done) game.answer(d);
      elapsedMs = saved.elapsedMs ?? 0;
    }

    el.result.hidden = true;
    el.palette.hidden = false;
    el.mascotStage.hidden = false;
    setPlayRow({ start: true });
    el.startBtn.disabled = false;
    el.startBtn.classList.add('pulse-cta');
    el.startBtn.textContent = practice
      ? '▶ Start the practice'
      : game.index ? '▶ Pick up where you left off' : '▶ Start the Sprint';
    el.status.hidden = true;

    // The way into the sandbox — hidden while you're in it. Extra-inviting before
    // a first-timer spends their one Sprint of the day on a cold ear.
    el.practiceBtn.hidden = practice;
    el.practiceBtn.textContent = gameStats(state.daily, 'sprint').played === 0
      ? '🎓 New? Try a practice run'
      : '🎓 Practice run';

    renderProgress();
    renderClock();
    renderBoard(); // the empty grid IS the pitch: sixteen notes, four Tiers
    buildPalette(game.current?.pool ?? config.pool);
    setPaletteEnabled(false); // wait for the first tap (which unlocks audio)
    showScreen(el.screen);

    // First-timers get walked through home → one note → your task before the
    // board opens. Practice only — the Daily is one attempt, not a lesson.
    if (practice) startTour();
  }

  function stop() {
    saveProgress(); // bank the clock before it stops ticking
    stopClock();
    countdown.stop();
    clearTimers();
    piano.stopAll?.();
  }

  // A reload or a swipe-away never reaches stop(); pagehide does. Without this
  // the clock rewinds to the last answer — the run's only score, refunded.
  globalThis.addEventListener?.('pagehide', () => saveProgress());

  el.back?.addEventListener('click', () => { stop(); goBack(); });
  el.startBtn.addEventListener('click', () => startRun());
  el.replayBtn.addEventListener('click', () => replayQuestion());
  el.practiceBtn.addEventListener('click', () => startPractice());
  el.tourBtn.addEventListener('click', () => advanceTour());
  el.tourSkip.addEventListener('click', () => skipTour());
  el.revealBtn.addEventListener('click', () => startReveal());
  el.resultRevealBtn.addEventListener('click', () => startReveal());
  el.resultsBtn.addEventListener('click', () => afterReveal());
  el.shareBtn.addEventListener('click', () => shareResult());

  return { start, stop };
}
