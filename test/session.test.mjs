import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSession } from '../js/quiz.js';
import { LEVELS, getLevel } from '../js/levels.js';

function seededRng(seed = 42) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 2 ** 32;
    return s / 2 ** 32;
  };
}

test('levels follow the progression shape', () => {
  assert.deepEqual(getLevel(1).degrees, [1, 3, 5]);
  // each level 2-5 adds exactly one new degree
  for (let id = 2; id <= 5; id++) {
    const prev = getLevel(id - 1);
    const cur = getLevel(id);
    assert.equal(cur.degrees.length, prev.degrees.length + 1);
    assert.ok(prev.degrees.every((d) => cur.degrees.includes(d)));
    assert.ok(cur.degrees.includes(cur.newDegree));
  }
  assert.deepEqual(getLevel(5).degrees, [1, 2, 3, 4, 5, 6, 7]);
  assert.equal(getLevel(6).cadenceEvery, 0);
  assert.equal(getLevel(99), null);
});

test('session draws only from the level degree pool', () => {
  const session = createSession(getLevel(2), seededRng());
  for (let i = 0; i < 100; i++) {
    assert.ok(getLevel(2).degrees.includes(session.next()));
  }
});

test('session avoids asking the same degree twice in a row', () => {
  const session = createSession(getLevel(1), seededRng());
  let prev = session.next();
  for (let i = 0; i < 100; i++) {
    const d = session.next();
    assert.notEqual(d, prev);
    prev = d;
  }
});

test('missed degree reappears within the next 3 questions', () => {
  const session = createSession(getLevel(5), seededRng(7));
  const missed = session.next();
  session.recordAnswer(missed === 7 ? 1 : 7); // deliberately wrong
  const upcoming = [session.next(), session.next(), session.next()];
  assert.ok(upcoming.includes(missed), `${missed} not in ${upcoming}`);
});

test('correct answers do not trigger re-queue clustering', () => {
  const session = createSession(getLevel(1), seededRng(3));
  const d = session.next();
  assert.equal(session.recordAnswer(d), true);
});

test('cadence policy: every question vs once per run', () => {
  const every = createSession(getLevel(1), seededRng());
  assert.equal(every.cadenceDue(), true);
  every.next();
  assert.equal(every.cadenceDue(), true);

  const once = createSession(getLevel(6), seededRng());
  assert.equal(once.cadenceDue(), true);
  once.next();
  assert.equal(once.cadenceDue(), false);
  once.next();
  assert.equal(once.cadenceDue(), false);
});

test('all levels stay diatonic and within degree range', () => {
  for (const level of LEVELS) {
    assert.ok(level.degrees.every((d) => d >= 1 && d <= 7));
    assert.ok(level.barSize > 0);
  }
});
