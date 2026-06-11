// Quiz engine — pure logic, no DOM, no audio.
// Bar rules per PRD: +1 correct, -0.5 wrong, floor 0, full bar clears the
// level. There is no fail state.

export const BAR_GAIN = 1;
export const BAR_DRAIN = 0.5;

export function createBar(size = 15, value = 0) {
  return { size, value: Math.min(Math.max(value, 0), size) };
}

export function applyAnswer(bar, correct) {
  const delta = correct ? BAR_GAIN : -BAR_DRAIN;
  return createBar(bar.size, bar.value + delta);
}

export function isFull(bar) {
  return bar.value >= bar.size;
}
