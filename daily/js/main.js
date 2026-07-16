// UI glue: tutorial → level map → (cadence → note → answer → resolution)* → clear.
// The Question lifecycle itself lives in the Round module; main wires it to
// the DOM (view adapter), the Piano (audio), and setTimeout (clock).
import { degreeToMidi, resolutionPath, cadenceChords, degreeInfo } from './theory.js';
import { Piano } from './audio.js';
import { createBar, createSession } from './quiz.js';
import { createWarmup, WARMUP_ADVANCE_STREAK } from './warmup.js';
import { createQuizMode } from './quiz-mode.js';
import { createGameView } from './view.js';
import { MEET_BLURBS, tutorialSteps, levelMeetSteps, MeetSequence } from './meet.js';
import { Store } from './store.js';
import { createDurableStorage } from './durable-storage.js';
import { LEVELS, getLevel } from './levels.js';
import { createDaily } from './daily/ui.js';
import { createSprint } from './daily/ui-sprint.js';
import { createPicker } from './daily/ui-picker.js';
import { defaultDaily, playedAnyToday } from './daily/stats.js';
import { dayNumber } from './daily/schedule.js';
import { maybeRequestReview } from './growth/review.js';
import { offerNotifications, syncNotifications, toggleNotifications } from './growth/notifications.js';
import { THEORY } from './content.js';
import { FLAMINGO } from './art.js';
import { VERSION } from './version.js';

const piano = new Piano();
// On native iOS, back the store with durable Preferences storage (see
// durable-storage.js). Top-level await keeps boot ordering: hydrate before load.
const store = new Store(await createDurableStorage());
let state = store.load();

let level = null;
let session = null;
let bar = null;
let tonic = 60;
let mode = 'major';
let activeMode = 'learn'; // which top-level Mode is running: 'learn' | 'warmup' | 'daily'

// setTimeout/clearTimeout behind the clock interface the Round schedules against
const clock = {
  schedule: (ms, cb) => setTimeout(cb, ms),
  cancel: (handle) => clearTimeout(handle),
};

const el = {
  tabbar: document.getElementById('tabbar'),
  tabLearn: document.getElementById('tab-learn'),
  tabDaily: document.getElementById('tab-daily'),
  tabWarmup: document.getElementById('tab-warmup'),
  dailyScreen: document.getElementById('daily-screen'),
  pickerScreen: document.getElementById('picker-screen'),
  sprintScreen: document.getElementById('sprint-screen'),
  dailyHelpBtn: document.getElementById('daily-help-btn'),
  dailyHelpDialog: document.getElementById('daily-help-dialog'),
  dailyHelpClose: document.getElementById('daily-help-close'),
  warmupStatus: document.getElementById('warmup-status'),
  clearTitle: document.getElementById('clear-title'),
  homeScreen: document.getElementById('home-screen'),
  quizScreen: document.getElementById('quiz-screen'),
  clearScreen: document.getElementById('clear-screen'),
  meetScreen: document.getElementById('meet-screen'),
  journey: document.getElementById('journey'),
  levelList: document.getElementById('level-list'),
  menuBtn: document.getElementById('menu-btn'),
  menuPopover: document.getElementById('menu-popover'),
  menuScrim: document.getElementById('menu-scrim'),
  menuTutorial: document.getElementById('menu-tutorial'),
  menuHow: document.getElementById('menu-how'),
  menuReset: document.getElementById('menu-reset'),
  aboutScreen: document.getElementById('about-screen'),
  aboutBackBtn: document.getElementById('about-back-btn'),
  menuNotes: document.getElementById('menu-notes'),
  notesScreen: document.getElementById('notes-screen'),
  notesBackBtn: document.getElementById('notes-back-btn'),
  notesList: document.getElementById('notes-list'),
  versionTag: document.getElementById('version-tag'),
  theoryBackBtn: document.getElementById('theory-back-btn'),
  loadStatus: document.getElementById('load-status'),
  loadError: document.getElementById('load-error'),
  homeBtn: document.getElementById('home-btn'),
  levelTitle: document.getElementById('level-title'),
  prompt: document.getElementById('prompt'),
  degrees: document.getElementById('degree-buttons'),
  feedback: document.getElementById('feedback'),
  barFill: document.getElementById('bar-fill'),
  clearMessage: document.getElementById('clear-message'),
  replayNoteBtn: document.getElementById('replay-note-btn'),
  replayCadenceBtn: document.getElementById('replay-cadence-btn'),
  backspaceBtn: document.getElementById('backspace-btn'),
  slots: document.getElementById('answer-slots'),
  walk: document.getElementById('walk'),
  meetWalk: document.getElementById('meet-walk'),
  nextLevelBtn: document.getElementById('next-level-btn'),
  mapBtn: document.getElementById('map-btn'),
  meetTitle: document.getElementById('meet-title'),
  meetBody: document.getElementById('meet-body'),
  meetStage: document.getElementById('meet-stage'),
  meetNextBtn: document.getElementById('meet-next-btn'),
  meetSkipBtn: document.getElementById('meet-skip-btn'),
  meetHelp: document.getElementById('meet-help'),
  theoryScreen: document.getElementById('theory-screen'),
  theoryTitle: document.getElementById('theory-title'),
  theoryBody: document.getElementById('theory-body'),
  theoryNextBtn: document.getElementById('theory-next-btn'),
  homeMascot: document.getElementById('home-mascot'),
  quizMascot: document.getElementById('quiz-mascot'),
  clearMascot: document.getElementById('clear-mascot'),
};

