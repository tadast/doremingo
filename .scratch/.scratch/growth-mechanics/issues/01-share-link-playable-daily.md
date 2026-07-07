# 01 — Share link opens playable daily

Status: done

## What to build

The Daily result share text currently ends with the okdo.co.uk landing page —
a marketing page, not the game. Change the share URL to
`https://doremingo.com/#/daily` so a recipient lands directly in today's
puzzle in the browser, no install. This is the core viral loop
(Wordle/Heardle/Bandle pattern: emoji grid → link → play immediately).

Context: docs/SHIPPING.md §1c (doremingo.com web launch) and §7b. The
`#/daily` hash route already exists; verify it works on a cold page load
(fresh visitor, no stored state) and lands on the Daily screen, not Home.

## Acceptance criteria

- [ ] Share text links to `https://doremingo.com/#/daily`
- [ ] Cold-loading that URL opens the Daily screen directly (no stored state required)
- [ ] Share-format tests updated and passing

## Blocked by

None - can start immediately. (DNS for doremingo.com may not be live yet —
that's fine; the URL is correct either way.)

## Comments

Done 2026-07-03, superseded slightly by the doremingo.com site build: share
URL is now `https://www.doremingo.com/daily` (path, not hash — the site
serves the game at `/daily/` in daily-only mode, so a cold load lands
directly in the puzzle). Test added asserting the share text ends with the
URL. Full site structure: landing `/`, game `/daily/`.
