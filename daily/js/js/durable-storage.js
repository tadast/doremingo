// Durable storage for native iOS.
//
// WKWebView localStorage is treated as an evictable cache: iOS can purge it
// under storage pressure (and stale-data rules), so progress vanishes with no
// reinstall. On native we mirror to Capacitor Preferences (backed by
// UserDefaults), which is durable. Web stays on plain localStorage.
//
// Store's interface is synchronous, so we hydrate Preferences into an in-memory
// cache once at boot and write through on every set. Reads are sync from cache;
// writes fan out to localStorage (fast path / web) and Preferences (durable).

const STORE_KEYS = ['doremingo'];

const isNative = () => !!globalThis.Capacitor?.isNativePlatform?.();
const nativePrefs = () => globalThis.Capacitor?.Plugins?.Preferences || null;

export async function createDurableStorage(keys = STORE_KEYS) {
  const local = globalThis.localStorage;
  const prefs = isNative() ? nativePrefs() : null;
  if (!prefs) return local; // web, or plugin missing — plain localStorage

  const mem = {};
  for (const key of keys) {
    let value = null;
    try {
      value = (await prefs.get({ key }))?.value ?? null;
    } catch { /* Preferences unavailable — fall through to localStorage */ }
    if (value == null) {
      // Migrate users created before this change: seed Preferences from any
      // surviving localStorage value.
      try { value = local?.getItem(key) ?? null; } catch { /* ignore */ }
      if (value != null) { try { await prefs.set({ key, value }); } catch { /* ignore */ } }
    }
    if (value != null) mem[key] = value;
  }

  return {
    getItem(key) {
      return key in mem ? mem[key] : null;
    },
    setItem(key, value) {
      const v = String(value);
      mem[key] = v;
      try { local?.setItem(key, v); } catch { /* ignore */ }
      prefs.set({ key, value: v }).catch(() => {});
    },
    removeItem(key) {
      delete mem[key];
      try { local?.removeItem(key); } catch { /* ignore */ }
      prefs.remove({ key }).catch(() => {});
    },
  };
}
