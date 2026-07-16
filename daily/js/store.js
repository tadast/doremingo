// Progress store — versioned persistence, storage injectable for tests.

import { defaultDaily } from './daily/stats.js';

const KEY = 'doremingo';
// 2: Daily became a shelf of games — `daily` gained per-game blocks under
// `games` and a shared streak (ADR-0004). Bumping discards saved state (see
// load()); that was acceptable here because the game had no players yet. It
// will NOT be acceptable at the next bump — write a migration then.
const VERSION = 2;

export function defaultState() {
  return {
    version: VERSION,
    clearedLevels: [],
    currentLevel: 1,
    bar: null, // in-progress bar value for currentLevel, or null
    tutorialDone: false,
    metNotes: [], // degrees already introduced via Meet-the-Note
    seenTheory: [], // level ids whose explainer auto-showed already
    daily: defaultDaily(), // Daily mode stats + today's lock (see daily/stats.js)
    // Growth prompts (iOS app only): review ask + reminder opt-in choice.
    // notify: null = never offered, false = declined, true = reminders on.
    growth: { reviewPromptedVersion: null, notify: null },
  };
}

export class Store {
  constructor(storage = globalThis.localStorage) {
    this.storage = storage;
  }

  load() {
    try {
      const raw = this.storage.getItem(KEY);
      if (!raw) return defaultState();
      const state = JSON.parse(raw);
      // No migrations yet — an old save is dropped wholesale. Fine while the
      // only player is the author; once there are real saves this must migrate.
      if (state.version !== VERSION) return defaultState();
      return { ...defaultState(), ...state };
    } catch {
      return defaultState();
    }
  }

  save(state) {
    try {
      this.storage.setItem(KEY, JSON.stringify({ ...state, version: VERSION }));
    } catch {
      // storage unavailable (private mode etc.) — game still playable
    }
  }

  clear() {
    try {
      this.storage.removeItem(KEY);
    } catch {
      // storage unavailable — nothing to clear
    }
  }
}
