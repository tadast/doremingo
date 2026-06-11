// UI glue: tutorial → level map → (cadence → note → answer → resolution)* → clear.
import { degreeToMidi, resolutionPath, cadenceChords, SOLFEGE } from './theory.js';
import { Piano } from './audio.js';
import { createBar, applyAnswer, isFull, createSession } from './quiz.js';
import { Store } from './store.js';
import { LEVELS, getLevel } from './levels.js';
import { THEORY } from './content.js';

const piano = new Piano();
const store = new Store();
let state = store.load();

let level = null;
let session = null;
let bar = null;
let answering = false;

const el = {
  homeScreen: document.getElementById('home-screen'),
  quizScreen: document.getElementById('quiz-screen'),
  clearScreen: document.getElementById('clear-screen'),
  meetScreen: document.getElementById('meet-screen'),
  journey: document.getElementById('journey'),
  levelList: document.getElementById('level-list'),
  tutorialBtn: document.getElementById('tutorial-btn'),
  loadStatus: document.getElementById('load-status'),
  homeBtn: document.getElementById('home-btn'),
  levelTitle: document.getElementById('level-title'),
  prompt: document.getElementById('prompt'),
  degrees: document.getElementById('degree-buttons'),
  feedback: document.getElementById('feedback'),
  barFill: document.getElementById('bar-fill'),
  clearMessage: document.getElementById('clear-message'),
  nextLevelBtn: document.getElementById('next-level-btn'),
  mapBtn: document.getElementById('map-btn'),
  meetTitle: document.getElementById('meet-title'),
  meetBody: document.getElementById('meet-body'),
  meetStage: document.getElementById('meet-stage'),
  meetNextBtn: document.getElementById('meet-next-btn'),
  meetSkipBtn: document.getElementById('meet-skip-btn'),
  theoryScreen: document.getElementById('theory-screen'),
  theoryTitle: document.getElementById('theory-title'),
  theoryBody: document.getElementById('theory-body'),
  theoryNextBtn: document.getElementById('theory-next-btn'),
};

function showScreen(screen) {
  for (const s of [el.homeScreen, el.quizScreen, el.clearScreen, el.meetScreen, el.theoryScreen]) {
    s.hidden = s !== screen;
  }
}

function goHome() {
  answering = false;
  renderHome();
  showScreen(el.homeScreen);
}

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

const MEET_BLURBS = {
  1: 'Do is home itself — the most restful note of all. Tap it to hear it.',
  2: 'Re sits one step above home, always ready to slide back down. Tap to hear it walk home.',
  3: 'Mi floats a little above home — sunny and settled. Tap to hear it lean back down to Do.',
  4: 'Fa is the gentle leaner — it loves drifting down toward Mi. Tap to hear it find its way home.',
  5: 'Sol is the bright one, higher up — it loves climbing to the next Do. Tap it!',
  6: 'La is the dreamy one, floating above Sol. Tap to hear it climb home.',
  7: 'Ti lives right under the next Do — so close it can’t resist pulling up. Tap it!',
};

function tutorialSteps() {
  return [
    {
      title: 'Welcome to DoReMingo! 🦩',
      body: 'You’ll learn to recognise notes by how they feel inside music. No experience needed — just your ears.',
      nextLabel: 'Let’s go',
      initAudio: true,
    },
    {
      title: 'This is home 🏠',
      body: 'Every piece of music has a key — a home base. This little chord pattern is how DoReMingo shows your ear where home is. It plays before each question.',
      sound: 'cadence',
      nextLabel: 'I heard it!',
    },
    { title: 'Meet Do', body: MEET_BLURBS[1], stage: 1 },
    { title: 'Meet Mi', body: MEET_BLURBS[3], stage: 3, resolve: true },
    { title: 'Meet Sol', body: MEET_BLURBS[5], stage: 5, resolve: true },
    {
      title: 'Ready to play! 🎉',
      body: 'You’ll hear home, then one mystery note. Tap which note you think it was. Wrong guesses are great too — every note walks home afterwards, so your ear learns either way.',
      nextLabel: 'Start Level 1',
    },
  ];
}

let meetSteps = [];
let meetIdx = 0;
let meetOnDone = null;

function buildStageButton(degree, withResolution, tonic = 60) {
  const btn = document.createElement('button');
  btn.className = 'degree-btn';
  btn.dataset.degree = String(degree);
  btn.innerHTML = `<span>${SOLFEGE[degree]}</span><span class="num">${degree}</span>`;
  btn.addEventListener('click', () => {
    const midi = degreeToMidi(tonic, degree);
    if (withResolution) piano.playSequence(resolutionPath(tonic, midi), piano.now + 0.05, 0.5);
    else piano.playNote(midi, piano.now + 0.05, 1.2, 0.95);
  });
  return btn;
}

function renderMeetStep() {
  const s = meetSteps[meetIdx];
  el.meetTitle.textContent = s.title;
  el.meetBody.textContent = s.body;
  el.meetNextBtn.textContent = s.nextLabel ?? 'Next';
  el.meetStage.replaceChildren(
    ...(s.stage ? [buildStageButton(s.stage, s.resolve, s.tonic ?? 60)] : []),
  );
  if (s.sound === 'cadence') {
    let t = piano.now + 0.3;
    for (const chord of cadenceChords(s.tonic ?? 60)) {
      t = piano.playChord(chord, t, 0.55) + 0.05;
    }
  }
}

function runMeet(steps, onDone) {
  meetSteps = steps;
  meetIdx = 0;
  meetOnDone = onDone;
  renderMeetStep();
  showScreen(el.meetScreen);
}

