import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSession } from '../js/quiz.js';
import { LEVELS, getLevel } from '../js/levels.js';
import { degreeInfo } from '../js/theory.js';

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
    assert.ok(cur.newDegrees.every((d) => cur.degrees.includes(d)));
  }
  assert.deepEqual(getLevel(5).degrees, [1, 2, 3, 4, 5, 6, 7]);
  assert.equal(getLevel(6).cadenceEvery, 0);
  assert.equal(getLevel(99), null);
});

test('advanced levels: chromatic, minor, random keys, wide octaves', () => {
  assert.ok(getLevel(7).degrees.includes('fi') && getLevel(7).degrees.includes('te'));
  assert.deepEqual(getLevel(7).newDegrees, ['fi', 'te']);
  assert.equal(getLevel(8).mode, 'minor');
  assert.equal(getLevel(9).keyPool, 'random');
  assert.equal(getLevel(10).keyPool, 'random');
  assert.deepEqual(getLevel(10).octaves, [-1, 0, 1]);
});

test('session draws chromatic tokens from a chromatic pool', () => {
  const session = createSession(getLevel(7), seededRng(11));
  const seen = new Set();
  for (let i = 0; i < 300; i++) seen.add(session.next());
  assert.ok(seen.has('fi'));
  assert.ok(seen.has('te'));
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

test('missed degree reappears within the next 4 questions, timing varies', () => {
  const gaps = new Set();
  for (let seed = 1; seed <= 30; seed++) {
    const session = createSession(getLevel(5), seededRng(seed));
    const missed = session.next();
    session.recordAnswer(missed === 7 ? 1 : 7); // deliberately wrong
    const upcoming = [session.next(), session.next(), session.next(), session.next()];
    const at = upcoming.indexOf(missed);
    assert.notEqual(at, -1, `seed ${seed}: ${missed} not in ${upcoming}`);
    gaps.add(at);
  }
  assert.ok(gaps.size > 1, `re-queue gap never varied: always ${[...gaps]}`);
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

test('sequence levels produce in-pool, no-adjacent-repeat melodies', () => {
  for (const id of [11, 12]) {
    const lvl = getLevel(id);
    const session = createSession(lvl, seededRng(id));
    for (let i = 0; i < 50; i++) {
      const q = session.next();
      assert.equal(q.length, lvl.sequenceLength);
      assert.ok(q.every((d) => lvl.degrees.includes(d)));
      for (let j = 1; j < q.length; j++) assert.notEqual(q[j], q[j - 1]);
    }
  }
});

test('sequence grading is all-or-nothing and re-queues misses', () => {
  const session = createSession(getLevel(11), seededRng(5));
  const q = session.next();
  assert.equal(session.recordAnswer([...q]), true);
  const q2 = session.next();
  const wrong = [...q2];
  wrong[1] = wrong[1] === 1 ? 2 : 1;
  if (String(wrong) === String(q2)) wrong[1] = 3;
  assert.equal(session.recordAnswer(wrong), false);
  const upcoming = [session.next(), session.next(), session.next(), session.next()].map(String);
  assert.ok(upcoming.includes(String(q2)), `${q2} not in ${upcoming}`);
});

test('every level degree is a valid key in its mode', () => {
  for (const level of LEVELS) {
    const mode = level.mode ?? 'major';
    for (const d of level.degrees) {
      assert.ok(degreeInfo(d, mode), `level ${level.id} degree ${d}`);
    }
    assert.ok(level.barSize > 0);
  }
});
