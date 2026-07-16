import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shouldRequestReview, maybeRequestReview } from '../js/growth/review.js';
import {
  planNotifications, syncNotifications, offerNotifications,
  DAILY_READY_ID, STREAK_RISK_ID,
} from '../js/growth/notifications.js';
import { VERSION } from '../js/version.js';

// Daily's shape: a shared streak, plus one stats block per game (ADR-0004).
const solvedDaily = ({ melody = {}, sprint = {}, ...over } = {}) => ({
  streak: 1,
  games: {
    melody: { today: { solved: true }, wins: 3, played: 3, ...melody },
    sprint: { today: null, played: 0, ...sprint },
  },
  ...over,
});

test('review: asks on 3rd solve or 7-day streak, never after a fail, once per version', () => {
  assert.equal(shouldRequestReview({ daily: solvedDaily() }), true);
  assert.equal(shouldRequestReview({ daily: solvedDaily({ melody: { wins: 2 }, streak: 7 }) }), true);
  assert.equal(shouldRequestReview({ daily: solvedDaily({ melody: { wins: 2 }, streak: 2 }) }), false);
  assert.equal(shouldRequestReview({ daily: solvedDaily({ melody: { today: { solved: false }, wins: 9 } }) }), false);
  assert.equal(shouldRequestReview({ daily: solvedDaily(), promptedVersion: VERSION }), false);
  assert.equal(shouldRequestReview({ daily: null }), false);
});

test('review: a clean-sweep Sprint is a delight moment too, a middling one is not', () => {
  const swept = { today: { correct: 12, rounds: 12 } };
  const middling = { today: { correct: 7, rounds: 12 } };
  const noMelodyWin = { today: null, wins: 3 };

  assert.equal(shouldRequestReview({ daily: solvedDaily({ melody: noMelodyWin, sprint: swept }) }), true);
  assert.equal(shouldRequestReview({ daily: solvedDaily({ melody: noMelodyWin, sprint: middling }) }), false);
});

function fakeCapacitor({ native = true, plugins = {} } = {}) {
  return { isNativePlatform: () => native, Plugins: plugins };
}

function fakeStore() {
  const saves = [];
  return { saves, save: (s) => saves.push(structuredClone(s)) };
}

test('review adapter: requests once, persists the prompted version first', async () => {
  const calls = [];
  const capacitor = fakeCapacitor({ plugins: { InAppReview: { requestReview: async () => calls.push(1) } } });
  const store = fakeStore();
  const state = { daily: solvedDaily(), growth: {} };

  assert.equal(await maybeRequestReview({ state, store, capacitor }), true);
  assert.equal(calls.length, 1);
  assert.equal(state.growth.reviewPromptedVersion, VERSION);
  assert.equal(store.saves.length, 1);

  // same version → never again, even after more solves
  assert.equal(await maybeRequestReview({ state, store, capacitor }), false);
  assert.equal(calls.length, 1);
});

test('review adapter: no-op on web or without the plugin', async () => {
  const store = fakeStore();
  const state = { daily: solvedDaily(), growth: {} };
  assert.equal(await maybeRequestReview({ state, store, capacitor: fakeCapacitor({ native: false }) }), false);
  assert.equal(await maybeRequestReview({ state, store, capacitor: fakeCapacitor() }), false);
  assert.equal(store.saves.length, 0);
});

test('notifications plan: nothing without opt-in', () => {
  assert.deepEqual(planNotifications({ optIn: false, streak: 5, playedToday: false, now: new Date() }), []);
});

test('notifications plan: daily-ready always; streak-risk only when a streak is unplayed before evening', () => {
  const morning = new Date(2026, 6, 3, 8, 0);
  const plans = planNotifications({ optIn: true, streak: 3, playedToday: false, now: morning });
  assert.deepEqual(plans.map((p) => p.id), [DAILY_READY_ID, STREAK_RISK_ID]);
  assert.ok(plans[1].body.includes('3-day streak'));
  assert.equal(plans[1].at.getHours(), 19);

  // already played → no risk nag
  assert.deepEqual(
    planNotifications({ optIn: true, streak: 3, playedToday: true, now: morning }).map((p) => p.id),
    [DAILY_READY_ID],
  );
  // streak of 1 isn't worth a nag
  assert.deepEqual(
    planNotifications({ optIn: true, streak: 1, playedToday: false, now: morning }).map((p) => p.id),
    [DAILY_READY_ID],
  );
  // past 19:00 → too late to schedule today's risk shot
  const night = new Date(2026, 6, 3, 20, 0);
  assert.deepEqual(
    planNotifications({ optIn: true, streak: 3, playedToday: false, now: night }).map((p) => p.id),
    [DAILY_READY_ID],
  );
});

function fakeLocalNotifications({ granted = true } = {}) {
  const log = [];
  return {
    log,
    cancel: async (args) => log.push(['cancel', args]),
    schedule: async (args) => log.push(['schedule', args]),
    requestPermissions: async () => ({ display: granted ? 'granted' : 'denied' }),
  };
}

test('sync: cancels then schedules the plan; opt-out just cancels', async () => {
  const ln = fakeLocalNotifications();
  const capacitor = fakeCapacitor({ plugins: { LocalNotifications: ln } });
  const state = { growth: { notify: true }, daily: { streak: 0 } };
  await syncNotifications({ state, capacitor, playedToday: true });
  assert.equal(ln.log[0][0], 'cancel');
  assert.equal(ln.log[1][0], 'schedule');
  assert.equal(ln.log[1][1].notifications[0].id, DAILY_READY_ID);
  assert.deepEqual(ln.log[1][1].notifications[0].schedule.on, { hour: 9, minute: 0 });

  const ln2 = fakeLocalNotifications();
  await syncNotifications({
    state: { growth: { notify: false }, daily: { streak: 0 } },
    capacitor: fakeCapacitor({ plugins: { LocalNotifications: ln2 } }),
    playedToday: true,
  });
  assert.deepEqual(ln2.log.map(([op]) => op), ['cancel']);
});

test('offer: fires once after 2nd play, records the choice, respects denial', async () => {
  const ln = fakeLocalNotifications({ granted: true });
  const capacitor = fakeCapacitor({ plugins: { LocalNotifications: ln } });
  const store = fakeStore();
  const state = { growth: {}, daily: { played: 2, streak: 2 } };

  // declined offer → notify:false, never asked again
  assert.equal(await offerNotifications({ state, store, capacitor, confirmFn: () => false }), false);
  assert.equal(state.growth.notify, false);
  assert.equal(await offerNotifications({ state, store, capacitor, confirmFn: () => true }), null);

  // accepted + permission granted → notify:true and a schedule call
  const state2 = { growth: {}, daily: { played: 2, streak: 2 } };
  assert.equal(await offerNotifications({ state: state2, store, capacitor, confirmFn: () => true }), true);
  assert.equal(state2.growth.notify, true);
  assert.ok(ln.log.some(([op]) => op === 'schedule'));

  // not enough plays yet → no offer
  const state3 = { growth: {}, daily: { played: 1 } };
  assert.equal(await offerNotifications({ state: state3, store, capacitor, confirmFn: () => true }), null);

  // OS permission denied → recorded as declined
  const state4 = { growth: {}, daily: { played: 2 } };
  const capDenied = fakeCapacitor({ plugins: { LocalNotifications: fakeLocalNotifications({ granted: false }) } });
  assert.equal(await offerNotifications({ state: state4, store, capacitor: capDenied, confirmFn: () => true }), false);
  assert.equal(state4.growth.notify, false);
});
