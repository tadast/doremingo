// Theory core — pure functions, no DOM, no audio.
// Vocabulary per CONTEXT.md: Degree, Cadence, Key, Resolution.
// ADR-0001: everything is relative to a tonic; note names never leak to the UI.

export const SCALES = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10], // natural minor
};

export const MAJOR_SCALE = SCALES.major;

// Degrees are keyed by 1-7 (diatonic) or a solfège token (chromatic).
// `label` is what the small number caption shows.
export const DEGREES = {
  major: {
    1: { off: 0, name: 'Do', label: '1' },
    2: { off: 2, name: 'Re', label: '2' },
    3: { off: 4, name: 'Mi', label: '3' },
    4: { off: 5, name: 'Fa', label: '4' },
    5: { off: 7, name: 'Sol', label: '5' },
    6: { off: 9, name: 'La', label: '6' },
    7: { off: 11, name: 'Ti', label: '7' },
    ra: { off: 1, name: 'Ra', label: '♭2' },
    me: { off: 3, name: 'Me', label: '♭3' },
    fi: { off: 6, name: 'Fi', label: '♯4' },
    le: { off: 8, name: 'Le', label: '♭6' },
    te: { off: 10, name: 'Te', label: '♭7' },
  },
  minor: {
    1: { off: 0, name: 'Do', label: '1' },
    2: { off: 2, name: 'Re', label: '2' },
    3: { off: 3, name: 'Me', label: '♭3' },
    4: { off: 5, name: 'Fa', label: '4' },
    5: { off: 7, name: 'Sol', label: '5' },
    6: { off: 8, name: 'Le', label: '♭6' },
    7: { off: 10, name: 'Te', label: '♭7' },
  },
};

// Kept for the tutorial and tests that speak plain major-scale solfège.
export const SOLFEGE = {
  1: 'Do', 2: 'Re', 3: 'Mi', 4: 'Fa', 5: 'Sol', 6: 'La', 7: 'Ti',
};

export function degreeInfo(key, mode = 'major') {
  const info = DEGREES[mode][key];
  if (!info) throw new RangeError(`unknown degree ${key} in ${mode}`);
  return info;
}

const mod12 = (n) => ((n % 12) + 12) % 12;

/**
 * MIDI pitch for a degree of the key rooted at tonicMidi.
 * key: 1-7 or a chromatic token ('fi', 'te', …). octaveOffset shifts octaves.
 */
export function degreeToMidi(tonicMidi, key, octaveOffset = 0, mode = 'major') {
  return tonicMidi + degreeInfo(key, mode).off + 12 * octaveOffset;
}

/**
 * Degree key (1-7 or chromatic token) of a MIDI pitch relative to tonicMidi.
 * Returns null for pitches the mode has no name for.
 */
export function midiToDegree(tonicMidi, midi, mode = 'major') {
  const offset = mod12(midi - tonicMidi);
  for (const [key, info] of Object.entries(DEGREES[mode])) {
    if (info.off === offset) return /^\d$/.test(key) ? Number(key) : key;
  }
  return null;
}

/**
 * Stepwise walk from a note home to the nearest Do, inclusive of both ends.
 * Offsets 1-5 semitones above Do walk down, 6-11 walk up (nearest-tonic rule
 * used by functional ear training). Chromatic notes step onto the adjacent
 * scale tone first. Do returns [Do].
 */
export function resolutionPath(tonicMidi, midi, mode = 'major') {
  const scale = SCALES[mode];
  const path = [midi];
  let current = midi;
  const startOffset = mod12(current - tonicMidi);
  if (startOffset === 0) return path;
  const down = startOffset <= 5;
  while (mod12(current - tonicMidi) !== 0) {
    const off = mod12(current - tonicMidi);
    if (down) {
      const below = scale.filter((s) => s < off);
      const next = below.length ? Math.max(...below) : 0;
      current -= off - next;
    } else {
      const above = scale.filter((s) => s > off);
      const next = above.length ? Math.min(...above) : 12;
      current += next - off;
    }
    path.push(current);
  }
  return path;
}

/**
 * Cadence as four chords (arrays of MIDI pitches), smoothly voiced around
 * the tonic with a bass note an octave below. Major: I-IV-V-I.
 * Minor: i-iv-V-i (V borrows the raised leading tone, as in harmonic minor).
 */
export function cadenceChords(tonicMidi, mode = 'major') {
  const t = tonicMidi;
  const third = mode === 'minor' ? 3 : 4;
  const sixth = mode === 'minor' ? 8 : 9;
  return [
    [t - 12, t, t + third, t + 7],
    [t - 7, t, t + 5, t + sixth],
    [t - 5, t - 1, t + 2, t + 7],
    [t - 12, t, t + third, t + 7],
  ];
}
