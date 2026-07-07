// Per-Degree positional feedback — pure.
//
// scoreGuess(target, guess) grades a guessed row of Degrees against the hidden
// melody, position by position:
//   'green'  — right Degree, right position
//   'yellow' — that Degree is in the tune, but not here (duplicate-capped)
//   'grey'   — Degree not in the tune (or all its slots already accounted for)
//
// Two passes: exact matches (green) first, then present-but-misplaced (yellow)
// drawn from a pool
// of the target's still-unmatched Degrees. So a Degree that appears once in the
// target but twice in the guess yields at most one green/yellow for it.

const key = (d) => String(d);

export function scoreGuess(target, guess) {
  if (guess.length !== target.length) {
    throw new RangeError(`guess length ${guess.length} ≠ target length ${target.length}`);
  }
  const marks = new Array(guess.length).fill('grey');

  // Pass 1: greens. Tally the remaining (unmatched) target Degrees.
  const remaining = new Map();
  for (let i = 0; i < target.length; i++) {
    if (key(guess[i]) === key(target[i])) {
      marks[i] = 'green';
    } else {
      const k = key(target[i]);
      remaining.set(k, (remaining.get(k) ?? 0) + 1);
    }
  }

  // Pass 2: yellows, consuming from the remaining pool left to right.
  for (let i = 0; i < guess.length; i++) {
    if (marks[i] === 'green') continue;
    const k = key(guess[i]);
    if ((remaining.get(k) ?? 0) > 0) {
      marks[i] = 'yellow';
      remaining.set(k, remaining.get(k) - 1);
    }
  }
  return marks;
}

/** True when every position is green. */
export function isSolved(marks) {
  return marks.every((m) => m === 'green');
}