const dailyMascots = ['daily-mascot', 'sprint-mascot', 'picker-mascot'].map((id) => document.getElementById(id));
for (const m of [el.homeMascot, el.quizMascot, el.clearMascot, ...dailyMascots]) m.innerHTML = FLAMINGO;

// Daily-only flavor — www.doremingo.com serves just the Daily under /daily/;
// Learn and Warmup are the app's side of the deal (see site/index.html).
//
// Read from a stamped tag (index.html), not guessed from the URL. The old
// guess — an http protocol plus a /daily prefix on the pathname — only worked
// while routes lived in the hash, so the pathname never moved. Now that
// /daily/sprint/ is a real route, the deploy and the route are indistinguishable
// by URL, and the full app would strip its own Learn on a refresh under /daily/.
// The deploy knows what it is; it should say so rather than be deduced.
//
// Declared up here because the Daily controllers below read it at construction,
// not just inside callbacks — a `const` used before its line throws.
const DAILY_ONLY =
  document.querySelector('meta[name="deploy"]')?.content === 'daily-only';

// The DOM adapter the Round drives, and the meet/notes screens reuse.
const view = createGameView(el);

// The shared quiz engine. Owns the active Round and the quiz-screen controls;
// Learn and Warmup hand it Stages to run (see CONTEXT.md: Stage).
const quizMode = createQuizMode({ piano, view, clock, el, showScreen });

// Web-only dev affordances for testing daily puzzles (ignored on native iOS):
//   ?currentDate=2026-06-30 — generate that day's puzzle instead of today's
//   ?resetDaily=true        — wipe stored daily progress, unlocking today
const dailyDevOpts = (() => {
  if (window.Capacitor?.isNativePlatform?.()) return {};
  const params = new URLSearchParams(location.search);
  if (params.get('resetDaily') === 'true') {
    state = { ...state, daily: defaultDaily() };
    store.save(state);
  }
  const forced = params.get('currentDate');
  if (forced && !Number.isNaN(new Date(`${forced}T12:00:00`).getTime())) {
    return { now: () => new Date(`${forced}T12:00:00`) }; // local noon — avoids TZ edges
  }
  return {};
})();

// Growth hooks after a finished daily (iOS app only; both no-op on web).
// Delayed so the celebration / result view lands first — the reminder offer
// and the review sheet should read as a postscript, not an interruption.
function onDailyFinished() {
  setTimeout(async () => {
    await offerNotifications({ state, store });
    await syncNotifications({ state, store, playedToday: true });
    await maybeRequestReview({ state, store });
  }, 2000);
}

// Daily is a shelf of games (ADR-0004). Each game runs its own controller (its
// own brain + DOM), like a mini-app; the picker is the shelf they sit on. A
// game's back button returns to the picker, and the picker's returns to Learn.
const daily = createDaily({
  piano,
  store,
  getState: () => state,
  showScreen,
  goHome: () => openPicker(),
  openGame: (gameId) => openDailyGame(gameId),
  celebrate,
  onFinished: onDailyFinished,
  ...dailyDevOpts,
});

const sprint = createSprint({
  piano,
  store,
  getState: () => state,
  showScreen,
  goBack: () => openPicker(),
  openGame: (gameId) => openDailyGame(gameId),
  celebrate,
  onFinished: onDailyFinished,
  ...dailyDevOpts,
});

const dailyGames = { melody: daily, sprint };

const picker = createPicker({
  getState: () => state,
  showScreen,
  goBack: () => goLearn(),
  openGame: (gameId) => openDailyGame(gameId),
  canGoBack: !DAILY_ONLY, // the /daily/ deploy has no Learn behind it
  ...dailyDevOpts,
});

// What the two clear-screen buttons do for the current celebration. `primary`
// is the main button (mapBtn); `next` is the optional second button (nextLevelBtn,
// e.g. "Next level" on a Learn clear). Cleared when we leave the clear screen.
let clearActions = null;

// The one celebration screen, shared by every Mode: party mascot, confetti, a
// fanfare, and one or two buttons. Callers vary only the copy, the fanfare notes
// (default Do-Mi-Sol-Do in C — Daily has no active key), and the button actions.
function celebrate({ title, message, fanfare, onNext, buttonText, onContinue }) {
  el.clearTitle.textContent = title;
  el.clearMessage.textContent = message;
  el.nextLevelBtn.hidden = !onNext;
  el.mapBtn.textContent = buttonText;
  clearActions = { next: onNext ?? null, primary: onContinue };
  showScreen(el.clearScreen);
  confettiBurst();
  piano.playSequence(fanfare ?? [60, 64, 67, 72], piano.now + 0.2, 0.18, 0.03);
}

function confettiBurst() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const colors = ['#ff5d8f', '#ffd166', '#06d6a0', '#4cc9f0', '#7b6cf6'];
  for (let i = 0; i < 50; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    piece.style.left = `${Math.random() * 100}vw`;
    piece.style.background = colors[i % colors.length];
    piece.style.animationDuration = `${1.8 + Math.random() * 1.6}s`;
    piece.style.animationDelay = `${Math.random() * 0.5}s`;
    document.body.append(piece);
    setTimeout(() => piece.remove(), 4200);
  }
}

