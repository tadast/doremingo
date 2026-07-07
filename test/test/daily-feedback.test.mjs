import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scoreGuess, isSolved } from '../js/daily/feedback.js';

test('all correct is all green', () => {
  assert.deepEqual(scoreGuess([1, 3, 5], [1, 3, 5]), ['green', 'green', 'green']);
  assert.ok(isSolved(scoreGuess([1, 3, 5], [1, 3, 5])));
});

test('right degree wrong place is yellow; absent is grey', () => {
  // target Do Mi Sol La Mi, guess Do Sol Mi Mi Re
  assert.deepEqual(
    scoreGuess([1, 3, 5, 6, 3], [1, 5, 3, 3, 2]),
    ['green', 'yellow', 'yellow', 'yellow', 'grey'],
  );
});

test('duplicate guess caps yellows at the target count', () => {
  // target has a single Mi (3); guessing Mi twice yields one green, one grey
  assert.deepEqual(scoreGuess([3, 1, 5], [3, 3, 3]), ['green', 'grey', 'grey']);
});

test('two target copies allow a green plus a yellow', () => {
  // target Mi Mi Sol; guess Sol Mi Mi → pos2 green, pos1 & pos3 compete for the
  // one remaining Mi: leftmost wins yellow, the other greys
  assert.deepEqual(scoreGuess([3, 3, 5], [5, 3, 3]), ['yellow', 'green', 'yellow']);
});

test('chromatic tokens are handled like any degree', () => {
  assert.deepEqual(scoreGuess([1, 'fi', 5], ['fi', 1, 5]), ['yellow', 'yellow', 'green']);
});

test('length mismatch throws', () => {
  assert.throws(() => scoreGuess([1, 2, 3], [1, 2]), RangeError);
});
