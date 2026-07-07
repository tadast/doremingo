// Flavour messages shown after a guess. Edit these lists freely — they're plain
// arrays. `{x}` in a streak message is replaced with the current streak length.
//
// Picking rules (see streakMessage / missMessage):
//   - 1 right (or 1 miss) in a row  → no flavour, the caller keeps it simple.
//   - exactly 2 right in a row       → SUCCESS_2
//   - 3+ right in a row              → STREAK_3PLUS  (use {x})
//   - 2+ misses in a row             → MISS

export const SUCCESS_2 = [
  'Pretty in pink and perfectly in pitch.',
  'Standing on one leg and still nailing it.',
  'Feather in your cap, note in your pocket. Smashed it.',
  'Pink-credible. Absolutely pink-credible.',
  'Clean catch.',
  'Do is for done. Flawless.',
  'Why watch cartoons when you can hear tunes?',
];

export const STREAK_3PLUS = [
  'Flock yeah! That was {x} in a row.',
  'That {x} in a row had migration-level commitment. Beautiful.',
  'Flamin-go or flamin-hot??? {x} in a row.',
  "That's maestro behaviour.",
  'Whole flock heard that one. Bravo.',
  "You're flamin-going strong! Keep it up.",
];

export const MISS = [
  'Even flamingos wobble on one leg. Try again.',
  "It's a flamin-go, not flamin-stop, keep going!",
  "Don't let it ruffle your feathers, have another go.",
  "You missed the note, but you've still got the flamin-go spirit.",
  'Every flamingo flocks up sometimes.',
  "That was a flaming-no, but the next one's a yes.",
  'Pink it off and try again.',
  'Wobbly landing, but flamingos always find their footing.',
  "The lagoon's still warm. Wade back in.",
  'Reset the stance. Try again.',
  'Flamingos eat the off notes and come back pinker. Go again.',
  'Even a still pond ripples. Let it settle and try once more.',
  'Missed the note, kept the nerve. That\'s the hard part done.',
  'Breathe in, lean in. Breathe out, chill out. You got this.',
];

// Shuffled bag: hands out every entry once (in random order) before any repeat,
// then reshuffles. Avoids the "same line twice in a row" feel of pure random.
function bag(arr) {
  let order = [];
  return () => {
    if (order.length === 0) {
      order = arr.map((_, i) => i);
      for (let i = order.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [order[i], order[j]] = [order[j], order[i]];
      }
    }
    return arr[order.pop()];
  };
}

const nextSuccess2 = bag(SUCCESS_2);
const nextStreak3 = bag(STREAK_3PLUS);
const nextMiss = bag(MISS);

// Returns flavour text for a winning streak, or null for a plain "nice one".
export function streakMessage(streak) {
  // On a 3+ streak, half the time use a plain success line instead of a
  // streak-specific one — keeps the streak callouts from feeling spammy.
  if (streak >= 3) {
    return Math.random() < 0.5 ? nextStreak3().replace(/\{x\}/g, streak) : nextSuccess2();
  }
  if (streak === 2) return nextSuccess2();
  return null;
}

// Returns encouragement after repeated misses, or null for the first miss.
export function missMessage(missStreak) {
  if (missStreak >= 2) return nextMiss();
  return null;
}