function showScreen(screen) {
  for (const s of [el.homeScreen, el.quizScreen, el.clearScreen, el.meetScreen, el.theoryScreen, el.aboutScreen, el.notesScreen, el.dailyScreen, el.pickerScreen, el.sprintScreen]) {
    s.hidden = s !== screen;
  }
  // The bottom tab bar belongs to the mode roots only; immersive play (quiz,
  // tutorial, theory, clear, about, notes, warmup) takes the full screen.
  syncTabBar(screen);
  // The clear-screen button actions only make sense on the clear screen.
  if (screen !== el.clearScreen) clearActions = null;
  // Leaving a Daily game's screen tears down its countdown/clock + pending audio.
  if (screen !== el.dailyScreen) daily.stop();
  if (screen !== el.sprintScreen) sprint.stop();
  // Hard-close the menu on every switch — no leftover wobble when home reappears.
  // The scrim must go too: it's a full-screen overlay, and since it's hidden via
  // the popover's animationend, a mid-animation screen switch would orphan it
  // over the new screen and swallow every tap.
  for (const m of menus) m.forceClose();
}

// Audio load can fail (e.g. samples unreachable). Surface it on a banner that
// floats above any screen and retries on tap — never leave the user on a dead
// button with a swallowed rejection.
function showLoadError(retry) {
  el.loadError.textContent = 'Could not load the piano — tap to retry 🔁';
  el.loadError.hidden = false;
  el.loadError.onclick = () => {
    hideLoadError();
    retry();
  };
}

function hideLoadError() {
  el.loadError.hidden = true;
  el.loadError.onclick = null;
}

// ---------- routing ----------
// Real paths, never hashes:
//   /  ·  /tutorial  ·  /level/3  ·  /about  ·  /notes  ·  /warmup
//   /daily/  ·  /daily/melody/  ·  /daily/sprint/
//
// Why paths cost nothing here and buy a lot: a URL fragment is never sent to a
// server, so #/sprint made every shared game unfurl the same link preview
// (js/daily/share.js). A path is a real address a crawler can fetch.
//
// Both hosts serve these without a client-side redirect, by different means:
//   · GitHub Pages — bin/publish-web.sh stamps a real index.html per Daily
//     route. (Pages has no rewrite rules, and its 404.html fallback answers
//     with an HTTP 404, which link unfurlers refuse — hence real files.)
//   · Capacitor iOS — its Router serves the app shell for ANY extensionless
//     path, i.e. the rewrite rule Pages won't give us. No per-route files.
//
// The pathnames are identical on both, so this is one router, not two. Assets
// stay relative to a per-deploy <base> (index.html), which is what differs:
// '/daily/' on Pages, '/' in the app.

let currentRoute = null;

/** Route key for a path: trailing slash trimmed, so '/daily/' === '/daily'. */
function routeOf(pathname = location.pathname) {
  return pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
}

function setRoute(route) {
  currentRoute = routeOf(route);
  // Compare canonically: pushing '/daily/' while already on '/daily' is not a
  // navigation, and stacking it would make Back a no-op the user has to press twice.
  if (routeOf() === currentRoute) return;
  // Carry the query string across. Unlike a hash write, pushState replaces the
  // whole URL — so dropping it here would quietly strip ?currentDate= the
  // moment the player navigated, and the dev flags would only work until the
  // first tap. They are read once at boot, so they must survive every route.
  history.pushState(null, '', route + location.search);
}

// Tear down an active round when leaving the quiz screen.
function leaveQuiz() {
  quizMode.stop();
}

// The tab bar lives on the Learn map only — the app's home and mode launcher.
// Daily and Warmup are focused activities you enter and intentionally leave
// (Daily confirms before discarding an in-progress puzzle), so they take the
// full screen with their own back button rather than carrying the bar.
function syncTabBar(screen) {
  const onHome = screen === el.homeScreen;
  el.tabbar.hidden = !onHome;
  el.tabLearn.classList.toggle('active', onHome);
  if (onHome) el.tabLearn.setAttribute('aria-current', 'page');
  else el.tabLearn.removeAttribute('aria-current');
}

// Daily mode — the shelf. Entering Daily lands on the picker; each game is a
// sub-route beneath it, so a shared link opens the game it was shared from.
function startDaily() {
  openPicker();
}

// One spelling per route now, on both deploys. The /daily/ web build used to
// need a short '#/sprint' alias because its whole site was Daily; under paths
// its site root IS /daily/, so the app's own route is already the right URL.
function openPicker() {
  leaveQuiz();
  activeMode = 'daily';
  setRoute('/daily/');
  picker.start();
}

function openDailyGame(gameId) {
  leaveQuiz();
  activeMode = 'daily';
  setRoute(`/daily/${gameId}/`);
  dailyGames[gameId].start();
}

// The Learn level map — the app's home root.
function goLearn() {
  activeMode = 'learn';
  leaveQuiz();
  setRoute('/learn');
  renderHome();
  showScreen(el.homeScreen);
}

/**
 * Open a level from a link or back/forward. If audio isn't unlocked yet
 * (fresh page load), gate behind the theory card — its button is the
 * user gesture that lets the piano start.
 */
