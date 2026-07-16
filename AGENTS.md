# AGENTS.md

## Agent skills

### Issue tracker

Issues live as local markdown under `.scratch/<feature>/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Default canonical names (needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `CONTEXT.md` + `docs/adr/` at repo root. See `docs/agents/domain.md`.

## Adding a screen

A new `<section class="screen">` is **vertically centred** by the body grid and its
header is a **left-aligned** flex row. Those defaults suit short screens (home,
clear); every other screen opts out explicitly. Pick from the two contracts
documented in `css/style.css` — search for "Screen layout contract":

- `.screen.screen-app` — top-aligned, full height, flex column. Play surfaces
  (quiz, daily, sprint, picker): lets `.quiz-main`/`.daily-main` take `flex:1`
  and pins Mingo to the bottom.
- `.screen.screen-tall` — top-aligned, full height, normal flow. Read-only pages
  (about, notes, theory).
- Neither — vertically centred. Only for short, self-contained screens.

With a centred title, use `<header class="quiz-header titled">`, and give every
side control `.back-btn` or `.header-action` so it floats clear of the title.

**Prefer a class to an id list.** Both of these started as rules keyed to specific
screen ids, so screens added later silently inherited the wrong default and looked
subtly broken — a gap above the content, a title off-centre. If you find yourself
appending an id to a selector list, make it a class and document it instead.
