// UI glue: tutorial → level map → (cadence → note → answer → resolution)* → clear.
import { degreeToMidi, resolutionPath, cadenceChords, degreeInfo } from './theory.js';
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
let tonic = 60;
let mode = 'major';
let answering = false;
let currentNoteMidis = []; // the question's notes (one, or a sequence)
let pendingAnswer = []; // taps so far on a sequence level
let resolving = false;
let nextTimeout = null;
let afterResolution = null;

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
  replayNoteBtn: document.getElementById('replay-note-btn'),
  replayCadenceBtn: document.getElementById('replay-cadence-btn'),
  backspaceBtn: document.getElementById('backspace-btn'),
  slots: document.getElementById('answer-slots'),
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
  resolving = false;
  clearTimeout(nextTimeout);
  piano.stopAll?.();
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
  fi: 'Fi squeezes in between Fa and Sol — sharp, curious, a little cheeky. Tap to hear it tip up into Sol and climb home.',
  te: 'Te is the mellow rebel — a softened Ti that sits a step lower. Tap to hear it push up through Ti to reach home.',
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

function buildStageButton(degree, withResolution, stageTonic = 60, stageMode = 'major') {
  const info = degreeInfo(degree, stageMode);
  const btn = document.createElement('button');
  btn.className = 'degree-btn';
  btn.dataset.degree = String(degree);
  btn.innerHTML = `<span>${info.name}</span><span class="num">${info.label}</span>`;
  btn.addEventListener('click', () => {
    const midi = degreeToMidi(stageTonic, degree, 0, stageMode);
    if (withResolution) piano.playSequence(resolutionPath(stageTonic, midi, stageMode), piano.now + 0.05, 0.5);
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
    ...(s.stage ? [buildStageButton(s.stage, s.resolve, s.tonic ?? 60, s.mode ?? 'major')] : []),
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
      const info = degreeInfo(d, mode);
      const btn = document.createElement('button');
      btn.className = 'degree-btn';
      btn.dataset.degree = String(d);
      btn.innerHTML = `<span>${info.name}</span><span class="num">${info.label}</span>`;
      btn.addEventListener('click', (e) => {
        e.stopPropagation(); // don't let the answering tap skip its own resolution
        answer(d, btn);
      });
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

function setReplaysEnabled(enabled) {
  el.replayNoteBtn.disabled = !enabled;
  el.replayCadenceBtn.disabled = !enabled;
}

function replayNote() {
  if (!currentNoteMidis.length || resolving) return;
  if (currentNoteMidis.length === 1) {
    piano.playNote(currentNoteMidis[0], piano.now + 0.05, 1.2, 0.95);
  } else {
    piano.playSequence(currentNoteMidis, piano.now + 0.05, 0.55, 0.1);
  }
}

function replayCadence() {
  if (resolving) return;
  let t = piano.now + 0.05;
  for (const chord of cadenceChords(tonic, mode)) {
    t = piano.playChord(chord, t, 0.55) + 0.05;
  }
}

function seqLen() {
  return level.sequenceLength ?? 1;
}

function renderSlots(verdict = null) {
  if (seqLen() === 1) {
    el.slots.hidden = true;
    return;
  }
  el.slots.hidden = false;
  const asked = [].concat(session.currentDegree ?? []);
  el.slots.replaceChildren(
    ...Array.from({ length: seqLen() }, (_, i) => {
      const slot = document.createElement('span');
      slot.className = 'slot';
      const picked = pendingAnswer[i];
      if (picked !== undefined) {
        slot.classList.add('filled');
        slot.textContent = degreeInfo(picked, mode).name;
      }
      if (verdict) {
        slot.classList.remove('filled');
        slot.classList.add(picked === asked[i] ? 'good' : 'bad');
        if (picked !== asked[i]) {
          slot.textContent = `${degreeInfo(picked, mode).name}→${degreeInfo(asked[i], mode).name}`;
        }
      }
      return slot;
    }),
  );
  el.backspaceBtn.disabled = !answering || pendingAnswer.length === 0 || !!verdict;
}

function ask() {
  clearMarks();
  setButtonsEnabled(false);
  setReplaysEnabled(false);
  el.feedback.textContent = '';
  el.feedback.className = 'feedback';
  pendingAnswer = [];

  const cadence = session.cadenceDue();
  const question = session.next();
  const degrees = [].concat(question);
  const octaves = level.octaves ?? [0];
  const octave = octaves[Math.floor(Math.random() * octaves.length)];
  currentNoteMidis = degrees.map((d) => degreeToMidi(tonic, d, octave, mode));

  let t = piano.now + 0.1;
  if (cadence) {
    el.prompt.textContent = 'Listen… this is home 🏠';
    for (const chord of cadenceChords(tonic, mode)) {
      t = piano.playChord(chord, t, 0.55) + 0.05;
    }
    t += 0.4;
  } else {
    el.prompt.textContent = 'Listen…';
  }
  if (currentNoteMidis.length === 1) {
    t = piano.playNote(currentNoteMidis[0], t, 1.2, 0.95);
  } else {
    t = piano.playSequence(currentNoteMidis, t, 0.55, 0.1);
  }
  renderSlots();

  const msUntilAnswerable = (t - piano.now) * 1000 + 300;
  nextTimeout = setTimeout(() => {
    el.prompt.textContent = seqLen() === 1 ? 'Which note was that?' : 'Which notes were those, in order?';
    setButtonsEnabled(true);
    setReplaysEnabled(true);
    answering = true;
    renderSlots();
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

  if (seqLen() > 1) {
    pendingAnswer.push(degree);
    piano.playNote(degreeToMidi(tonic, degree, 0, mode), piano.now + 0.02, 0.4, 0.6);
    renderSlots();
    if (pendingAnswer.length < seqLen()) return;
    finishQuestion(session.recordAnswer(pendingAnswer), null);
    return;
  }

  finishQuestion(session.recordAnswer(degree), btn);
}

function finishQuestion(correct, btn) {
  answering = false;
  setButtonsEnabled(false);

  const asked = session.currentDegree;
  bar = applyAnswer(bar, correct);
  renderBar();
  persist();

  const names = [].concat(asked).map((d) => degreeInfo(d, mode).name).join(' → ');
  if (correct) {
    btn?.classList.add('correct');
    el.feedback.textContent = `Yes! That was ${names} 🎉`;
    el.feedback.className = 'feedback good';
  } else {
    btn?.classList.add('wrong');
    if (seqLen() === 1) {
      el.degrees.querySelector(`[data-degree="${asked}"]`)?.classList.add('correct');
    }
    el.feedback.textContent = `It was ${names} — hear it walk home`;
    el.feedback.className = 'feedback bad';
  }
  if (seqLen() > 1) renderSlots('verdict');

  // Resolution: the (last) note walks home to Do (the teaching device, ADR-0001)
  resolving = true;
  setReplaysEnabled(false);
  afterResolution = () => {
    resolving = false;
    afterResolution = null;
    if (isFull(bar)) levelCleared();
    else ask();
  };
  const lastMidi = currentNoteMidis[currentNoteMidis.length - 1];
  const end = piano.playSequence(resolutionPath(tonic, lastMidi, mode), piano.now + 0.45);
  const msUntilNext = (end - piano.now) * 1000 + 700;
  nextTimeout = setTimeout(() => afterResolution?.(), msUntilNext);
}

// Tap anywhere on the quiz screen during the resolution to skip it.
function skipResolution() {
  if (!resolving) return;
  clearTimeout(nextTimeout);
  piano.stopAll();
  afterResolution?.();
}

function enterQuiz() {
  el.levelTitle.textContent = `Level ${level.id} — ${level.name}`;
  el.backspaceBtn.hidden = seqLen() === 1;
  buildButtons();
  renderBar();
  showScreen(el.quizScreen);
  ask();
}

async function startLevel(id) {
  el.loadStatus.hidden = false;
  el.loadStatus.textContent = 'Warming up the piano…';
  try {
    await piano.init((loaded, total) => {
      el.loadStatus.textContent = `Warming up the piano… ${loaded}/${total}`;
    });
  } catch (err) {
    el.loadStatus.textContent = 'Could not load the piano — tap here to retry 🔁';
    el.loadStatus.onclick = () => {
      el.loadStatus.onclick = null;
      startLevel(id);
    };
    console.error(err);
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
      const steps = unmet.map((d, i) => ({
        title: `Meet ${degreeInfo(d, mode).name}`,
        body: MEET_BLURBS[d],
        stage: d,
        resolve: true,
        tonic,
        mode,
        nextLabel: i === unmet.length - 1 ? 'Got it — quiz me!' : 'Next',
      }));
      runMeet(steps, () => enterQuiz());
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
el.replayNoteBtn.addEventListener('click', replayNote);
el.replayCadenceBtn.addEventListener('click', replayCadence);
el.backspaceBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  if (!answering || !pendingAnswer.length) return;
  pendingAnswer.pop();
  renderSlots();
});
el.quizScreen.addEventListener('click', skipResolution);

document.addEventListener('keydown', (e) => {
  if (el.quizScreen.hidden || e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.key >= '1' && e.key <= '7') {
    const btn = el.degrees.querySelector(`[data-degree="${e.key}"]`);
    if (btn && !btn.disabled) btn.click();
  } else if (e.key === ' ') {
    e.preventDefault();
    if (resolving) skipResolution();
    else replayNote();
  } else if (e.key.toLowerCase() === 'c') {
    replayCadence();
  }
});

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