function openLevelFromLink(id) {
  if (piano.ctx?.state === 'running') {
    startLevel(id);
    return;
  }
  if (!state.seenTheory.includes(id) && THEORY[id]) {
    state.seenTheory = [...state.seenTheory, id];
    store.save(state);
  }
  showTheory(id, () => startLevel(id));
}

function openAbout() {
  setRoute('/about');
  showScreen(el.aboutScreen);
}

// Notes reference needs live audio, but is reachable without a level/tutorial —
// so unlock the piano here (the menu tap / route entry is the user gesture).
async function openNotes() {
  setRoute('/notes');
  renderNotesReference();
  showScreen(el.notesScreen);
  try {
    await piano.init();
    hideLoadError();
  } catch (err) {
    console.error(err);
    showLoadError(() => openNotes());
  }
}

/** Which Daily game a path names, if any. */
function dailyGameFromPath(route) {
  const m = route.match(/^\/daily\/(melody|sprint)$/);
  return m ? m[1] : null;
}

function applyRoute() {
  const route = routeOf();
  // The /daily/ deploy is Daily-only: no Learn, no Warmup, so every route here
  // is either a game or the picker. Anything else lands on the shelf rather
  // than 404ing — a stale or mistyped link should still give you something.
  if (DAILY_ONLY) {
    const game = dailyGameFromPath(route);
    if (game) openDailyGame(game);
    else openPicker();
    return;
  }
  const levelMatch = route.match(/^\/level\/(\d+)$/);
  if (levelMatch && getLevel(Number(levelMatch[1]))) {
    setRoute(route);
    openLevelFromLink(Number(levelMatch[1]));
    return;
  }
  if (route === '/tutorial') {
    setRoute('/tutorial');
    startTutorial();
    return;
  }
  if (route === '/about') { openAbout(); return; }
  if (route === '/notes') { openNotes(); return; }
  if (route === '/warmup') { switchMode('warmup'); return; }
  const dailyGame = dailyGameFromPath(route);
  if (dailyGame) { openDailyGame(dailyGame); return; }
  if (route === '/daily') { switchMode('daily'); return; }
  if (route === '/learn') { switchMode('learn'); return; }
  if (state.tutorialDone) goLearn();
  else startTutorial();
}

// Back/forward. pushState does not fire this — only real history moves do — so
// unlike the old hashchange listener there is no self-navigation to filter out.
window.addEventListener('popstate', () => applyRoute());

// ---------- home / level map ----------

function renderHome() {
  const cleared = state.clearedLevels.length;
  el.journey.textContent = cleared
    ? `${cleared} of ${LEVELS.length} levels cleared`
    : 'Pick a level — Home base is a great start';

  el.levelList.replaceChildren(
    ...LEVELS.map((l) => {
      const isCleared = state.clearedLevels.includes(l.id);
      const isCurrent = state.currentLevel === l.id && !isCleared;
      const card = document.createElement('div');
      card.className = `level-card${isCleared ? ' cleared' : ''}${isCurrent ? ' current' : ''}`;

      const main = document.createElement('button');
      main.className = 'level-main';
      main.innerHTML = `
        <span class="badge">${isCleared ? '⭐' : l.id}</span>
        <span>
          <span class="level-name">${l.name}</span><br>
          <span class="level-sub">${l.subtitle}</span>
        </span>`;
      main.addEventListener('click', () => startLevel(l.id));

      const book = document.createElement('button');
      book.className = 'book-btn';
      book.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 6c-1.6-1-3.8-1.5-6-1.5S3 5 3 5v13c0 0 1-1 3-1s4.4.6 6 1.6"/><path d="M12 6c1.6-1 3.8-1.5 6-1.5S21 5 21 5v13c0 0-1-1-3-1s-4.4.6-6 1.6"/><path d="M12 6v12.6"/></svg>';
      book.title = 'Read the theory';
      book.setAttribute('aria-label', `theory for ${l.name}`);
      book.addEventListener('click', () => showTheory(l.id, goLearn));

      card.append(main, book);
      return card;
    }),
  );
}

// ---------- theory explainers ----------

let theoryOnDone = null;

function showTheory(levelId, onDone) {
  const entry = THEORY[levelId];
  if (!entry) {
    onDone();
    return;
  }
  el.theoryTitle.textContent = entry.title;
  el.theoryBody.replaceChildren(
    ...entry.paragraphs.map((p) => {
      const para = document.createElement('p');
      para.textContent = p;
      return para;
    }),
  );
  theoryOnDone = onDone;
  showScreen(el.theoryScreen);
}

// ---------- meet / tutorial ----------
// Step data and the pure cursor live in meet.js; main renders each step and
// handles the audio-unlock on the first tutorial step.

let meet = null; // the active MeetSequence, or null
let meetOnDone = null;

function buildStageButton(degree, withResolution, stageTonic = 60, stageMode = 'major') {
  const info = degreeInfo(degree, stageMode);
  const btn = document.createElement('button');
  btn.className = 'degree-btn';
  btn.dataset.degree = String(degree);
  btn.innerHTML = `<span>${info.name}</span><span class="num">${info.label}</span>`;
  btn.addEventListener('click', () => {
    const midi = degreeToMidi(stageTonic, degree, 0, stageMode);
    if (withResolution) {
      const path = resolutionPath(stageTonic, midi, stageMode);
      piano.playSequence(path, piano.now + 0.05, 0.5);
      view.showWalk(path, 0.05, {
        walkEl: el.meetWalk,
        withButtons: false,
        walkTonic: stageTonic,
        walkMode: stageMode,
        noteDuration: 0.5,
      });
    } else {
      piano.playNote(midi, piano.now + 0.05, 1.2, 0.95);
    }
  });
  return btn;
}

