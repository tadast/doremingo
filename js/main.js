// UI glue: tutorial → level map → (cadence → note → answer → resolution)* → clear.
// The Question lifecycle itself lives in the Round module; main wires it to
// the DOM (view adapter), the Piano (audio), and setTimeout (clock).
import { degreeToMidi, resolutionPath, cadenceChords, degreeInfo } from './theory.js';
import { Piano } from './audio.js';
import { createBar, createSession } from './quiz.js';
import { Round } from './round.js';
import { createGameView } from './view.js';
import { MEET_BLURBS, tutorialSteps, levelMeetSteps, MeetSequence } from './meet.js';
import { Store } from './store.js';
import { LEVELS, getLevel } from './levels.js';
import { THEORY } from './content.js';
import { FLAMINGO } from './art.js';
import { VERSION } from './version.js';

const piano = new Piano();
const store = new Store();
let state = store.load();

let level = null;
let session = null;
let bar = null;
let tonic = 60;
let mode = 'major';
let round = null; // the active Round (Question lifecycle), or null off the quiz screen

// setTimeout/clearTimeout behind the clock interface the Round schedules against
const clock = {
  schedule: (ms, cb) => setTimeout(cb, ms),
  cancel: (handle) => clearTimeout(handle),
};

const el = {
  homeScreen: document.getElementById('home-screen'),
  quizScreen: document.getElementById('quiz-screen'),
  clearScreen: document.getElementById('clear-screen'),
  meetScreen: document.getElementById('meet-screen'),
  journey: document.getElementById('journey'),
  levelList: document.getElementById('level-list'),
  menuBtn: document.getElementById('menu-btn'),
  menuPopover: document.getElementById('menu-popover'),
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

for (const m of [el.homeMascot, el.quizMascot, el.clearMascot]) m.innerHTML = FLAMINGO;

// The DOM adapter the Round drives, and the meet/notes screens reuse.
const view = createGameView(el);

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
  for (const s of [el.homeScreen, el.quizScreen, el.clearScreen, el.meetScreen, el.theoryScreen, el.aboutScreen, el.notesScreen]) {
    s.hidden = s !== screen;
  }
  // Hard-close the menu on every switch — no leftover wobble when home reappears.
  el.menuPopover.hidden = true;
  el.menuPopover.classList.remove('closing');
  el.menuBtn.setAttribute('aria-expanded', 'false');
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
// Hash routes so levels, the tutorial and the menu pages are shareable links:
// #/  ·  #/tutorial  ·  #/level/3  ·  #/about  ·  #/notes

let currentRoute = null;

function setRoute(route) {
  currentRoute = route;
  if (location.hash !== route) location.hash = route;
}

function goHome() {
  round?.stop();
  round = null;
  piano.stopAll?.();
  view.clearHighlights();
  setRoute('#/');
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
  setRoute('#/about');
  showScreen(el.aboutScreen);
}

// Notes reference needs live audio, but is reachable without a level/tutorial —
// so unlock the piano here (the menu tap / route entry is the user gesture).
async function openNotes() {
  setRoute('#/notes');
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

function applyRoute() {
  const levelMatch = location.hash.match(/^#\/level\/(\d+)$/);
  if (levelMatch && getLevel(Number(levelMatch[1]))) {
    setRoute(location.hash);
    openLevelFromLink(Number(levelMatch[1]));
    return;
  }
  if (location.hash === '#/tutorial') {
    setRoute('#/tutorial');
    startTutorial();
    return;
  }
  if (location.hash === '#/about') { openAbout(); return; }
  if (location.hash === '#/notes') { openNotes(); return; }
  if (state.tutorialDone) goHome();
  else startTutorial();
}

window.addEventListener('hashchange', () => {
  if (location.hash === currentRoute) return; // our own navigation
  applyRoute();
});

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
      book.textContent = '📖';
      book.title = 'Read the theory';
      book.setAttribute('aria-label', `theory for ${l.name}`);
      book.addEventListener('click', () => showTheory(l.id, goHome));

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
  setRoute('#/tutorial');
  runMeet(tutorialSteps(), (skipped) => {
    state.tutorialDone = true;
    state.metNotes = [...new Set([...state.metNotes, 1, 3, 5])];
    store.save(state);
    if (skipped) goHome();
    else startLevel(1);
  }, 'Close');
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
  el.clearMessage.textContent = next
    ? `Your ear is getting sharper. Next up: ${next.name} 🦩`
    : 'You cleared every level — what an ear! 🦩';
  el.nextLevelBtn.hidden = !next;
  showScreen(el.clearScreen);
  confettiBurst();
  // a happy little Do-Mi-Sol-Do fanfare
  piano.playSequence(
    [tonic, tonic + (mode === 'minor' ? 3 : 4), tonic + 7, tonic + 12],
    piano.now + 0.2, 0.18, 0.03,
  );
}

function enterQuiz() {
  el.levelTitle.textContent = `Level ${level.id} — ${level.name}`;
  el.backspaceBtn.hidden = (level.sequenceLength ?? 1) === 1;
  view.buildAnswerButtons(level, mode, (d) => round?.answer(d));
  round = new Round({
    level, session, bar, tonic, mode,
    audio: piano, view, clock,
    onPersist: () => { bar = round.bar; persist(); },
    onCleared: levelCleared,
  });
  view.renderBar(bar.value, bar.size);
  showScreen(el.quizScreen);
  round.start();
}

async function startLevel(id) {
  setRoute(`#/level/${id}`);
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

// ---------- wiring ----------

el.versionTag.textContent = `v${VERSION}`;

// ---------- burger menu ----------

const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function openMenu() {
  el.menuPopover.classList.remove('closing');
  el.menuPopover.hidden = false;
  el.menuBtn.setAttribute('aria-expanded', 'true');
}

function closeMenu() {
  if (el.menuPopover.hidden) return;
  el.menuBtn.setAttribute('aria-expanded', 'false');
  if (reduceMotion()) {
    el.menuPopover.hidden = true;
    return;
  }
  el.menuPopover.classList.add('closing'); // CSS plays the wobble-out, then we hide
}

el.menuPopover.addEventListener('animationend', () => {
  if (el.menuPopover.classList.contains('closing')) {
    el.menuPopover.hidden = true;
    el.menuPopover.classList.remove('closing');
  }
});

el.menuBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  const open = !el.menuPopover.hidden && !el.menuPopover.classList.contains('closing');
  open ? closeMenu() : openMenu();
});
// tap-away / Esc dismiss
document.addEventListener('click', () => closeMenu());
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });
el.menuPopover.addEventListener('click', (e) => e.stopPropagation());

