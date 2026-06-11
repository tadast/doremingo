// Quiz engine — pure logic, no DOM, no audio.

export const BAR_GAIN = 1;
export const BAR_DRAIN = 0.5;

export function createBar(size = 15, value = 0) {
  return { size, value: Math.min(Math.max(value, 0), size) };
}

export function applyAnswer(bar, correct) {
  const delta = correct ? BAR_GAIN : -BAR_DRAIN;
  return createBar(bar.size, bar.value + delta);
}

export function isFull(bar) {
  return bar.value >= bar.size;
}

const REQUEUE_AFTER = 2; // a missed degree comes back after this many questions

/**
 * A run of Questions for one level. Draws degrees from the level's pool,
 * avoids immediate repeats, and re-queues a missed degree to reappear a
 * couple of questions later (lite spaced repetition).
 */
export function createSession(level, rng = Math.random) {
  let lastDegree = null;
  let currentDegree = null;
  let questionsAsked = 0;
  const requeue = []; // [{degree, dueIn}]

  function drawRandom() {
    const pool = level.degrees;
    let d;
    do {
      d = pool[Math.floor(rng() * pool.length)];
    } while (pool.length > 1 && d === lastDegree);
    return d;
  }

  return {
    get level() {
      return level;
    },
    get currentDegree() {
      return currentDegree;
    },
    /** Should the cadence play before the upcoming question? */
    cadenceDue() {
      if (level.cadenceEvery === 0) return questionsAsked === 0;
      return questionsAsked % level.cadenceEvery === 0;
    },
    /** Pick the next question's degree. */
    next() {
      for (const item of requeue) item.dueIn -= 1;
      const dueIdx = requeue.findIndex((item) => item.dueIn <= 0);
      let degree;
      if (dueIdx !== -1 && requeue[dueIdx].degree !== lastDegree) {
        degree = requeue.splice(dueIdx, 1)[0].degree;
      } else {
        degree = drawRandom();
      }
      questionsAsked += 1;
      lastDegree = degree;
      currentDegree = degree;
      return degree;
    },
    /** Grade an answer; wrong answers re-queue the degree. */
    recordAnswer(answeredDegree) {
      const correct = answeredDegree === currentDegree;
      if (!correct && !requeue.some((item) => item.degree === currentDegree)) {
        requeue.push({ degree: currentDegree, dueIn: REQUEUE_AFTER });
      }
      return correct;
    },
  };
}
