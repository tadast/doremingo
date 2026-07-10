// Share text — spoiler-free. Emoji grid only: no Degree names, so posting it
// never gives the answer away. 🟩 right note + right spot, 🟨 right note wrong
// spot, ⬜ not in the tune.

const EMOJI = { green: '🟩', yellow: '🟨', grey: '⬜' };

const SHARE_URL = 'https://www.doremingo.com/daily';

/**
 * buildShareText({ day, tier, solved, guesses, maxGuesses, rows })
 *   "DoReMingo Daily #142 · Hard  3/3
 *    🟩🟨⬜🟩🟩
 *    …"
 * A soft fail shows X/3. `tier` (Easy/Medium/Hard) is optional — omitted from
 * the header when absent (e.g. legacy results with no stored Tier).
 */
export function buildShareText({ day, tier, solved, guesses, maxGuesses, rows }) {
  const score = solved ? `${guesses}/${maxGuesses}` : `X/${maxGuesses}`;
  const head = tier ? `DoReMingo Daily #${day} · ${tier}` : `DoReMingo Daily #${day}`;
  const grid = rows.map((marks) => marks.map((m) => EMOJI[m]).join('')).join('\n');
  return `${head}  ${score}\n${grid}\n${SHARE_URL}`;
}
