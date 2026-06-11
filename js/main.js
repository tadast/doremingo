// UI glue: level map → (cadence → note → answer → resolution)* → clear.
import { degreeToMidi, resolutionPath, cadenceChords, SOLFEGE } from './theory.js';
import { Piano } from './audio.js';
import { createBar, applyAnswer, isFull, createSession } from './quiz.js';
import { Store } from './store.js';
import { LEVELS, getLevel } from './levels.js';

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
  journey: document.getElementById('journey'),
  levelList: document.getElementById('level-list'),
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
};

function showScreen(screen) {
  for (const s of [el.homeScreen, el.quizScreen, el.clearScreen]) {
    s.hidden = s !== screen;
  }
}

// ---------- home / level map ----------

function renderHome() {
  const cleared = state.clearedLevels.length;
  el.journey.textContent = cleared
    ? `${cleared} of ${LEVELS.length} levels cleared`
    : 'Pick a level — Home base is a great start';

  el.levelList.replaceChildren(
    ...LEVELS.map((l) => {
      const card = document.createElement('button');
      const isCleared = state.clearedLevels.includes(l.id);
      const isCurrent = state.currentLevel === l.id && !isCleared;
      card.className = `level-card${isCleared ? ' cleared' : ''}${isCurrent ? ' current' : ''}`;
      card.innerHTML = `
        <span class="badge">${isCleared ? '⭐' : l.id}</span>
        <span>
          <span class="level-name">${l.name}</span><br>
          <span class="level-sub">${l.subtitle}</span>
        </span>`;
      card.addEventListener('click', () => startLevel(l.id));
      return card;
    }),
  );
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

  el.levelTitle.textContent = `Level ${level.id} — ${level.name}`;
  buildButtons();
  renderBar();
  showScreen(el.quizScreen);
  ask();
}

// ---------- wiring ----------

el.homeBtn.addEventListener('click', () => {
  answering = false;
  renderHome();
  showScreen(el.homeScreen);
});
el.nextLevelBtn.addEventListener('click', () => startLevel(level.id + 1));
el.mapBtn.addEventListener('click', () => {
  renderHome();
  showScreen(el.homeScreen);
});

// Test hook for browser automation — not part of the game API.
window.__doremingo = {
  get currentDegree() { return session?.currentDegree; },
  get bar() { return bar; },
  get answering() { return answering; },
  get level() { return level; },
};

renderHome();
