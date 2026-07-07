// Level definitions — plain data. Progression shape per PRD:
// tonic triad → add one degree at a time → full diatonic → hold the key
// in your head → chromatic colours → minor → random keys.
// Sequence levels extend this list in a later issue.
//
// Fields: degrees (pool of degree keys), mode ('major'|'minor', default
// major), keyPool ('fixed'|'random'), octaves (offsets to roam, default [0]),
// cadenceEvery (1 = every question, 0 = once per run), newDegrees (degrees
// that get a Meet-the-Note on first entry).

export const LEVELS = [
  {
    id: 1,
    name: 'Home base',
    subtitle: 'Do, Mi and Sol — the home chord',
    degrees: [1, 3, 5],
    barSize: 15,
    cadenceEvery: 1, // cadence before every question
    tonic: 60, // C major
    newDegrees: [],
  },
  {
    id: 2,
    name: 'Meet Re',
    subtitle: 'The step above home',
    degrees: [1, 2, 3, 5],
    barSize: 15,
    cadenceEvery: 1,
    tonic: 60,
    newDegrees: [2],
  },
  {
    id: 3,
    name: 'Meet Fa',
    subtitle: 'The gentle leaner',
    degrees: [1, 2, 3, 4, 5],
    barSize: 15,
    cadenceEvery: 1,
    tonic: 60,
    newDegrees: [4],
  },
  {
    id: 4,
    name: 'Meet La',
    subtitle: 'The dreamy one',
    degrees: [1, 2, 3, 4, 5, 6],
    barSize: 15,
    cadenceEvery: 1,
    tonic: 60,
    newDegrees: [6],
  },
  {
    id: 5,
    name: 'Meet Ti',
    subtitle: 'The one that pulls home',
    degrees: [1, 2, 3, 4, 5, 6, 7],
    barSize: 15,
    cadenceEvery: 1,
    tonic: 60,
    newDegrees: [7],
  },
  {
    id: 6,
    name: 'Memory master',
    subtitle: 'All seven notes — hear home once, hold it',
    degrees: [1, 2, 3, 4, 5, 6, 7],
    barSize: 20,
    cadenceEvery: 0, // cadence only at the start of a run
    tonic: 60,
    newDegrees: [],
  },
  {
    id: 7,
    name: 'Colour notes',
    subtitle: 'Fi and Te — notes between the steps',
    degrees: [1, 2, 3, 4, 5, 6, 7, 'fi', 'te'],
    barSize: 15,
    cadenceEvery: 1,
    tonic: 60,
    newDegrees: ['fi', 'te'],
  },
  {
    id: 8,
    name: 'The minor side',
    subtitle: 'Same game, moodier home',
    degrees: [1, 2, 3, 4, 5, 6, 7],
    mode: 'minor',
    barSize: 15,
    cadenceEvery: 1,
    tonic: 57, // A minor
    newDegrees: [],
  },
  {
    id: 9,
    name: 'Wandering home',
    subtitle: 'Every run, home moves to a new key',
    degrees: [1, 2, 3, 4, 5, 6, 7],
    keyPool: 'random',
    barSize: 15,
    cadenceEvery: 1,
    newDegrees: [],
  },
  {
    id: 10,
    name: 'Anywhere, any note',
    subtitle: 'New keys, colour notes, high and low',
    degrees: [1, 2, 3, 4, 5, 6, 7, 'fi', 'te'],
    keyPool: 'random',
    octaves: [-1, 0, 1],
    barSize: 20,
    cadenceEvery: 1,
    newDegrees: [],
  },
  {
    id: 11,
    name: 'Two-note tunes',
    subtitle: 'Hear a tiny melody, name both notes',
    degrees: [1, 2, 3, 4, 5, 6, 7],
    sequenceLength: 2,
    barSize: 12,
    cadenceEvery: 1,
    tonic: 60,
    newDegrees: [],
  },
  {
    id: 12,
    name: 'Three-note tunes',
    subtitle: 'Real melody fragments, any key',
    degrees: [1, 2, 3, 4, 5, 6, 7],
    sequenceLength: 3,
    keyPool: 'random',
    barSize: 12,
    cadenceEvery: 1,
    newDegrees: [],
  },
];

export function getLevel(id) {
  return LEVELS.find((l) => l.id === id) ?? null;
}