// ---------- notes reference ----------
// Every named note in major, each with its tap-to-hear squircle + blurb.
const NOTE_REFERENCE = [1, 2, 3, 4, 5, 6, 7, 'fi', 'te'];

function buildNoteRow(d) {
  const midi = degreeToMidi(60, d, 0, 'major');
  const info = degreeInfo(d, 'major');

  const row = document.createElement('div');
  row.className = 'note-row';

  const slot = document.createElement('div');
  slot.className = 'note-slot';
  const btn = document.createElement('button');
  btn.className = 'degree-btn';
  btn.dataset.degree = String(d);
  btn.innerHTML = `<span>${info.name}</span><span class="num">${info.label}</span>`;
  btn.addEventListener('click', () => {
    if (!piano.buffers.size) return; // samples not loaded yet
    piano.playNote(midi, piano.now + 0.05, 1.2, 0.95);
  });
  slot.append(btn);

  const text = document.createElement('div');
  text.className = 'note-text';
  const desc = document.createElement('p');
  desc.className = 'note-desc';
  desc.textContent = MEET_BLURBS[d];

  // The "Walk home →" link is itself swapped for the lighting note names.
  const walkSlot = document.createElement('div');
  walkSlot.className = 'walk-slot';
  const walk = document.createElement('button');
  walk.className = 'walk-link';
  walk.textContent = 'Walk home →';
  walk.addEventListener('click', () => {
    if (!piano.buffers.size) return; // samples not loaded yet
    const path = resolutionPath(60, midi, 'major');
    piano.playSequence(path, piano.now + 0.05, 0.5);
    view.showWalk(path, 0.05, { walkEl: walkSlot, withButtons: false, walkTonic: 60, walkMode: 'major', noteDuration: 0.5 });
    const totalMs = (0.05 + path.length * 0.55) * 1000 + 150;
    setTimeout(() => walkSlot.replaceChildren(walk), totalMs);
  });
  walkSlot.append(walk);
  text.append(desc, walkSlot);

  row.append(slot, text);
  return row;
}

function renderNotesReference() {
  el.notesList.replaceChildren(...NOTE_REFERENCE.map(buildNoteRow));
}

function renderMeetStep() {
  const s = meet.current;
  el.meetTitle.textContent = s.title;
  el.meetBody.textContent = s.body;
  el.meetNextBtn.textContent = s.nextLabel ?? 'Next';
  el.meetSkipBtn.hidden = meet.isLast; // last step ("Ready to play!") needs no skip/close

  el.meetStage.replaceChildren(
    ...(s.stage ? [buildStageButton(s.stage, s.resolve, s.tonic ?? 60, s.mode ?? 'major')] : []),
  );
  el.meetWalk.replaceChildren();
  el.meetHelp.hidden = !s.helpHtml;
  el.meetHelp.innerHTML = s.helpHtml ?? '';
  if (s.sound === 'cadence') {
    let t = piano.now + 0.3;
    for (const chord of cadenceChords(s.tonic ?? 60)) {
      t = piano.playChord(chord, t, 0.55) + 0.05;
    }
  }
}

function runMeet(steps, onDone, skipLabel = 'Skip') {
  meet = new MeetSequence(steps);
  meetOnDone = onDone;
  el.meetSkipBtn.textContent = skipLabel;
  renderMeetStep();
  showScreen(el.meetScreen);
}

async function meetNext(skipped = false) {
  const s = meet.current;
  if (s.initAudio && !skipped) {
    el.meetNextBtn.disabled = true;
    try {
      await piano.init();
      hideLoadError();
    } catch (err) {
      console.error(err);
      showLoadError(() => meetNext(false)); // retry this same step
      return;
    } finally {
      el.meetNextBtn.disabled = false;
    }
  }
  if (skipped) {
    meetOnDone(true);
    return;
  }
  const { done } = meet.next();
  if (done) meetOnDone(false);
  else renderMeetStep();
}

function startTutorial() {
  setRoute('/tutorial');
  runMeet(tutorialSteps(), (skipped) => {
    state.tutorialDone = true;
    state.metNotes = [...new Set([...state.metNotes, 1, 3, 5])];
    store.save(state);
    if (skipped) goLearn();
    else startLevel(1);
  }, 'Skip tutorial');
}


function persist() {
  store.save({ ...state, currentLevel: level.id, bar: bar.value });
}

function levelCleared() {
  if (!state.clearedLevels.includes(level.id)) {
    state.clearedLevels = [...state.clearedLevels, level.id];
  }
  state.bar = null;
  store.save({ ...state, currentLevel: level.id, bar: null });

  const next = getLevel(level.id + 1);
  const clearedId = level.id;
  celebrate({
    title: 'Level cleared! 🎉',
    message: next
      ? `Your ear is getting sharper. Next up: ${next.name} 🦩`
      : 'You cleared every level — what an ear! 🦩',
    fanfare: [tonic, tonic + (mode === 'minor' ? 3 : 4), tonic + 7, tonic + 12],
    onNext: next ? () => startLevel(clearedId + 1) : null,
    buttonText: 'All levels',
    onContinue: goLearn,
  });
}

