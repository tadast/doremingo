import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MeetSequence, tutorialSteps, levelMeetSteps, MEET_BLURBS } from '../js/meet.js';

test('MeetSequence walks the steps and reports the last', () => {
  const seq = new MeetSequence(['a', 'b', 'c']);
  assert.equal(seq.index, 0);
  assert.equal(seq.current, 'a');
  assert.equal(seq.isLast, false);

  assert.deepEqual(seq.next(), { done: false, step: 'b' });
  assert.equal(seq.index, 1);

  assert.deepEqual(seq.next(), { done: false, step: 'c' });
  assert.equal(seq.isLast, true);

  // next() at the last step finishes and does not advance past the end
  assert.deepEqual(seq.next(), { done: true });
  assert.equal(seq.index, 2);
});

test('single-step sequence is immediately last', () => {
  const seq = new MeetSequence(['only']);
  assert.equal(seq.isLast, true);
  assert.deepEqual(seq.next(), { done: true });
});

test('tutorialSteps: first unlocks audio, last starts the level', () => {
  const steps = tutorialSteps();
  assert.equal(steps.length, 6);
  assert.equal(steps[0].initAudio, true);
  assert.equal(steps[at(steps).last].nextLabel, 'Start Level 1');
  assert.ok(steps.some((s) => s.sound === 'cadence'), 'meets the Cadence');
  assert.deepEqual(steps.filter((s) => s.stage).map((s) => s.stage), [1, 3, 5]);
});

test('levelMeetSteps: one step per unmet Degree, last reads "quiz me"', () => {
  const steps = levelMeetSteps([6, 7], 60, 'major');
  assert.equal(steps.length, 2);
  assert.equal(steps[0].title, 'Meet La');
  assert.equal(steps[0].body, MEET_BLURBS[6]);
  assert.equal(steps[0].stage, 6);
  assert.equal(steps[0].resolve, true);
  assert.equal(steps[0].nextLabel, 'Next');
  assert.equal(steps[1].title, 'Meet Ti');
  assert.equal(steps[1].nextLabel, 'Got it — quiz me!');
});

function at(arr) {
  return { last: arr.length - 1 };
}
