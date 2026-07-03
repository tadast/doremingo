# 03 — iOS review prompt at delight moments

Status: ready-for-agent

## What to build

Trigger the native in-app review dialog (SKStoreReviewController, via the
`@capacitor-community/in-app-review` plugin) at moments of success:

- 3rd daily puzzle solved, or
- reaching a 7-day daily streak

iOS only; no-op on web. Throttle: at most once per app version (persist the
last-prompted version alongside existing daily stats). Never prompt after a
failed daily. Apple limits the system prompt to 3/year per user anyway, but
our own throttle keeps intent explicit.

Rationale (launch research, docs/SHIPPING.md §7b): no review prompt exists
today; ratings drive both search ranking and conversion (~+20% downloads per
half-star). Target ≥4.0 rating.

Note for iOS build: plugin install requires `npm i` + `npx cap sync`; keep
`www/` regeneration rules from CLAUDE.md (never edit `www/` directly).

## Acceptance criteria

- [ ] Prompt requested on 3rd daily solve or 7-day streak, whichever comes first
- [ ] Never fires on web, never after a failed daily
- [ ] At most one request per app version, persisted across restarts
- [ ] Trigger logic unit-tested (plugin call mocked)

## Blocked by

None - can start immediately.
