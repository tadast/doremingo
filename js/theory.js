// Theory core — pure functions, no DOM, no audio.
// Vocabulary per CONTEXT.md: Degree, Cadence, Key, Resolution.
// ADR-0001: everything is relative to a tonic; note names never leak to the UI.

export const MAJOR_SCALE = [0, 2, 4, 5, 7, 9, 11];

export const SOLFEGE = {
  1: 'Do',
  2: 'Re',
  3: 'Mi',
  4: 'Fa',
  5: 'Sol',
  6: 'La',
  7: 'Ti',
};

/**
 * MIDI pitch for a degree of the major key rooted at tonicMidi.
 * degree 1-7, octaveOffset shifts whole octaves.
 */
export function degreeToMidi(tonicMidi, degree, octaveOffset = 0) {
  if (degree < 1 || degree > 7 || !Number.isInteger(degree)) {
    throw new RangeError(`degree out of range: ${degree}`);
  }
  return tonicMidi + MAJOR_SCALE[degree - 1] + 12 * octaveOffset;
}

/**
 * Degree (1-7) of a diatonic MIDI pitch relative to tonicMidi.
 * Returns null for non-diatonic pitches.
 */
export function midiToDegree(tonicMidi, midi) {
  const offset = ((midi - tonicMidi) % 12 + 12) % 12;
  const idx = MAJOR_SCALE.indexOf(offset);
  return idx === -1 ? null : idx + 1;
}

/**
 * Stepwise walk from a diatonic note home to the nearest Do, inclusive of
 * both ends. Degrees 1-4 walk down, 5-7 walk up (nearest-tonic rule used by
 * functional ear training). Do returns [Do].
 */
export function resolutionPath(tonicMidi, midi) {
  const degree = midiToDegree(tonicMidi, midi);
  if (degree === null) {
    throw new RangeError(`not diatonic in this key: ${midi}`);
  }
  const path = [midi];
  let current = midi;
  let idx = degree - 1;
  const down = degree <= 4;
  while (((current - tonicMidi) % 12 + 12) % 12 !== 0) {
    if (down) {
      const prevIdx = (idx + 6) % 7;
      current -= (MAJOR_SCALE[idx] - (MAJOR_SCALE[prevIdx] - (idx === 0 ? 12 : 0)));
      idx = prevIdx;
    } else {
      const nextIdx = (idx + 1) % 7;
      current += ((MAJOR_SCALE[nextIdx] + (nextIdx === 0 ? 12 : 0)) - MAJOR_SCALE[idx]);
      idx = nextIdx;
    }
    path.push(current);
  }
  return path;
}

/**
 * I-IV-V-I cadence as four chords (arrays of MIDI pitches), smoothly voiced
 * around the tonic with a bass note an octave below.
 */
export function cadenceChords(tonicMidi) {
  const t = tonicMidi;
  return [
    [t - 12, t, t + 4, t + 7], // I:  C  / C E G
    [t - 7, t, t + 5, t + 9],  // IV: F  / C F A
    [t - 5, t - 1, t + 2, t + 7], // V: G / B D G
    [t - 12, t, t + 4, t + 7], // I
  ];
}
