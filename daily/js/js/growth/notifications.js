// Opt-in local reminders — fully on-device, no push server, so the "No Data
// Collected" label stays true. Two notifications, both owned by this module:
//   1 · daily-ready  — fixed morning hour, repeats daily
//   2 · streak-risk  — one-shot this evening, only while a streak ≥2 is unplayed
// The plan is a pure function; the Capacitor adapter cancels + reschedules the
// whole set on every sync (app launch and daily finish), which also clears
// today's streak-risk the moment the puzzle is done. iOS app only.

export const DAILY_READY_ID = 1;
export const STREAK_RISK_ID = 2;
const READY_HOUR = 9;
const RISK_HOUR = 19;

/** Pure planner: which notifications should exist right now? */
export function planNotifications({ optIn, streak, playedToday, now }) {
  if (!optIn) return [];
  const plans = [
    {
      id: DAILY_READY_ID,
      title: 'Today’s melody is ready 🦩',
      body: 'A new DoReMingo Daily is waiting for your ear.',
      on: { hour: READY_HOUR, minute: 0 },
    },
  ];
  if (streak >= 2 && !playedToday) {
    const at = new Date(now);
    at.setHours(RISK_HOUR, 0, 0, 0);
    if (at > now) {
      plans.push({
        id: STREAK_RISK_ID,
        title: 'Your streak is waiting 🔥',
        body: `Solve today’s melody to keep your ${streak}-day streak alive.`,
        at,
      });
    }
  }
  return plans;
}

function plugin(capacitor) {
  if (!capacitor?.isNativePlatform?.()) return null;
  return capacitor.Plugins?.LocalNotifications ?? null;
}

/** Cancel + reschedule everything to match the plan. Safe to call anytime. */
export async function syncNotifications({ state, capacitor = globalThis.Capacitor, now = new Date(), playedToday }) {
  const ln = plugin(capacitor);
  if (!ln) return;
  const plans = planNotifications({
    optIn: state.growth?.notify === true,
    streak: state.daily?.streak ?? 0,
    playedToday,
    now,
  });
  try {
    await ln.cancel({ notifications: [{ id: DAILY_READY_ID }, { id: STREAK_RISK_ID }] });
    if (!plans.length) return;
    await ln.schedule({
      notifications: plans.map((p) => ({
        id: p.id,
        title: p.title,
        body: p.body,
        schedule: p.on
          ? { on: p.on, allowWhileIdle: true }
          : { at: p.at, allowWhileIdle: true },
      })),
    });
  } catch {
    // Reminders are a nicety — scheduling failures must never break the game.
  }
}

/**
 * One-time offer after the player has shown intent (2nd completed daily).
 * `confirm` is injectable for tests; defaults to the same blocking confirm()
 * the app already uses for destructive actions. Returns the recorded choice,
 * or null if the offer wasn't due.
 */
export async function offerNotifications({
  state,
  store,
  capacitor = globalThis.Capacitor,
  confirmFn = (msg) => globalThis.confirm(msg),
  now = new Date(),
}) {
  const ln = plugin(capacitor);
  if (!ln) return null;
  const growth = state.growth ?? {};
  if (growth.notify != null) return null; // already chose
  if ((state.daily?.played ?? 0) < 2) return null; // not enough intent yet
  const wants = confirmFn('Want a reminder when tomorrow’s melody is ready? You can change this later from the menu.');
  let notify = false;
  if (wants) {
    try {
      const perm = await ln.requestPermissions();
      notify = perm?.display === 'granted';
    } catch {
      notify = false;
    }
  }
  state.growth = { ...growth, notify };
  store.save(state);
  if (notify) await syncNotifications({ state, capacitor, now, playedToday: true });
  return notify;
}

/** Menu toggle: flip opt-in, request permission when turning on. */
export async function toggleNotifications({ state, store, capacitor = globalThis.Capacitor, now = new Date(), playedToday }) {
  const ln = plugin(capacitor);
  if (!ln) return false;
  const growth = state.growth ?? {};
  let notify = !(growth.notify === true);
  if (notify) {
    try {
      const perm = await ln.requestPermissions();
      notify = perm?.display === 'granted';
    } catch {
      notify = false;
    }
  }
  state.growth = { ...growth, notify };
  store.save(state);
  await syncNotifications({ state, capacitor, now, playedToday });
  return notify;
}
