# 04 — Opt-in local notifications (daily-ready + streak-at-risk)

Status: ready-for-agent

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
