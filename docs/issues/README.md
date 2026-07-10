# Issues — growth + differentiation roadmap

Tracer-bullet slices of `docs/prd/2026-07-growth-differentiation-roadmap.md`.
Local markdown, not GitHub Issues (see CLAUDE.md).

## Already shipped (Phase 1)

- **Share grid** — `js/daily/share.js` `buildShareText`, wired to the share button
  (`navigator.share` → clipboard fallback), spoiler-free emoji grid. Done + tested.
- **Daily streak** — `js/daily/stats.js` streak + maxStreak, persisted, shown on the
  Daily result screen. Done + tested.

## Open slices

| # | Slice | Type | Blocked by |
|---|---|---|---|
| [03](03-reveal-explainer.md) | Reveal explainer (movable-do) | AFK | — |
| [04](04-sing-mode-design-spike.md) | Sing Mode design spike | HITL | — |
| [05](05-sung-pitch-matcher.md) | Pure sung-pitch matcher | AFK | 04 |
| [06](06-sing-mode-wired.md) | Sing Mode wired (audio + Mode) | AFK | 05 |
| [07](07-curwen-hand-signs.md) | Curwen hand-sign visuals | AFK | 06 |
| [08](08-degree-to-staff-position.md) | Pure degree-to-staff-position | AFK | — |
| [09](09-sight-sing-mode.md) | Sight-Sing Mode (notation) | AFK | 08 |

**Parallel starters (no blockers):** 03, 04, 08.
**Teacher/backend:** deferred, not sliced (backend decision pending).