function enterQuiz() {
  quizMode.runStage({
    level, session, bar, tonic, mode,
    title: `Level ${level.id} — ${level.name}`,
    showBackspace: (level.sequenceLength ?? 1) !== 1,
    barView: { value: bar.value, size: bar.size },
    onPersist: (round) => { bar = round.bar; persist(); },
    onCleared: levelCleared,
  });
}

async function startLevel(id) {
  setRoute(`/level/${id}`);
  el.loadStatus.hidden = false;
  el.loadStatus.textContent = 'Warming up the piano…';
  try {
    await piano.init((loaded, total) => {
      el.loadStatus.textContent = `Warming up the piano… ${loaded}/${total}`;
    });
    hideLoadError();
  } catch (err) {
    console.error(err);
    el.loadStatus.hidden = true;
    showLoadError(() => startLevel(id)); // banner floats over any screen, unlike loadStatus
    return;
  }
  el.loadStatus.hidden = true;

  activeMode = 'learn';
  warmup = null;
  level = getLevel(id);
  session = createSession(level);
  mode = level.mode ?? 'major';
  tonic = level.keyPool === 'random'
    ? 55 + Math.floor(Math.random() * 12) // G3-F#4 — keeps wide octaves in sample range
    : level.tonic;
  const resumeBar = state.currentLevel === id ? state.bar ?? 0 : 0;
  bar = createBar(level.barSize, resumeBar);
  state.currentLevel = id;
  persist();

  const maybeMeet = () => {
    const unmet = (level.newDegrees ?? []).filter((d) => !state.metNotes.includes(d));
    if (unmet.length) {
      state.metNotes = [...new Set([...state.metNotes, ...unmet])];
      store.save(state);
      runMeet(levelMeetSteps(unmet, tonic, mode), () => enterQuiz());
    } else {
      enterQuiz();
    }
  };

  if (!state.seenTheory.includes(id) && THEORY[id]) {
    state.seenTheory = [...state.seenTheory, id];
    store.save(state);
    showTheory(id, maybeMeet);
  } else {
    maybeMeet();
  }
}

// ---------- warmup ----------
// A short, transient ear-calibration ramp: a playlist of Stages, each its own
// Round over a growing Degree pool. A Stage's Bar resets on a miss (drain:
// Infinity), so it clears on a WARMUP_ADVANCE_STREAK-in-a-row; clearing one
// Stage runs the next. Nothing is persisted — it resets every time it is entered.

let warmup = null; // the Warmup playlist brain while a warmup runs, else null
let warmupCapped = false; // the question cap was hit — finish after this resolution

async function startWarmup() {
  setRoute('/warmup');
  el.warmupStatus.hidden = false;
  el.warmupStatus.textContent = 'Warming up the piano…';
  try {
    await piano.init((loaded, total) => {
      el.warmupStatus.textContent = `Warming up the piano… ${loaded}/${total}`;
    });
    hideLoadError();
  } catch (err) {
    console.error(err);
    el.warmupStatus.hidden = true;
    showLoadError(() => startWarmup()); // banner floats over any screen
    return;
  }
  el.warmupStatus.hidden = true;

  activeMode = 'warmup';
  warmup = createWarmup();
  warmupCapped = false;
  runWarmupStage();
}

// Run the current playlist Stage. Each Stage is a fresh Round over the brain's
// current Degree pool, cleared by a streak (the reset-on-miss Bar IS the streak).
function runWarmupStage() {
  const stageLevel = { id: 'warmup', name: 'Warmup', degrees: warmup.pool, cadenceEvery: 1, tonic: 60 };
  quizMode.runStage({
    level: stageLevel,
    session: createSession(stageLevel),
    bar: createBar(WARMUP_ADVANCE_STREAK, 0, { drain: Infinity }),
    tonic: 60,
    mode: 'major',
    title: 'Warmup 🔥',
    showBackspace: false,
    barView: { value: 0, size: WARMUP_ADVANCE_STREAK }, // progress to the next note
    onPersist: (round) => {
      // The question cap is the safety net. Once reached, force the Bar full so
      // the current resolution still plays and then advance() ends the run via
      // onCleared — but only if the answer didn't already clear the Stage on its
      // own (a full streak Bar, which onCleared then handles normally).
      if (warmup.countQuestion()) {
        warmupCapped = true;
        if (round.bar.value < round.bar.size) round.bar = createBar(1, 1);
      }
    },
    onCleared: (round) => {
      // A Stage cleared by a real streak keeps its WARMUP_ADVANCE_STREAK-sized
      // Bar; a cap-forced finish has the tiny createBar(1, 1). So a streak that
      // completes the top Stage on the very last allowed Question still counts
      // as 'completed' — completion wins over the cap, as it always has.
      const clearedByStreak = round.bar.size === WARMUP_ADVANCE_STREAK;
      if (clearedByStreak) {
        const next = warmup.advance();
        if (next.done) { finishWarmup('completed'); return; }
        if (!warmupCapped) { runWarmupStage(); return; } // next mini-level
      }
      finishWarmup('cap');
    },
  });
}

