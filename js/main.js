// UI glue: cadence → note → answer → resolution → next, with the Bar and
// persisted progress.
import { degreeToMidi, resolutionPath, cadenceChords, SOLFEGE } from './theory.js';
import { Piano } from './audio.js';
import { createBar, applyAnswer, isFull } from './quiz.js';
import { Store } from './store.js';

const TONIC = 60; // C4 for the core loop
const DEGREE_POOL = [1, 3, 5]; // Level 1: Do Mi Sol
const BAR_SIZE = 15;
const LEVEL = 1; // until the level system lands (issue 04)

const piano = new Piano();
const store = new Store();
let state = store.load();
let bar = createBar(BAR_SIZE, state.bar ?? 0);

const el = {
  startScreen: document.getElementById('start-screen'),
  quizScreen: document.getElementById('quiz-screen'),
  clearScreen: document.getElementById('clear-screen'),
  startBtn: document.getElementById('start-btn'),
  continueBtn: document.getElementById('continue-btn'),
  loadStatus: document.getElementById('load-status'),
  prompt: document.getElementById('prompt'),
  degrees: document.getElementById('degree-buttons'),
  feedback: document.getElementById('feedback'),
  barFill: document.getElementById('bar-fill'),
};

let currentDegree = null;
let answering = false;

function showScreen(screen) {
  for (const s of [el.startScreen, el.quizScreen, el.clearScreen]) {
    s.hidden = s !== screen;
  }
}

function renderBar() {
  el.barFill.style.width = `${(bar.value / bar.size) * 100}%`;
}

function buildButtons() {
  el.degrees.replaceChildren(
    ...DEGREE_POOL.map((d) => {
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

function pickDegree() {
  let d;
  do {
    d = DEGREE_POOL[Math.floor(Math.random() * DEGREE_POOL.length)];
  } while (DEGREE_POOL.length > 1 && d === currentDegree);
  return d;
}

function ask() {
  clearMarks();
  setButtonsEnabled(false);
  el.feedback.textContent = '';
  el.feedback.className = 'feedback';
  el.prompt.textContent = 'Listen… this is home 🏠';

  currentDegree = pickDegree();
  const noteMidi = degreeToMidi(TONIC, currentDegree);

  let t = piano.now + 0.1;
  for (const chord of cadenceChords(TONIC)) {
    t = piano.playChord(chord, t, 0.55) + 0.05;
  }
  t += 0.4;
  piano.playNote(noteMidi, t, 1.2, 0.95);

  const msUntilAnswerable = (t - piano.now) * 1000 + 300;
  setTimeout(() => {
    el.prompt.textContent = 'Which note was that?';
    setButtonsEnabled(true);
    answering = true;
  }, msUntilAnswerable);
}

function persist() {
  store.save({ ...state, currentLevel: LEVEL, bar: bar.value });
}

function levelCleared() {
  if (!state.clearedLevels.includes(LEVEL)) {
    state.clearedLevels = [...state.clearedLevels, LEVEL];
  }
  bar = createBar(BAR_SIZE, 0);
  persist();
  showScreen(el.clearScreen);
}

function answer(degree, btn) {
  if (!answering) return;
  answering = false;
  setButtonsEnabled(false);

  const noteMidi = degreeToMidi(TONIC, currentDegree);
  const correct = degree === currentDegree;
  bar = applyAnswer(bar, correct);
  renderBar();
  persist();

  if (correct) {
    btn.classList.add('correct');
    el.feedback.textContent = `Yes! That was ${SOLFEGE[currentDegree]} 🎉`;
    el.feedback.className = 'feedback good';
  } else {
    btn.classList.add('wrong');
    const rightBtn = el.degrees.querySelector(`[data-degree="${currentDegree}"]`);
    rightBtn?.classList.add('correct');
    el.feedback.textContent = `It was ${SOLFEGE[currentDegree]} — hear it walk home`;
    el.feedback.className = 'feedback bad';
  }

  // Resolution: the note walks home to Do (the teaching device, ADR-0001)
  const end = piano.playSequence(resolutionPath(TONIC, noteMidi), piano.now + 0.45);
  const msUntilNext = (end - piano.now) * 1000 + 700;
  setTimeout(() => {
    if (isFull(bar)) levelCleared();
    else ask();
  }, msUntilNext);
}

async function start() {
  el.startBtn.disabled = true;
  el.loadStatus.hidden = false;
  try {
    await piano.init();
  } catch (err) {
    el.loadStatus.textContent = 'Could not load the piano — check your connection and reload.';
    el.startBtn.disabled = false;
    console.error(err);
    return;
  }
  showScreen(el.quizScreen);
  buildButtons();
  renderBar();
  ask();
}

// Test hook for browser automation — not part of the game API.
window.__doremingo = {
  get currentDegree() { return currentDegree; },
  get bar() { return bar; },
  get answering() { return answering; },
};

el.startBtn.addEventListener('click', start);
el.continueBtn.addEventListener('click', () => {
  renderBar();
  showScreen(el.quizScreen);
  ask();
});
