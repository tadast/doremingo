# 04 — Opt-in local notifications (daily-ready + streak-at-risk)

Status: done

## What to build

After a completed daily (suggested: the 2nd one — user has shown intent),
offer once: "Want a reminder when tomorrow's melody is ready?" If accepted,
request notification permission and schedule **local** notifications via
`@capacitor/local-notifications`:

- **Daily ready** — fixed morning hour (e.g. 09:00 local), "Today's melody is
  ready 🦩"
- **Streak at risk** — evening (e.g. 19:00 local), only when the user has an
  active streak ≥2 and hasn't played today; cancelled immediately once today's
  daily is completed

Fully on-device, no push server — the "No Data Collected" privacy label stays
true. Decline = never auto-ask again; re-enable available from the menu.
iOS only for v1; no-op on web. Reschedule pending notifications on app launch
(local-notification schedules drift after reboots/timezone changes).

Context: docs/SHIPPING.md §7b. Wordle shipped without notifications, but it
had a cultural moment; competitor Functional Ear Trainer ships daily reminders.

## Acceptance criteria

- [ ] Opt-in offer appears once, after the 2nd completed daily; choice persisted
- [ ] Nothing is ever scheduled without explicit opt-in
- [ ] Daily-ready notification fires at the fixed hour when enabled
- [ ] Streak-at-risk notification only when streak ≥2 and today unplayed; cancelled on completion
- [ ] Menu toggle to enable/disable later
- [ ] No-op on web; scheduling logic unit-tested (plugin mocked)

## Blocked by

None - can start immediately.

## Comments

Done 2026-07-03. Pure planner + Capacitor adapter in
`js/growth/notifications.js` (plugin `@capacitor/local-notifications`,
installed + synced). Offer fires once after the 2nd completed daily
(confirm dialog → OS permission); choice persisted in `state.growth.notify`
(null/false/true). Daily-ready repeats 09:00 local; streak-at-risk one-shot
19:00 only when streak ≥2 and today unplayed, cleared on completion. Full
cancel+reschedule sync on every app launch and daily finish (handles
reboots/timezone drift). Burger-menu toggle "Daily reminder: on/off", visible
only in the native app. Planner, sync, offer, denial paths unit-tested with a
fake bridge. Real-device verification pending — needs a build on hardware.
