// Bits every Daily game's UI adapter needs: putting a share text somewhere the
// player can paste it, and the "next puzzle in…" countdown to local midnight.
//
// This is deliberately thin. The two adapters (ui.js for Melody, ui-sprint.js
// for Sprint) are otherwise separate concrete implementations — a third game
// earns an abstraction over them, two do not (ADR-0004).

/**
 * Share sheet → clipboard → dump the text on screen. Each fallback exists for a
 * real platform: navigator.share is iOS/Android, clipboard is desktop browsers,
 * and the on-screen dump covers insecure origins where both are missing (there
 * is no way to copy for the player, so at least let them select it).
 */
export function copyShare(text, statusEl) {
  const done = () => {
    statusEl.textContent = 'Copied to clipboard ✓';
  };
  if (navigator.share) {
    navigator.share({ text }).catch(() => navigator.clipboard?.writeText(text).then(done));
  } else if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(done, () => {
      statusEl.textContent = text;
    });
  } else {
    statusEl.textContent = text;
  }
}

/**
 * Ticking countdown to the next local midnight — when the day's lock lifts.
 * `isVisible` lets the timer stop itself once its screen goes away, so a
 * forgotten interval can't keep the app awake.
 */
export function createCountdown({ el, now, isVisible }) {
  let timer = null;

  function tick() {
    if (!isVisible()) {
      stop();
      return;
    }
    const d = now();
    const next = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
    const ms = next - d;
    const h = String(Math.floor(ms / 3600000)).padStart(2, '0');
    const m = String(Math.floor((ms % 3600000) / 60000)).padStart(2, '0');
    const s = String(Math.floor((ms % 60000) / 1000)).padStart(2, '0');
    el.textContent = `Next puzzle in ${h}:${m}:${s}`;
  }

  function start() {
    stop();
    tick();
    timer = setInterval(tick, 1000);
  }

  function stop() {
    clearInterval(timer);
    timer = null;
  }

  return { start, stop };
}