function finishWarmup(reason) {
  quizMode.stop();
  warmup = null;
  celebrate({
    title: 'Warmed up!',
    message: reason === 'completed'
      ? 'Your ear is tuned up — ready for a real session.'
      : 'Nice warmup — your ear is awake. Keep it going in Learn!',
    // default fanfare is Do-Mi-Sol-Do in C — Warmup is always in C
    buttonText: 'Back',
    onContinue: goLearn,
  });
}

// ---------- wiring ----------

el.versionTag.textContent = `v${VERSION}`;

// ---------- pop-over menu (burger on the Learn map) ----------

const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Where a menu-launched page (How it works / Note reference) returns to.
// Set when a page opens; the burger's pages return to the Learn map, the
// Daily help button returns to Daily.
let pageReturn = goLearn;

const menus = [];

// Wire one trigger button to its popover + scrim. iOS-style spring open,
// animated close, opening one closes the others. Returns a handle so screen
// switches can hard-close it (see showScreen).
function makeMenu(btn, popover, scrim) {
  const isOpen = () => !popover.hidden && !popover.classList.contains('closing');

  // Return focus to the trigger when a close was driven from inside the menu
  // (item tap / Esc), so VoiceOver/keyboard isn't stranded on a hidden element.
  // Skip when focus already moved elsewhere (e.g. a screen switch).
  function restoreFocus() {
    if (popover.contains(document.activeElement)) btn.focus();
  }

  function open() {
    for (const m of menus) if (m.btn !== btn) m.forceClose();
    popover.classList.remove('closing');
    scrim.classList.remove('closing');
    popover.hidden = false;
    scrim.hidden = false;
    btn.setAttribute('aria-expanded', 'true');
    popover.querySelector('.menu-item')?.focus(); // land on the first item
  }
  function close() {
    if (popover.hidden) return;
    btn.setAttribute('aria-expanded', 'false');
    restoreFocus();
    if (reduceMotion()) { popover.hidden = true; scrim.hidden = true; return; }
    popover.classList.add('closing'); // CSS plays the pop-out, then we hide
    scrim.classList.add('closing');
  }
  function forceClose() {
    restoreFocus();
    popover.hidden = true;
    popover.classList.remove('closing');
    scrim.hidden = true;
    scrim.classList.remove('closing');
    btn.setAttribute('aria-expanded', 'false');
  }

  popover.addEventListener('animationend', () => {
    if (popover.classList.contains('closing')) forceClose();
  });
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    isOpen() ? close() : open();
  });
  popover.addEventListener('click', (e) => e.stopPropagation());

  const handle = { btn, open, close, forceClose };
  menus.push(handle);
  return handle;
}

const burger = makeMenu(el.menuBtn, el.menuPopover, el.menuScrim);