el.menuTutorial.addEventListener('click', () => { closeMenu(); startTutorial(); });
el.menuHow.addEventListener('click', () => { closeMenu(); openAbout(); });
el.aboutBackBtn.addEventListener('click', goHome);
el.menuNotes.addEventListener('click', () => { closeMenu(); openNotes(); });
el.notesBackBtn.addEventListener('click', () => { view.clearHighlights(); goHome(); });
el.menuReset.addEventListener('click', () => {
  closeMenu();
  if (!confirm('Reset all progress and clear saved data? This cannot be undone.')) return;
  store.clear();
  state = store.load();
  goHome();
});

el.homeBtn.addEventListener('click', goHome);
el.nextLevelBtn.addEventListener('click', () => startLevel(level.id + 1));
el.mapBtn.addEventListener('click', goHome);
el.theoryBackBtn.addEventListener('click', goHome);
el.meetNextBtn.addEventListener('click', () => meetNext(false));
el.meetSkipBtn.addEventListener('click', () => meetNext(true));
el.theoryNextBtn.addEventListener('click', () => theoryOnDone?.());
el.replayNoteBtn.addEventListener('click', () => round?.replayNote());
el.replayCadenceBtn.addEventListener('click', () => round?.replayCadence());
el.backspaceBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  round?.backspace();
});
el.quizScreen.addEventListener('click', () => round?.skip());

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
    if (round?.phase === 'resolving') round.skip();
    else round?.replayNote();
  } else if (e.key.toLowerCase() === 'c') {
    round?.replayCadence();
  }
});

// Test hook for browser automation — not part of the game API.
window.__doremingo = {
  get currentDegree() { return session?.currentDegree; },
  get bar() { return round?.bar ?? bar; },
  get answering() { return round?.answering ?? false; },
  get level() { return level; },
  get meetIdx() { return meet?.index ?? 0; },
};

applyRoute();
