import { test } from 'node:test';
import assert from 'node:assert/strict';

import { tourSteps } from '../js/daily/tour.js';
import { practiceConfig } from '../js/daily/practice.js';

test('tour has three steps, each with copy and a button label', () => {
  const steps = tourSteps({ maxGuesses: 5 });
  assert.equal(steps.length, 3);
  for (const s of steps) {
    assert.ok(s.text.length > 0);
    assert.ok(s.button.length > 0);
  }
});

test('steps play cadence, then melody, then hand over', () => {
  const steps = tourSteps({ maxGuesses: 5 });
  assert.deepEqual(steps.map((s) => s.plays), ['cadence', 'melody', null]);
});

test('the task step states the number of guesses', () => {
  const steps = tourSteps({ maxGuesses: 5 });
  assert.match(steps[2].text, /5 guesses/);
});

test('accepts the real practice config', () => {
  const steps = tourSteps(practiceConfig());
  assert.match(steps[2].text, new RegExp(`${practiceConfig().maxGuesses} guesses`));
});
