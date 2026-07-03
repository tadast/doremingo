import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMelodyGame } from '../js/daily/melody.js';

const target = [1, 3, 5, 6, 3]; // 5 notes → 5 guesses (a Guess per note)

test('solving early ends the game with solved + guess count', () => {
  const g = createMelodyGame({ target, maxGuesses: 5 });
  g.submit([1, 2, 3, 4, 5]); // wrong
  g.submit([1, 3, 5, 6, 3]); // right
  assert.ok(g.solved);
  assert.ok(g.done);
  assert.equal(g.guessesUsed, 2);
  assert.equal(g.result().guesses, 2);
});

test('using every guess soft-fails and reveals', () => {
  const g = createMelodyGame({ target, maxGuesses: 5 });
  for (let i = 0; i < 5; i++) g.submit([2, 2, 2, 2, 2]);
  assert.ok(g.failed);
  assert.ok(g.revealed);
  assert.equal(g.solved, false);
  assert.equal(g.result().solved, false);
  assert.equal(g.result().maxGuesses, 5);
});

test('submitting after the game is done throws', () => {
  const g = createMelodyGame({ target, maxGuesses: 6 });
  g.submit([1, 3, 5, 6, 3]);
  assert.throws(() => g.submit([1, 1, 1, 1, 1]));
});

test('isAbsent flags degrees not in the tune', () => {
  const g = createMelodyGame({ target, maxGuesses: 5 }); // target has 1,3,5,6
  assert.equal(g.isAbsent(2), true);
  assert.equal(g.isAbsent(4), true);
  assert.equal(g.isAbsent(3), false);
  assert.equal(g.isAbsent('6'), false); // string/number agnostic
});

test('result carries the emoji-ready mark rows', () => {
  const g = createMelodyGame({ target, maxGuesses: 6 });
  g.submit([1, 5, 3, 3, 2]);
  const { rows } = g.result();
  assert.deepEqual(rows[0], ['green', 'yellow', 'yellow', 'yellow', 'grey']);
});
