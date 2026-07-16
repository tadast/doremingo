// Practice tours — step-by-step coach copy for first-timers, one game each. Pure
// data: the UI adapter owns the coach bubble DOM and triggers each step's audio.
//
// `plays` names what the step's button sounds: 'cadence' (home), 'melody' (the
// tune), 'note' (a single Question note), or null (hand the board over to normal
// play). The last step always hands over.

export function tourSteps({ maxGuesses }) {
  return [
    {
      id: 'home',
      text: 'Welcome! 🦩 Every puzzle starts at home 🏠 — a few chords that show your ear where the key lives. Have a listen:',
      button: '▶ Play home',
      plays: 'cadence',
    },
    {
      id: 'tune',
      text: 'That was home. Now comes the hidden tune 🎵 — a little melody you’ll tap back note by note. This one you might already know:',
      button: '▶ Play the tune',
      plays: 'melody',
    },
    {
      id: 'task',
      text: `Your turn! Tap the buttons below to echo the tune. Solid dot = right note, right spot · hollow ring = in the tune, another spot. You get ${maxGuesses} guesses — no losing, just listening. 👂`,
      button: 'Got it — let me try',
      plays: null,
    },
  ];
}

/**
 * Sprint's practice tour. Same shape, different game: home, then ONE note (the
 * whole mechanic), then the task. The practice pool is Do-Mi-Sol, so the steps
 * can promise three keys without lying (practice.js).
 */
export function sprintTourSteps({ rounds = 4 } = {}) {
  return [
    {
      id: 'home',
      text: 'Welcome! 🦩 Every run starts at home 🏠 — a few chords that show your ear where the key lives. Have a listen:',
      button: '▶ Play home',
      plays: 'cadence',
    },
    {
      id: 'note',
      text: 'That was home. Now one note 🎵 — that\'s the whole game. You hear it, you say which one it was:',
      button: '▶ Play a note',
      plays: 'note',
    },
    {
      id: 'task',
      text: `Your turn! Just Do, Mi and Sol here — the three notes of home. ${rounds} notes, one tap each, and nothing is timed. Tap 🔁 to hear one again as often as you like. 👂`,
      button: 'Got it — let me try',
      plays: null,
    },
  ];
}
