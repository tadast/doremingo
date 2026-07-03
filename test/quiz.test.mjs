import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createBar, applyAnswer, isFull } from '../js/quiz.js';

test('bar fills by 1 on correct answers', () => {
  let bar = createBar(15);
  bar = applyAnswer(bar, true);
  assert.equal(bar.value, 1);
});

test('bar drains by 0.5 on wrong answers, never below 0', () => {
  let bar = createBar(15);
  bar = applyAnswer(bar, false);
  assert.equal(bar.value, 0);
  bar = applyAnswer(applyAnswer(bar, true), false);
  assert.equal(bar.value, 0.5);
});

test('bar is full at its size and clamps above it', () => {
  let bar = createBar(3, 2);
  assert.equal(isFull(bar), false);
  bar = applyAnswer(bar, true);
  assert.equal(isFull(bar), true);
  bar = applyAnswer(bar, true);
  assert.equal(bar.value, 3);
});

test('createBar clamps initial values into range', () => {
  assert.equal(createBar(10, -4).value, 0);
  assert.equal(createBar(10, 99).value, 10);
});

test('default bar drains by 0.5 on a miss', () => {
  const bar = createBar(15, 5);
  assert.equal(applyAnswer(bar, false).value, 4.5);
});

test('a streak Bar (drain: Infinity) resets to 0 on a miss', () => {
  let bar = createBar(3, 0, { drain: Infinity });
  bar = applyAnswer(applyAnswer(bar, true), true);
  assert.equal(bar.value, 2);
  bar = applyAnswer(bar, false);
  assert.equal(bar.value, 0);
});

test('drain rule survives applyAnswer', () => {
  let bar = createBar(3, 0, { drain: Infinity });
  bar = applyAnswer(bar, true);
  assert.equal(bar.drain, Infinity);
});
