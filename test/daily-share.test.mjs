import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { buildShareText, buildSprintShareText, formatElapsed, shareUrl } from '../js/daily/share.js';
import { DAILY_GAME_IDS } from '../js/daily/registry.js';

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

  // the link is the viral loop — it must deep-link to the playable web game.
  // A real path, not the app's #/melody hash: crawlers never see a fragment,
  // so a hash link would unfurl the wrong card (share.js: shareUrl).
  assert.ok(win.endsWith('https://www.doremingo.com/daily/melody/'));
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
  assert.equal(lines[5], 'https://www.doremingo.com/daily/sprint/');
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

// A share URL is only as good as the page behind it, and the two are declared
// far apart: the link here in js/, the page by the publish script. GitHub Pages
// has no rewrites, so a game with no stamped route ships links to a 404 —
// nothing but this catches that. Build files exist only in the private source
// repo, so skip in the published snapshot.
const publishScript = new URL('../bin/publish-web.sh', import.meta.url);
test('every game has a stamped page behind its share URL', { skip: !existsSync(publishScript) }, () => {
  const script = readFileSync(publishScript, 'utf8');
  for (const gameId of DAILY_GAME_IDS) {
    assert.match(
      script,
      new RegExp(`^\\s*"${gameId}\\|`, 'm'),
      `${gameId} shares ${shareUrl(gameId)} but publish-web.sh stamps no page there — the link would 404`,
    );
    assert.match(script, new RegExp(`og-${gameId}\\.png`), `${gameId} needs its own og image`);
  }
});

// The shell is stamped per route by swapping this block and moving the deploy
// root. Lose either marker and the publish aborts; lose <base> and every route
// below /daily/ boots blank. Cheap to assert, expensive to discover live.
const shell = new URL('../index.html', import.meta.url);
test('the app shell carries the seams the publish step stamps', { skip: !existsSync(publishScript) }, () => {
  const html = readFileSync(shell, 'utf8');
  assert.match(html, /route-meta:start/);
  assert.match(html, /route-meta:end/);
  assert.match(html, /<base href="\/">/, 'dev and iOS serve the app from the root');
  assert.match(html, /<meta name="deploy" content="full">/, 'the source shell is the full app');
});

// Which deploy this is must be *stated*, never deduced from the URL. It was
// deduced once — an http protocol plus a /daily pathname — and the moment
// /daily/sprint/ became a real route rather than a hash, "served under /daily/"
// and "routed to /daily/" read identically, so the full app hid its own Learn
// tab on refresh. The rule that keeps that from coming back: the flag is a
// constant in the source and a substitution in the publish step, and main.js
// reads it rather than inspecting location.
test('the deploy flavour is stamped, not inferred from the URL', { skip: !existsSync(publishScript) }, () => {
  const main = readFileSync(new URL('../js/main.js', import.meta.url), 'utf8');
  const dailyOnly = main.match(/const DAILY_ONLY\s*=\s*([\s\S]*?);/)?.[1] ?? '';
  assert.ok(dailyOnly.includes('meta[name="deploy"]'), 'DAILY_ONLY must read the stamped tag');
  assert.ok(
    !/location\.(pathname|protocol|href|hash)/.test(dailyOnly),
    'DAILY_ONLY must not sniff the URL — the route now lives there too',
  );

  const script = readFileSync(publishScript, 'utf8');
  assert.ok(script.includes('content="daily-only"'), 'the web deploy must stamp itself daily-only');
});

test('formatElapsed reads as m:ss', () => {
  assert.equal(formatElapsed(0), '0:00');
  assert.equal(formatElapsed(9000), '0:09');
  assert.equal(formatElapsed(64000), '1:04');
  assert.equal(formatElapsed(600000), '10:00');
});
