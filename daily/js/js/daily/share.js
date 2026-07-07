// Share text — spoiler-free. Emoji grid only: no Degree names, so posting it
// never gives the answer away. 🟩 right note + right spot, 🟨 right note wrong
// spot, ⬜ not in the tune.

const EMOJI = { green: '🟩', yellow: '🟨', grey: '⬜' };

const SHARE_URL = 'https://www.doremingo.com/daily';

/**
 * buildShareText({ day, solved, guesses, maxGuesses, rows })
 *   "DoReMingo Daily #142  4/6
 *    🟩🟨⬜🟩🟩
 *    …"
 * A soft fail shows X/6.
 */
export function buildShareText({ day, solved, guesses, maxGuesses, rows }) {
  const score = solved ? `${guesses}/${maxGuesses}` : `X/${maxGuesses}`;
  const grid = rows.map((marks) => marks.map((m) => EMOJI[m]).join('')).join('\n');
  return `DoReMingo Daily #${day}  ${score}\n${grid}\n${SHARE_URL}`;
}