async function meetNext(skipped = false) {
  const s = meetSteps[meetIdx];
  if (s.initAudio && !skipped) {
    el.meetNextBtn.disabled = true;
    try {
      await piano.init();
    } finally {
      el.meetNextBtn.disabled = false;
    }
  }
  if (skipped || meetIdx + 1 >= meetSteps.length) {
    meetOnDone(skipped);
  } else {
    meetIdx += 1;
    renderMeetStep();
  }
}

function startTutorial() {
  runMeet(tutorialSteps(), (skipped) => {
    state.tutorialDone = true;
    state.metNotes = [...new Set([...state.metNotes, 1, 3, 5])];
    store.save(state);
    if (skipped) goHome();
    else startLevel(1);
  });
}

// ---------- quiz ----------

function renderBar() {
  el.barFill.style.width = `${(bar.value / bar.size) * 100}%`;
}

function buildButtons() {
  el.degrees.replaceChildren(
    ...level.degrees.map((d) => {
      const btn = document.createElement('button');
      btn.className = 'degree-btn';
      btn.dataset.degree = String(d);
      btn.innerHTML = `<span>${SOLFEGE[d]}</span><span class="num">${d}</span>`;
      btn.addEventListener('click', () => answer(d, btn));
      return btn;
    }),
  );
}

function setButtonsEnabled(enabled) {
  for (const b of el.degrees.querySelectorAll('button')) b.disabled = !enabled;
}

function clearMarks() {
  for (const b of el.degrees.querySelectorAll('button')) {
    b.classList.remove('correct', 'wrong');
  }
}

function ask() {
  clearMarks();
  setButtonsEnabled(false);
  el.feedback.textContent = '';
  el.feedback.className = 'feedback';

  const cadence = session.cadenceDue();
  const degree = session.next();
  const noteMidi = degreeToMidi(level.tonic, degree);

  let t = piano.now + 0.1;
  if (cadence) {
    el.prompt.textContent = 'Listen… this is home 🏠';
    for (const chord of cadenceChords(level.tonic)) {
      t = piano.playChord(chord, t, 0.55) + 0.05;
    }
    t += 0.4;
  } else {
    el.prompt.textContent = 'Listen…';
  }
  piano.playNote(noteMidi, t, 1.2, 0.95);

  const msUntilAnswerable = (t - piano.now) * 1000 + 300;
  setTimeout(() => {
    el.prompt.textContent = 'Which note was that?';
    setButtonsEnabled(true);
    answering = true;
  }, msUntilAnswerable);
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
}

function answer(degree, btn) {
  if (!answering) return;
  answering = false;
  setButtonsEnabled(false);

  const asked = session.currentDegree;
  const noteMidi = degreeToMidi(level.tonic, asked);
  const correct = session.recordAnswer(degree);
  bar = applyAnswer(bar, correct);
  renderBar();
  persist();

  if (correct) {
    btn.classList.add('correct');
    el.feedback.textContent = `Yes! That was ${SOLFEGE[asked]} 🎉`;
    el.feedback.className = 'feedback good';
  } else {
    btn.classList.add('wrong');
    el.degrees.querySelector(`[data-degree="${asked}"]`)?.classList.add('correct');
    el.feedback.textContent = `It was ${SOLFEGE[asked]} — hear it walk home`;
    el.feedback.className = 'feedback bad';
  }

  // Resolution: the note walks home to Do (the teaching device, ADR-0001)
  const end = piano.playSequence(resolutionPath(level.tonic, noteMidi), piano.now + 0.45);
  const msUntilNext = (end - piano.now) * 1000 + 700;
  setTimeout(() => {
    if (isFull(bar)) levelCleared();
    else ask();
  }, msUntilNext);
}

function enterQuiz() {
  el.levelTitle.textContent = `Level ${level.id} — ${level.name}`;
  buildButtons();
  renderBar();
  showScreen(el.quizScreen);
  ask();
}

async function startLevel(id) {
  el.loadStatus.hidden = false;
  try {
    await piano.init();
  } catch (err) {
    el.loadStatus.textContent = 'Could not load the piano — check your connection and reload.';
    console.error(err);
    return;
  }
  el.loadStatus.hidden = true;

  level = getLevel(id);
  session = createSession(level);
  const resumeBar = state.currentLevel === id ? state.bar ?? 0 : 0;
  bar = createBar(level.barSize, resumeBar);
  state.currentLevel = id;
  persist();

  const maybeMeet = () => {
    const d = level.newDegree;
    if (d && !state.metNotes.includes(d)) {
      state.metNotes = [...new Set([...state.metNotes, d])];
      store.save(state);
      runMeet(
        [{ title: `Meet ${SOLFEGE[d]}`, body: MEET_BLURBS[d], stage: d, resolve: true, tonic: level.tonic, nextLabel: 'Got it — quiz me!' }],
        () => enterQuiz(),
      );
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

el.homeBtn.addEventListener('click', goHome);
el.nextLevelBtn.addEventListener('click', () => startLevel(level.id + 1));
el.mapBtn.addEventListener('click', goHome);
el.tutorialBtn.addEventListener('click', startTutorial);
el.meetNextBtn.addEventListener('click', () => meetNext(false));
el.meetSkipBtn.addEventListener('click', () => meetNext(true));
el.theoryNextBtn.addEventListener('click', () => theoryOnDone?.());

// Test hook for browser automation — not part of the game API.
window.__doremingo = {
  get currentDegree() { return session?.currentDegree; },
  get bar() { return bar; },
  get answering() { return answering; },
  get level() { return level; },
  get meetIdx() { return meetIdx; },
};

if (state.tutorialDone) {
  renderHome();
} else {
  startTutorial();
}
