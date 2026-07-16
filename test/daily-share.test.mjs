import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildShareText, buildSprintShareText, formatElapsed, shareUrl } from '../js/daily/share.js';

test('Melody share text is spoiler-free emoji with the right score line', () => {
  const win = buildShareText({
    day: 142, solved: true, guesses: 4, maxGuesses: 6,
    rows: [['green', 'yellow', 'grey', 'green', 'green']],
  });
  assert.ok(win.startsWith('DoReMingo Melody #142  4/6'));
  assert.ok(win.includes('🟩🟨⬜🟩🟩'));
  // the grid row carries no degree names — only emoji
  assert.ok(!/[A-Za-z]/.test(win.split('\n')[1]));

  const loss = buildShareText({ day: 9, solved: false, guesses: 6, maxGuesses: 6, rows: [] });
  assert.ok(loss.includes('X/6'));

  // the link is the viral loop — it must deep-link to the playable web game
  assert.ok(win.endsWith('https://www.doremingo.com/daily/#/melody'));
});

test('Melody share text carries the difficulty Tier when given', () => {
  const tiered = buildShareText({
    day: 142, tier: 'Hard', solved: true, guesses: 3, maxGuesses: 3,
    rows: [['green', 'green', 'green', 'green', 'green']],
  });
  assert.ok(tiered.startsWith('DoReMingo Melody #142 · Hard  3/3'));
  // no Tier → header falls back to the plain number
  const plain = buildShareText({ day: 142, solved: true, guesses: 3, maxGuesses: 3, rows: [] });
  assert.ok(plain.startsWith('DoReMingo Melody #142  3/3'));
});

// Four Tiers of four — the grid pastes as a square.
test('Sprint share text chunks the marks into one row per Tier', () => {
  const text = buildSprintShareText({
    day: 18, correct: 12, rounds: 16, elapsedMs: 64000, perTier: 4,
    marks: [
      'green', 'green', 'green', 'green',
      'green', 'green', 'grey', 'green',
      'green', 'grey', 'green', 'green',
      'grey', 'green', 'grey', 'green',
    ],
  });
  const lines = text.split('\n');
  assert.equal(lines[0], 'DoReMingo Sprint #18  12/16 · 1:04');
  assert.equal(lines[1], '🟩🟩🟩🟩');
  assert.equal(lines[2], '🟩🟩⬜🟩');
  assert.equal(lines[3], '🟩⬜🟩🟩');
  assert.equal(lines[4], '⬜🟩⬜🟩', 'the Master row');
  assert.equal(lines[5], 'https://www.doremingo.com/daily/#/sprint');
});

test('Sprint share text names no Degree', () => {
  const text = buildSprintShareText({
    day: 1, correct: 1, rounds: 2, elapsedMs: 1000, perTier: 2,
    marks: ['green', 'grey'],
  });
  // only the header and URL may carry letters — never the grid
  assert.ok(!/[A-Za-z]/.test(text.split('\n')[1]));
});

test('the two games are tellable apart in one paste', () => {
  const melody = buildShareText({ day: 18, solved: true, guesses: 2, maxGuesses: 3, rows: [] });
  const sprint = buildSprintShareText({ day: 18, correct: 12, rounds: 12, elapsedMs: 1000, marks: [] });
  assert.notEqual(melody.split('\n')[0], sprint.split('\n')[0]);
  assert.notEqual(shareUrl('melody'), shareUrl('sprint'));
});

test('formatElapsed reads as m:ss', () => {
  assert.equal(formatElapsed(0), '0:00');
  assert.equal(formatElapsed(9000), '0:09');
  assert.equal(formatElapsed(64000), '1:04');
  assert.equal(formatElapsed(600000), '10:00');
});
