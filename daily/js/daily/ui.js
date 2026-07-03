// Daily Melody — the impure UI adapter. Owns the DOM and the Piano; drives the
// pure melody brain (melody.js) the way main.js drives Round. Self-contained:
// it queries its own #daily-* elements and exposes start()/stop().
//
// Flow: enter → (locked? show result) → play the tune once → tap the Degree
// palette to build a guess row; the row auto-submits on the last note (no undo,
// no Guess button — committal). It grades per position, the tune auto-replays,
// degrees shown absent are greyed out of the palette, and one manual replay is
// allowed per turn. Solve, or soft-fail (the tune is revealed and played). On
// finish, stats persist and the screen locks until the next local midnight.
//
// Also hosts Practice — the same board driven by a fixed recognisable tune
// (practice.js): no stats, no lock, no resume, always available.

import { degreeInfo, degreeToMidi, cadenceChords } from '../theory.js';
import { HAND_SIGNS } from '../art.js';
import { dailyConfig } from './schedule.js';
import { seededRng } from './rng.js';
import { generateMelody, melodyMidis } from './puzzle.js';
import { PRACTICE_TUNE, practiceConfig, practiceMelody } from './practice.js';
import { DAILY_GAMES } from './registry.js';
import { buildShareText } from './share.js';
import { defaultDaily, recordResult, isPlayed, winPercent } from './stats.js';

const degName = (d, mode) => degreeInfo(d, mode).name;

