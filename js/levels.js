// Level definitions — plain data. Progression shape per PRD:
// tonic triad → add one degree at a time → full diatonic → hold the key
// in your head. Advanced levels (chromatic, minor, random keys, sequences)
// extend this list in later issues.

export const LEVELS = [
  {
    id: 1,
    name: 'Home base',
    subtitle: 'Do, Mi and Sol — the home chord',
    degrees: [1, 3, 5],
    barSize: 15,
    cadenceEvery: 1, // cadence before every question
    tonic: 60, // C major
    newDegree: null,
  },
  {
    id: 2,
    name: 'Meet Re',
    subtitle: 'The step above home',
    degrees: [1, 2, 3, 5],
    barSize: 15,
    cadenceEvery: 1,
    tonic: 60,
    newDegree: 2,
  },
  {
    id: 3,
    name: 'Meet Fa',
    subtitle: 'The gentle leaner',
    degrees: [1, 2, 3, 4, 5],
    barSize: 15,
    cadenceEvery: 1,
    tonic: 60,
    newDegree: 4,
  },
  {
    id: 4,
    name: 'Meet La',
    subtitle: 'The dreamy one',
    degrees: [1, 2, 3, 4, 5, 6],
    barSize: 15,
    cadenceEvery: 1,
    tonic: 60,
    newDegree: 6,
  },
  {
    id: 5,
    name: 'Meet Ti',
    subtitle: 'The one that pulls home',
    degrees: [1, 2, 3, 4, 5, 6, 7],
    barSize: 15,
    cadenceEvery: 1,
    tonic: 60,
    newDegree: 7,
  },
  {
    id: 6,
    name: 'Memory master',
    subtitle: 'All seven notes — hear home once, hold it',
    degrees: [1, 2, 3, 4, 5, 6, 7],
    barSize: 20,
    cadenceEvery: 0, // cadence only at the start of a run
    tonic: 60,
    newDegree: null,
  },
];

export function getLevel(id) {
  return LEVELS.find((l) => l.id === id) ?? null;
}