// tap-away / Esc dismiss
document.addEventListener('click', () => { for (const m of menus) m.close(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') for (const m of menus) m.close(); });

// ---------- the Mode seam ----------
// The three top-level Modes behind one uniform { start, stop } interface, with a
// router that stops the outgoing Mode before starting the next. Each Mode's start
// already routes/tears down its own screen, so switchMode is the single place
// that knows the Mode set and the transition rule (see CONTEXT.md: Mode).
const modes = {
  learn: { start: goLearn, stop: leaveQuiz },
  warmup: { start: startWarmup, stop: leaveQuiz },
  daily: { start: startDaily, stop: () => { daily.stop(); sprint.stop(); } },
};

function switchMode(name) {
  modes[activeMode]?.stop();
  modes[name].start();
}

// ---------- bottom tab bar — the three top-level Modes ----------
el.tabLearn.addEventListener('click', () => switchMode('learn'));
el.tabDaily.addEventListener('click', () => switchMode('daily'));
el.tabWarmup.addEventListener('click', () => switchMode('warmup'));

// Each Daily game is a shareable cold-entry point — someone can land on it from a
// friend's link having never seen the app — so each gets its rules in an in-place
// overlay. A modal (not a screen switch) so the in-progress puzzle isn't torn
// down and the day's guesses survive. A plain overlay rather than <dialog>,
// which needs WKWebView 15.4 (the app targets iOS 15.0).
function makeHelpModal({ btn, dialog, closeBtn }) {
  // The lock stops the screen behind scrolling under a drag that misses the card
  // (Sprint's rules are long enough to want scrolling of their own).
  const open = () => {
    dialog.hidden = false;
    document.body.classList.add('modal-open');
    closeBtn.focus();
  };
  const close = () => {
    if (dialog.hidden) return;
    dialog.hidden = true;
    document.body.classList.remove('modal-open');
    btn.focus(); // return focus to the trigger
  };
  btn.addEventListener('click', open);
  closeBtn.addEventListener('click', close);
  // Tap the backdrop (outside the card) to dismiss.
  dialog.addEventListener('click', (e) => { if (e.target === dialog) close(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  return { open, close };
}

makeHelpModal({
  btn: el.dailyHelpBtn,
  dialog: el.dailyHelpDialog,
  closeBtn: el.dailyHelpClose,
});
makeHelpModal({
  btn: document.getElementById('sprint-help-btn'),
  dialog: document.getElementById('sprint-help-dialog'),
  closeBtn: document.getElementById('sprint-help-close'),
});

// Reset clears Learn progress — but NOT Daily. Daily is one attempt per day, so
// letting a reset wipe today's guesses (or the streak) would be a free retry.
function resetProgress(back) {
  if (!confirm('Reset your learning progress? This clears your cleared levels and cannot be undone. Your daily streak is kept.')) return;
  const keepDaily = state.daily;
  store.clear();
  state = store.load();
  state.daily = keepDaily;
  store.save(state);
  back();
}

// Burger menu — lives on the Learn map, so its pages return there.
// Daily reminders toggle — iOS app only (on-device local notifications; the
// menu item stays hidden on web, where there is nothing to schedule).
const remindersBtn = document.getElementById('menu-reminders');
const remindersLabel = document.getElementById('menu-reminders-label');
// Any Daily game finished today counts — the reminder is "you haven't played",
// not "you haven't played Melody".
const playedTodayNow = () => playedAnyToday(state.daily, dayNumber(new Date()));
const renderRemindersItem = () => {
  remindersLabel.textContent = `Daily reminder: ${state.growth?.notify === true ? 'on' : 'off'}`;
};
if (globalThis.Capacitor?.isNativePlatform?.()) {
  remindersBtn.hidden = false;
  renderRemindersItem();
  remindersBtn.addEventListener('click', async () => {
    burger.close();
    await toggleNotifications({ state, store, playedToday: playedTodayNow() });
    renderRemindersItem();
  });
  // Reschedule on every launch — reboots and timezone changes drift schedules,
  // and this also clears a stale streak-risk if today is already played.
  syncNotifications({ state, playedToday: playedTodayNow() });
}

el.menuTutorial.addEventListener('click', () => { burger.close(); startTutorial(); });
el.menuHow.addEventListener('click', () => { burger.close(); pageReturn = goLearn; openAbout(); });
el.menuNotes.addEventListener('click', () => { burger.close(); pageReturn = goLearn; openNotes(); });
el.menuReset.addEventListener('click', () => { burger.close(); resetProgress(goLearn); });

el.aboutBackBtn.addEventListener('click', () => pageReturn());
el.notesBackBtn.addEventListener('click', () => { view.clearHighlights(); pageReturn(); });

el.homeBtn.addEventListener('click', () => {
  if (activeMode === 'warmup') { goLearn(); return; } // warmup is transient — no confirm
  // Mid-level: leaving discards this round's progress, so confirm first.
  if (quizMode.round && bar?.value > 0 &&
      !confirm('Leave the level? Your progress this round will be lost.')) return;
  goLearn();
});
el.nextLevelBtn.addEventListener('click', () => clearActions?.next?.());
el.mapBtn.addEventListener('click', () => (clearActions?.primary ?? goLearn)());
el.theoryBackBtn.addEventListener('click', goLearn);
el.meetNextBtn.addEventListener('click', () => meetNext(false));
el.meetSkipBtn.addEventListener('click', () => meetNext(true));
el.theoryNextBtn.addEventListener('click', () => theoryOnDone?.());
el.replayNoteBtn.addEventListener('click', () => quizMode.replayNote());
el.replayCadenceBtn.addEventListener('click', () => quizMode.replayCadence());
el.backspaceBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  quizMode.backspace();
});
el.quizScreen.addEventListener('click', () => quizMode.skip());

// Fade in the home screen's top scrim only once scrolled, so the burger menu
// gets a backdrop over passing content without dimming the mascot at rest.
const onScroll = () => document.body.classList.toggle('scrolled', window.scrollY > 8);
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

document.addEventListener('keydown', (e) => {
  if (el.quizScreen.hidden || e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.key >= '1' && e.key <= '7') {
    const btn = el.degrees.querySelector(`[data-degree="${e.key}"]`);
    if (btn && !btn.disabled) btn.click();
  } else if (e.key === ' ') {
    e.preventDefault();
    if (quizMode.phase === 'resolving') quizMode.skip();
    else quizMode.replayNote();
  } else if (e.key.toLowerCase() === 'c') {
    quizMode.replayCadence();
  }
});

// Test hook for browser automation — not part of the game API.
window.__doremingo = {
  get currentDegree() { return quizMode.round?.session.currentDegree ?? session?.currentDegree; },
  get bar() { return quizMode.bar ?? bar; },
  get answering() { return quizMode.answering; },
  get level() { return quizMode.round?.level ?? level; },
  get mode() { return activeMode; },
  get meetIdx() { return meet?.index ?? 0; },
};

// Daily-only page chrome: no way "back" into Learn (it isn't there), and the
// result view carries the one nudge toward the full game on the landing page.
if (DAILY_ONLY) {
  // No document.title here: each route ships its own, stamped at publish time
  // (bin/publish-web.sh), so overwriting it would undo the per-game titles and
  // put Melody's name on Sprint's tab.
  document.body.classList.add('daily-only');
  document.getElementById('daily-back-btn').hidden = true;
  const upsell = document.createElement('a');
  upsell.className = 'daily-upsell';
  upsell.href = '/';
  upsell.textContent = '🦩 The Daily is just the warm-up — see the full game';
  document.getElementById('daily-result').appendChild(upsell);
}

applyRoute();

// Boot finished — the inline boot-error overlay (index.html) stands down; any
// later uncaught error is in-app and gets handled (or not) by app code.
window.__doremingoBooted = true;