export function createDaily({ piano, store, getState, showScreen, goHome, celebrate, onFinished, now = () => new Date() }) {
  const $ = (id) => document.getElementById(id);
  const el = {
    screen: $('daily-screen'),
    back: $('daily-back-btn'),
    title: $('daily-title'),
    sub: $('daily-sub'),
    status: $('daily-status'),
    play: $('daily-play'),
    playBtn: $('daily-play-btn'),
    practiceBtn: $('daily-practice-btn'),
    board: $('daily-board'),
    palette: $('daily-degree-buttons'),
    mascotStage: $('daily-mascot-stage'),
    feedback: $('daily-feedback'),
    mascot: $('daily-mascot'),
    result: $('daily-result'),
    resultTitle: $('daily-result-title'),
    reveal: $('daily-reveal'),
    stats: $('daily-stats'),
    shareBtn: $('daily-share-btn'),
    shareStatus: $('daily-share-status'),
    countdown: $('daily-countdown'),
  };

  let config = null;
  let puzzle = null;
  let midis = [];
  let game = null;
  let pending = [];
  let manualReplayUsed = false; // one manual replay per turn; reset on each Guess
  let started = false; // has the first "Play the tune" tap unlocked + played audio?
  let countdownTimer = null;
  let practice = false; // sandbox round: fixed tune, no stats, no lock, no resume
  let narrationTimers = [];

  // ---- audio ----

  // Playback narration: name what's sounding — first "home" (the cadence, which
  // new players otherwise mistake for the puzzle), then the tune itself.
  function clearNarration() {
    for (const t of narrationTimers) clearTimeout(t);
    narrationTimers = [];
  }

  function narrate(melodySecs, endSecs) {
    el.status.hidden = false;
    el.status.textContent = '🏠 This is home — the key…';
    narrationTimers = [
      setTimeout(() => { el.status.textContent = '🎵 …and now the tune:'; }, melodySecs * 1000),
      setTimeout(() => { el.status.hidden = true; }, endSecs * 1000),
    ];
  }

  function playTune() {
    clearNarration();
    const t0 = piano.now;
    let t = t0 + 0.25;
    for (const chord of cadenceChords(puzzle.tonic, puzzle.mode)) t = piano.playChord(chord, t, 0.5) + 0.05;
    const melodyStart = t + 0.2;
    piano.playSequence(midis, melodyStart, 0.45, 0.08);
    if (game && !game.done) narrate(melodyStart - t0, melodyStart - t0 + midis.length * 0.53 + 0.3);
  }

  // ---- rendering ----

  function setMascot(stateName) {
    el.mascot.className = `mascot mascot-sm${stateName ? ` ${stateName}` : ''}`;
  }

  // rows: [{ guess?, marks }]; pendingRow shows the in-progress guess (live only).
  function renderBoard(rows, pendingRow, length, maxGuesses, mode, showNames) {
    const lanes = [];
    const submitted = rows.length;
    for (let r = 0; r < maxGuesses; r++) {
      const lane = document.createElement('div');
      lane.className = 'daily-lane';
      const row = rows[r];
      const isActive = !row && r === submitted;
      for (let c = 0; c < length; c++) {
        const cell = document.createElement('span');
        cell.className = 'daily-cell';
        if (row) {
          cell.classList.add(row.marks[c]);
          if (showNames && row.guess) cell.textContent = degName(row.guess[c], mode);
        } else if (isActive && pendingRow && pendingRow[c] !== undefined) {
          cell.classList.add('filled');
          cell.textContent = degName(pendingRow[c], mode);
        }
        lane.append(cell);
      }
      lanes.push(lane);
    }
    el.board.replaceChildren(...lanes);
  }

  // Lock the palette until the tune has been played (and audio unlocked); keep
  // any already-absent Degrees disabled.
  function setPaletteEnabled(on) {
    for (const b of el.palette.querySelectorAll('button')) {
      if (b.classList.contains('absent')) continue;
      b.disabled = !on;
    }
  }

  function buildPalette() {
    el.palette.replaceChildren(
      ...config.pool.map((d) => {
        const info = degreeInfo(d, config.mode);
        const btn = document.createElement('button');
        btn.className = 'degree-btn';
        btn.dataset.degree = String(d);
        const sign = HAND_SIGNS[d] ? `<span class="sign">${HAND_SIGNS[d]}</span>` : '';
        btn.innerHTML = `${sign}<span>${info.name}</span><span class="num">${info.label}</span>`;
        btn.addEventListener('click', () => tapDegree(d));
        return btn;
      }),
    );
  }

  // One manual replay per turn; the tune also auto-replays after every Guess.
  function updatePlayBtn() {
    el.playBtn.textContent = '🔁 Hear it again';
    el.playBtn.disabled = manualReplayUsed || game.done;
  }

  function refreshLive() {
    renderBoard(game.rows, pending, config.length, config.maxGuesses, config.mode, true);
  }

  // Grey out (and lock) any Degree this guess proved is absent from the tune.
  function lockAbsentDegrees(guess) {
    for (const d of new Set(guess.map(String))) {
      if (!game.isAbsent(d)) continue;
      const btn = el.palette.querySelector(`[data-degree="${d}"]`);
      if (btn) { btn.disabled = true; btn.classList.add('absent'); }
    }
  }

  // ---- interaction ----

  function tapDegree(d) {
    if (game.done || pending.length >= config.length) return;
    pending.push(d);
    // a reference pitch in the home octave — helps the ear compare
    if (piano.buffers.size) piano.playNote(degreeToMidi(puzzle.tonic, d, 0, puzzle.mode), piano.now + 0.02, 0.9, 0.95);
    setMascot(null);
    el.feedback.textContent = '';
    refreshLive();
    // The last note commits the guess — no Guess button, no take-backs.
    if (pending.length === config.length) submitGuess();
  }

  // Persist (or clear) today's committed guesses so re-entry resumes mid-game
  // rather than dealing a fresh board — see the resume logic in start().
  // Practice is a sandbox: nothing to persist.
  function saveProgress(guesses) {
    if (practice) return;
    const state = getState();
    state.daily ??= defaultDaily();
    state.daily.progress = guesses ? { day: config.day, guesses } : null;
    store.save(state);
  }

  function submitGuess() {
    const guess = pending;
    pending = [];
    game.submit(guess);
    refreshLive();
    lockAbsentDegrees(guess);
    if (game.done) { saveProgress(null); finish(); return; }
    saveProgress(game.rows.map((r) => [...r.guess]));
    el.feedback.textContent = `Guess ${game.guessesUsed} of ${config.maxGuesses} — keep listening`;
    setMascot(null);
    manualReplayUsed = false; // new turn → one manual replay again
    updatePlayBtn();
    if (piano.buffers.size) playTune(); // auto-replay the tune after each Guess
  }

  function replay() {
    if (manualReplayUsed || game.done) return;
    manualReplayUsed = true;
    updatePlayBtn();
    playTune();
  }

  // The play button's first job is to unlock audio (browsers need a tap) and play
  // the tune; after that it's the per-turn "Hear it again" replay.
  function onPlayButton() {
    if (started) { replay(); return; }
    startTune();
  }

  async function startTune() {
    el.playBtn.disabled = true;
    el.status.hidden = true;
    try {
      await piano.init(); // this tap is the gesture that unlocks the AudioContext
    } catch (err) {
      console.error(err);
      el.playBtn.disabled = false;
      el.status.hidden = false;
      el.status.textContent = 'Could not load the piano — tap “Play the tune” to retry.';
      return;
    }
    started = true;
    setPaletteEnabled(true);
    manualReplayUsed = false; // first turn still gets its one manual replay
    updatePlayBtn();
    playTune();
  }

  // ---- finishing ----

  function finish() {
    const result = game.result();
    clearNarration();

    // Practice never records stats or locks the day — celebrate (either way;
    // no-fail ethos), name the tune as the payoff, and hand over to the real
    // puzzle. The "fanfare" is the practice tune itself.
    if (practice) {
      if (!celebrate) { start(); return; } // no celebration screen wired → straight to today's
      const names = puzzle.degrees.map((d) => degName(d, puzzle.mode)).join(' · ');
      const fire = () => celebrate({
        title: result.solved ? `Practice solved in ${result.guesses}/${result.maxGuesses}! 🎉` : 'Good practice! 🦩',
        message: result.solved
          ? `That was “${PRACTICE_TUNE.title}”. Now try today's puzzle!`
          : `That was “${PRACTICE_TUNE.title}” — ${names}. Now try today's puzzle!`,
        fanfare: midis,
        buttonText: "Play today's puzzle",
        onContinue: () => start(),
      });
      if (piano.buffers.size) setTimeout(fire, 900);
      else fire();
      return;
    }

    const state = getState();
    if (!isPlayed(state.daily, config.day)) {
      state.daily = recordResult(state.daily ?? defaultDaily(), {
        day: config.day,
        solved: result.solved,
        guesses: result.guesses,
        maxGuesses: result.maxGuesses,
        rows: result.rows,
      });
      store.save(state);
      onFinished?.(); // growth hooks (review ask, reminders) — fire-and-forget
    }
    // A solve earns the level-clear celebration screen first, then the recap.
    // A soft-fail goes straight to the result (which reveals + plays the tune).
    if (result.solved && celebrate) {
      const max = result.maxGuesses;
      const fire = () => celebrate({
        title: `Solved in ${result.guesses}/${max}! 🎉`,
        message: 'Great ear — you heard the tune.',
        buttonText: 'See results',
        onContinue: () => { showScreen(el.screen); showResult(true); },
      });
      // The winning note (tapped to commit) is still ringing — let it play out
      // before swapping screens, so the celebration doesn't cut it off.
      if (piano.buffers.size) setTimeout(fire, 900);
      else fire();
    } else {
      showResult(true);
    }
  }

  function renderStats(daily, highlightGuesses, buckets) {
    const dist = daily.dist.slice(0, buckets); // only as many rows as the day has Guesses
    const max = Math.max(1, ...dist);
    const bars = dist
      .map((n, i) => {
        const pct = Math.round((n / max) * 100);
        const hot = highlightGuesses === i + 1 ? ' hot' : '';
        return `<div class="dist-row"><span class="dist-label">${i + 1}</span>`
          + `<span class="dist-bar${hot}" style="width:${Math.max(pct, n ? 8 : 2)}%">${n || ''}</span></div>`;
      })
      .join('');
    el.stats.innerHTML =
      `<div class="stat-figures">`
      + `<span><b>${daily.played}</b><small>played</small></span>`
      + `<span><b>${winPercent(daily)}%</b><small>solved</small></span>`
      + `<span><b>${daily.streak}</b><small>streak 🔥</small></span>`
      + `<span><b>${daily.maxStreak}</b><small>max streak</small></span>`
      + `</div>`
      + `<p class="dist-title">Guess distribution</p><div class="dist">${bars}</div>`;
  }

  function startCountdown() {
    const tick = () => {
      if (el.screen.hidden) { clearInterval(countdownTimer); countdownTimer = null; return; }
      const d = now();
      const next = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
      const ms = next - d;
      const h = String(Math.floor(ms / 3600000)).padStart(2, '0');
      const m = String(Math.floor((ms % 3600000) / 60000)).padStart(2, '0');
      const s = String(Math.floor((ms % 60000) / 1000)).padStart(2, '0');
      el.countdown.textContent = `Next puzzle in ${h}:${m}:${s}`;
    };
    clearInterval(countdownTimer);
    tick();
    countdownTimer = setInterval(tick, 1000);
  }

  // live=true right after finishing (we have the puzzle to reveal/play);
  // live=false on a locked re-entry (rebuild from stored stats only).
  function showResult(live) {
    clearNarration();
    const today = getState().daily.today;
    const max = today.maxGuesses ?? config?.maxGuesses ?? today.rows.length;
    el.status.hidden = true;
    el.play.hidden = true;
    el.palette.hidden = true;
    el.mascotStage.hidden = true;
    el.result.hidden = false;
    el.board.classList.add('recap'); // shrink the grid to a compact recap

    renderBoard(today.rows.map((marks) => ({ marks })), null, today.rows[0]?.length ?? config?.length ?? 0, today.rows.length, 'major', false);

    if (today.solved) {
      el.resultTitle.textContent = `Solved in ${today.guesses}/${max}! 🎉`;
      el.reveal.hidden = true;
    } else {
      el.resultTitle.textContent = `X/${max} — heard it out 🦩`;
      if (live && puzzle) {
        el.reveal.hidden = false;
        el.reveal.textContent = `The tune was  ${puzzle.degrees.map((d) => degName(d, puzzle.mode)).join(' · ')}`;
        playTune();
      } else {
        el.reveal.hidden = true;
      }
    }

    renderStats(getState().daily, today.solved ? today.guesses : null, max);
    startCountdown();
  }

  function shareResult() {
    const today = getState().daily.today;
    const text = buildShareText({
      day: today.day, solved: today.solved, guesses: today.guesses,
      maxGuesses: today.maxGuesses ?? today.rows.length, rows: today.rows,
    });
    const done = () => { el.shareStatus.textContent = 'Copied to clipboard ✓'; };
    if (navigator.share) {
      navigator.share({ text }).catch(() => navigator.clipboard?.writeText(text).then(done));
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(done, () => { el.shareStatus.textContent = text; });
    } else {
      el.shareStatus.textContent = text;
    }
  }

  // ---- lifecycle ----

  async function start() { enter(false); }
  function startPractice() { enter(true); }

  function enter(isPractice) {
    practice = isPractice;
    clearNarration();
    config = practice ? practiceConfig() : dailyConfig(now());
    el.title.textContent = practice ? 'Practice' : `Daily #${config.day}`;
    el.sub.textContent = practice
      ? `${config.length} notes · ${config.pool.length} possible · a tune you might know`
      : `${config.length} notes · ${config.pool.length} possible · guess the tune`;
    el.shareStatus.textContent = '';
    el.feedback.textContent = practice ? 'No streaks here — a friendly tune to learn the ropes on.' : '';
    el.reveal.hidden = true;
    setMascot(null);

    const state = getState();
    state.daily ??= defaultDaily();

    // Already finished today's puzzle → locked result view, no audio needed.
    if (!practice && isPlayed(state.daily, config.day)) {
      el.play.hidden = true; el.palette.hidden = true; el.mascotStage.hidden = true;
      puzzle = null;
      showScreen(el.screen);
      showResult(false);
      return;
    }

    // Fresh puzzle — show the board immediately, warm the piano, then auto-play.
    puzzle = practice ? practiceMelody() : generateMelody(seededRng(config.seed), config);
    midis = melodyMidis(puzzle);
    game = DAILY_GAMES[config.gameId]({ target: puzzle.degrees, maxGuesses: config.maxGuesses });
    pending = [];
    manualReplayUsed = false;
    started = false;

    // Resume any guesses already made today. Daily is one attempt per day, so
    // leaving or reloading must NOT hand back a clean board — that's a free retry.
    // Audio still needs a fresh user gesture, so the tune re-unlocks on Play; only
    // the committed guesses (and the spent guess count) are restored.
    // (Practice has no stakes, so it always deals fresh.)
    const saved = state.daily.progress;
    if (!practice && saved && saved.day === config.day) {
      for (const g of saved.guesses) { if (!game.done) game.submit(g); }
    }

    el.result.hidden = true;
    el.board.classList.remove('recap');
    el.play.hidden = false; el.palette.hidden = false; el.mascotStage.hidden = false;
    // Practice entry point: hidden while practising; extra-inviting before the
    // player's first-ever Daily (this game is hard cold — see the tutorial ask).
    el.practiceBtn.hidden = practice;
    el.practiceBtn.textContent = state.daily.played === 0 ? '🎓 New? Try a practice tune' : '🎓 Practice tune';
    buildPalette();
    setPaletteEnabled(false); // wait for the first tap (which unlocks audio + plays)
    for (const row of game.rows) lockAbsentDegrees(row.guess); // re-grey proven-absent degrees
    refreshLive();
    if (game.guessesUsed) {
      el.feedback.textContent = `Guess ${game.guessesUsed + 1} of ${config.maxGuesses} — tap Play to hear it again`;
    }
    showScreen(el.screen);

    // The tune can't auto-play — browsers block audio until a user gesture. So the
    // first tap on this button both unlocks the AudioContext and plays the tune.
    el.status.hidden = true;
    el.playBtn.disabled = false;
    el.playBtn.textContent = '▶ Play the tune';
  }

  function stop() {
    clearInterval(countdownTimer);
    countdownTimer = null;
    clearNarration();
    piano.stopAll?.();
  }

  // Leaving is safe: today's guesses persist (saveProgress) and resume on
  // re-entry, so no confirm is needed.
  el.back?.addEventListener('click', () => { stop(); goHome(); });
  el.playBtn.addEventListener('click', () => onPlayButton());
  el.practiceBtn.addEventListener('click', () => startPractice());
  el.shareBtn.addEventListener('click', () => shareResult());

  return { start, stop };
}
