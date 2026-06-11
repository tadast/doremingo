import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  degreeToMidi,
  midiToDegree,
  resolutionPath,
  cadenceChords,
  degreeInfo,
  SOLFEGE,
} from '../js/theory.js';

const C4 = 60;

test('degreeToMidi maps the C major scale', () => {
  assert.deepEqual(
    [1, 2, 3, 4, 5, 6, 7].map((d) => degreeToMidi(C4, d)),
    [60, 62, 64, 65, 67, 69, 71],
  );
});

test('degreeToMidi respects octave offset and other tonics', () => {
  assert.equal(degreeToMidi(C4, 1, 1), 72);
  assert.equal(degreeToMidi(C4, 5, -1), 55);
  assert.equal(degreeToMidi(65, 3), 69); // F major: Mi = A
});

test('degreeToMidi rejects out-of-range degrees', () => {
  assert.throws(() => degreeToMidi(C4, 0), RangeError);
  assert.throws(() => degreeToMidi(C4, 8), RangeError);
});

test('midiToDegree inverts degreeToMidi across octaves', () => {
  for (let d = 1; d <= 7; d++) {
    assert.equal(midiToDegree(C4, degreeToMidi(C4, d)), d);
    assert.equal(midiToDegree(C4, degreeToMidi(C4, d, 1)), d);
    assert.equal(midiToDegree(C4, degreeToMidi(C4, d, -1)), d);
  }
  assert.equal(midiToDegree(C4, 61), 'ra'); // chromatic degrees have tokens
  assert.equal(midiToDegree(C4, 66), 'fi');
  assert.equal(midiToDegree(C4, 64, 'minor'), null); // no major third in minor
});

test('resolutionPath walks Mi down to Do', () => {
  assert.deepEqual(resolutionPath(C4, 64), [64, 62, 60]);
});

test('resolutionPath walks Sol up to Do', () => {
  assert.deepEqual(resolutionPath(C4, 67), [67, 69, 71, 72]);
});

test('resolutionPath on Do is just Do', () => {
  assert.deepEqual(resolutionPath(C4, 60), [60]);
});

test('resolutionPath always ends on a Do, any degree, any octave', () => {
  for (let d = 1; d <= 7; d++) {
    for (const oct of [-1, 0, 1]) {
      const start = degreeToMidi(C4, d, oct);
      const path = resolutionPath(C4, start);
      const end = path[path.length - 1];
      assert.equal(((end - C4) % 12 + 12) % 12, 0, `degree ${d} oct ${oct}`);
      assert.equal(path[0], start);
      // stepwise: adjacent steps are 1 or 2 semitones
      for (let i = 1; i < path.length; i++) {
        const step = Math.abs(path[i] - path[i - 1]);
        assert.ok(step === 1 || step === 2, `step ${step}`);
      }
    }
  }
});

test('resolutionPath handles chromatic degrees', () => {
  // Fi steps onto Sol then climbs home
  assert.deepEqual(resolutionPath(C4, 66), [66, 67, 69, 71, 72]);
  // Te pushes up through Ti
  assert.deepEqual(resolutionPath(C4, 70), [70, 71, 72]);
});

test('minor mode: degrees, resolution and cadence', () => {
  const A3 = 57;
  assert.equal(degreeToMidi(A3, 3, 0, 'minor'), 60); // Me = C in A minor
  assert.equal(degreeInfo(3, 'minor').name, 'Me');
  // Me walks down Me-Re-Do in minor
  assert.deepEqual(resolutionPath(A3, 60, 'minor'), [60, 59, 57]);
  // Te climbs home through the whole tone
  assert.deepEqual(resolutionPath(A3, 67, 'minor'), [67, 69]);
  const chords = cadenceChords(A3, 'minor');
  const pcs = (chord) => new Set(chord.map((m) => ((m - A3) % 12 + 12) % 12));
  assert.deepEqual(pcs(chords[0]), new Set([0, 3, 7])); // i
  assert.deepEqual(pcs(chords[1]), new Set([0, 5, 8])); // iv
  assert.deepEqual(pcs(chords[2]), new Set([7, 11, 2])); // V with leading tone
});

test('cadenceChords is I-IV-V-I with correct pitch classes', () => {
  const chords = cadenceChords(C4);
  assert.equal(chords.length, 4);
  const pcs = (chord) => new Set(chord.map((m) => ((m - C4) % 12 + 12) % 12));
  assert.deepEqual(pcs(chords[0]), new Set([0, 4, 7])); // I
  assert.deepEqual(pcs(chords[1]), new Set([0, 5, 9])); // IV (2nd inv colour)
  assert.deepEqual(pcs(chords[2]), new Set([7, 11, 2])); // V
  assert.deepEqual(pcs(chords[3]), new Set([0, 4, 7])); // I
});

test('solfège covers degrees 1-7', () => {
  assert.deepEqual(Object.keys(SOLFEGE).map(Number), [1, 2, 3, 4, 5, 6, 7]);
  assert.equal(SOLFEGE[1], 'Do');
  assert.equal(SOLFEGE[7], 'Ti');
});
