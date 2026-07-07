// Quiz engine — pure logic, no DOM, no audio.

export const BAR_GAIN = 1;
export const BAR_DRAIN = 0.5;

// A Bar carries its own drain rule, so the same engine clears both a Learn
// Level (a wrong answer drains slightly) and a Warmup Stage (a wrong answer
// resets the streak to zero). `drain: Infinity` means "reset on miss".
export function createBar(size = 15, value = 0, { drain = BAR_DRAIN } = {}) {
  return { size, value: Math.min(Math.max(value, 0), size), drain };
}

export function applyAnswer(bar, correct) {
  if (correct) return createBar(bar.size, bar.value + BAR_GAIN, { drain: bar.drain });
  if (bar.drain === Infinity) return createBar(bar.size, 0, { drain: bar.drain });
  return createBar(bar.size, bar.value - bar.drain, { drain: bar.drain });
}

export function isFull(bar) {
  return bar.value >= bar.size;
}

// A missed question comes back after 2-4 questions — soon enough to learn
// from, randomised enough that you can't predict it.
const REQUEUE_MIN = 2;
const REQUEUE_MAX = 4;

/**
 * A run of Questions for one level. Draws degrees from the level's pool,
 * avoids immediate repeats, and re-queues a missed degree to reappear a
 * couple of questions later (lite spaced repetition).
 */
const qKey = (q) => JSON.stringify(q);

export function createSession(level, rng = Math.random) {
  const seqLen = level.sequenceLength ?? 1;
  let lastQuestion = null;
  let currentQuestion = null; // a degree, or an array of degrees for sequences
  let questionsAsked = 0;
  const requeue = []; // [{question, dueIn}]

  function drawDegree(exclude) {
    const pool = level.degrees;
    let d;
    do {
      d = pool[Math.floor(rng() * pool.length)];
    } while (pool.length > 1 && d === exclude);
    return d;
  }

  function drawQuestion() {
    if (seqLen === 1) return drawDegree(lastQuestion);
    const seq = [];
    let prev = null;
    for (let i = 0; i < seqLen; i++) {
      const d = drawDegree(prev); // no immediate repeats inside the melody
      seq.push(d);
      prev = d;
    }
    return seq;
  }

  return {
    get level() {
      return level;
    },
    get currentDegree() {
      return currentQuestion;
    },
    /** Should the cadence play before the upcoming question? */
    cadenceDue() {
      if (level.cadenceEvery === 0) return questionsAsked === 0;
      return questionsAsked % level.cadenceEvery === 0;
    },
    /** Pick the next question: a degree, or an array for sequence levels. */
    next() {
      for (const item of requeue) item.dueIn -= 1;
      const dueIdx = requeue.findIndex((item) => item.dueIn <= 0);
      let question;
      if (dueIdx !== -1 && qKey(requeue[dueIdx].question) !== qKey(lastQuestion)) {
        question = requeue.splice(dueIdx, 1)[0].question;
      } else {
        question = drawQuestion();
      }
      questionsAsked += 1;
      lastQuestion = question;
      currentQuestion = question;
      return question;
    },
    /** Grade an answer (degree or array); wrong answers re-queue the question. */
    recordAnswer(answered) {
      const correct = qKey(answered) === qKey(currentQuestion);
      if (!correct && !requeue.some((item) => qKey(item.question) === qKey(currentQuestion))) {
        const dueIn = REQUEUE_MIN + Math.floor(rng() * (REQUEUE_MAX - REQUEUE_MIN + 1));
        requeue.push({ question: currentQuestion, dueIn });
      }
      return correct;
    },
  };
}
