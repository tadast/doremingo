// Practice tour — step-by-step coach copy for first-timers. Pure data: the UI
// adapter (ui.js) owns the coach bubble DOM and triggers each step's audio.
//
// `plays` names what the step's button sounds: 'cadence' (home), 'melody'
// (the tune), or null (hand the board over to normal play).

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
