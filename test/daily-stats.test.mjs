import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultDaily, recordResult, isPlayed, winPercent } from '../js/daily/stats.js';
import { buildShareText } from '../js/daily/share.js';

test('first win starts a streak of one', () => {
  const s = recordResult(defaultDaily(), { day: 1, solved: true, guesses: 3, rows: [] });
  assert.equal(s.streak, 1);
  assert.equal(s.maxStreak, 1);
  assert.equal(s.wins, 1);
  assert.equal(s.played, 1);
  assert.deepEqual(s.dist, [0, 0, 1, 0, 0, 0, 0]); // 7 buckets (max 7-note day)
});

test('consecutive solved days extend the streak', () => {
  let s = recordResult(defaultDaily(), { day: 1, solved: true, guesses: 2, rows: [] });
  s = recordResult(s, { day: 2, solved: true, guesses: 4, rows: [] });
  assert.equal(s.streak, 2);
  assert.equal(s.maxStreak, 2);
});

test('a soft fail breaks the streak but keeps maxStreak', () => {
  let s = recordResult(defaultDaily(), { day: 1, solved: true, guesses: 2, rows: [] });
  s = recordResult(s, { day: 2, solved: false, guesses: 6, rows: [] });
  assert.equal(s.streak, 0);
  assert.equal(s.maxStreak, 1);
  assert.equal(s.played, 2);
  assert.equal(s.wins, 1);
});

test('a skipped day resets the streak to one on the next win', () => {
  let s = recordResult(defaultDaily(), { day: 1, solved: true, guesses: 2, rows: [] });
  s = recordResult(s, { day: 3, solved: true, guesses: 2, rows: [] }); // day 2 skipped
  assert.equal(s.streak, 1);
});

test('isPlayed locks only the recorded day', () => {
  const s = recordResult(defaultDaily(), { day: 5, solved: true, guesses: 1, rows: [] });
  assert.ok(isPlayed(s, 5));
  assert.ok(!isPlayed(s, 6));
});

test('winPercent rounds wins over played', () => {
  let s = recordResult(defaultDaily(), { day: 1, solved: true, guesses: 1, rows: [] });
  s = recordResult(s, { day: 2, solved: false, guesses: 6, rows: [] });
  assert.equal(winPercent(s), 50);
});

test('share text is spoiler-free emoji with the right score line', () => {
  const win = buildShareText({
    day: 142, solved: true, guesses: 4, maxGuesses: 6,
    rows: [['green', 'yellow', 'grey', 'green', 'green']],
  });
  assert.ok(win.startsWith('DoReMingo Daily #142  4/6'));
  assert.ok(win.includes('🟩🟨⬜🟩🟩'));
  // the grid row carries no degree names — only emoji
  assert.ok(!/[A-Za-z]/.test(win.split('\n')[1]));

  const loss = buildShareText({
    day: 9, solved: false, guesses: 6, maxGuesses: 6, rows: [],
  });
  assert.ok(loss.includes('X/6'));

  // the link is the viral loop — it must land on the playable web daily
  assert.ok(win.endsWith('https://www.doremingo.com/daily'));
});
