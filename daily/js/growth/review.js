// App Store review prompt — asked at delight moments only (3rd Melody solve or
// a 7-day streak), never after a fail, at most once per app version. The pure
// rule is separate from the Capacitor adapter so it unit-tests without a
// native bridge. No-op everywhere but the iOS app.

import { VERSION } from '../version.js';

/**
 * Pure rule: is right now a delight moment worth spending the prompt on?
 * Either Daily game can supply the delight — a solved Melody or a clean-sweep
 * Sprint — but a middling Sprint is not a moment worth spending the one ask on.
 */
export function shouldRequestReview({ daily, promptedVersion, version = VERSION }) {
  if (promptedVersion === version) return false; // one ask per release
  const melody = daily?.games?.melody;
  const sprint = daily?.games?.sprint;
  const sweptSprint = !!sprint?.today && sprint.today.correct === sprint.today.rounds;
  if (!melody?.today?.solved && !sweptSprint) return false; // never on the back of a fail
  return (melody?.wins ?? 0) >= 3 || (daily?.streak ?? 0) >= 7;
}

/**
 * Adapter: request the native review sheet if the rule says so. Marks the
 * version as prompted BEFORE the async call — the OS may or may not actually
 * show the sheet (Apple caps it at ~3/year), but we never ask it twice.
 * Returns true if a request was made.
 */
export async function maybeRequestReview({ state, store, capacitor = globalThis.Capacitor }) {
  if (!capacitor?.isNativePlatform?.()) return false;
  const plugin = capacitor.Plugins?.InAppReview;
  if (!plugin?.requestReview) return false;
  const growth = state.growth ?? {};
  if (!shouldRequestReview({ daily: state.daily, promptedVersion: growth.reviewPromptedVersion })) {
    return false;
  }
  state.growth = { ...growth, reviewPromptedVersion: VERSION };
  store.save(state);
  try {
    await plugin.requestReview();
  } catch {
    // The sheet is best-effort; a bridge error must never break the game.
  }
  return true;
}
