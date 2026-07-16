// Share text — spoiler-free. Emoji grid only: no Degree names, so posting it
// never gives the answer away. 🟩 right note + right spot, 🟨 right note wrong
// spot, ⬜ not in the tune (Melody); 🟩/⬜ right/wrong (Sprint).
//
// Daily is a shelf of games, so every header names its game and every link
// deep-links to it — two grids pasted together must be tellable apart.

const EMOJI = { green: '🟩', yellow: '🟨', grey: '⬜' };

const SHARE_BASE = 'https://www.doremingo.com/daily/';

/** Deep link to one game's Daily. The /daily/ deploy reads this hash (main.js). */
export function shareUrl(gameId) {
  return `${SHARE_BASE}#/${gameId}`;
}

const gridOf = (rows) => rows.map((marks) => marks.map((m) => EMOJI[m]).join('')).join('\n');

/** "1:04" — a Sprint's elapsed time, the flex on the header line. */
export function formatElapsed(ms) {
  const total = Math.round(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

/**
 * buildShareText({ day, tier, solved, guesses, maxGuesses, rows })
 *   "DoReMingo Melody #142 · Hard  3/3
 *    🟩🟨⬜🟩🟩
 *    …"
 * A soft fail shows X/3. `tier` (Easy/Medium/Hard) is optional — omitted from
 * the header when absent (e.g. legacy results with no stored Tier).
 */
export function buildShareText({ day, tier, solved, guesses, maxGuesses, rows }) {
  const score = solved ? `${guesses}/${maxGuesses}` : `X/${maxGuesses}`;
  const head = tier ? `DoReMingo Melody #${day} · ${tier}` : `DoReMingo Melody #${day}`;
  return `${head}  ${score}\n${gridOf(rows)}\n${shareUrl('melody')}`;
}

/**
 * buildSprintShareText({ day, correct, rounds, elapsedMs, marks, perTier })
 *   "DoReMingo Sprint #142  11/12 · 1:04
 *    🟩🟩🟩🟩
 *    🟩🟩⬜🟩
 *    🟩⬜🟩🟩
 *    …"
 * One row per Tier, so the shape shows where the climb got you — a bottom row
 * of ⬜ reads very differently from a top row of them.
 */
export function buildSprintShareText({ day, correct, rounds, elapsedMs, marks, perTier = 4 }) {
  const rows = [];
  for (let i = 0; i < marks.length; i += perTier) rows.push(marks.slice(i, i + perTier));
  const head = `DoReMingo Sprint #${day}  ${correct}/${rounds} · ${formatElapsed(elapsedMs)}`;
  return `${head}\n${gridOf(rows)}\n${shareUrl('sprint')}`;
}
