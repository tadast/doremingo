// Progress store — versioned persistence, storage injectable for tests.

const KEY = 'doremingo';
const VERSION = 1;

export function defaultState() {
  return {
    version: VERSION,
    clearedLevels: [],
    currentLevel: 1,
    bar: null, // in-progress bar value for currentLevel, or null
    tutorialDone: false,
    metNotes: [], // degrees already introduced via Meet-the-Note
    seenTheory: [], // level ids whose explainer auto-showed already
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
      if (state.version !== VERSION) return defaultState(); // future: migrate
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
