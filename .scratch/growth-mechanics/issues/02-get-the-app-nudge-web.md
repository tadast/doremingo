# 02 — "Get the app" nudge on web daily result

Status: ready-for-agent

## What to build

On the **web only**, after finishing the daily puzzle, the result view shows a
small "Get the app" link/button pointing to the App Store. Hidden entirely
inside the native Capacitor app (native platform check).

The app is not live yet, so gate on a single `APP_STORE_URL` constant:
empty string → nothing renders. Ships dormant; activated at launch by filling
in one constant. Keep the nudge quiet — a single line under the share button,
not a banner or modal; the result screen's job is the share grid.

Context: docs/SHIPPING.md §1c — doremingo.com is the acquisition surface,
the iOS app is the retention surface.

## Acceptance criteria

- [ ] Nudge renders on web daily result view when `APP_STORE_URL` is set
- [ ] Never renders inside the native iOS app
- [ ] Nothing renders while the constant is empty
- [ ] Tests cover the gating logic

## Blocked by

None - can start immediately.

## Comments

2026-07-03: partial groundwork shipped with the doremingo.com site build —
the web daily-only mode already appends a "see the full game" link to the
result view, pointing at the landing page (which explains the app). This
issue's remaining scope: swap/extend that nudge to link straight to the App
Store once `APP_STORE_URL` exists, per the acceptance criteria.
