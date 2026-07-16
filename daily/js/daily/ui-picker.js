// The Daily picker — the shelf itself (ADR-0004). Lists the day's games, each
// with its own lock state, above one Daily-wide streak.
//
// Why a picker and not two tabs: the tab bar is the Mode seam (Learn / Daily /
// Warmup — see CONTEXT.md: Mode), and the games are not Modes. Keeping them
// under /daily/ also means the /daily/ web deploy still has one front door,
// and a third game costs a card rather than a rethink.

import { dailyConfig } from './schedule.js';
import { DAILY_GAME_IDS } from './registry.js';
import { defaultDaily, isPlayed } from './stats.js';
import { createGameCard } from './ui-common.js';

export function createPicker({ getState, showScreen, goBack, openGame, canGoBack = true, now = () => new Date() }) {
  const $ = (id) => document.getElementById(id);
  const el = {
    screen: $('picker-screen'),
    back: $('picker-back-btn'),
    sub: $('picker-sub'),
    cards: $('picker-cards'),
    streak: $('picker-streak'),
  };

  function render() {
    const state = getState();
    state.daily ??= defaultDaily();
    const daily = state.daily;
    const day = dailyConfig(now(), 'melody').day;

    el.cards.replaceChildren(
      ...DAILY_GAME_IDS.map((id) => createGameCard({ gameId: id, daily, now, openGame })),
    );

    const left = DAILY_GAME_IDS.filter((id) => !isPlayed(daily, day, id)).length;
    el.sub.textContent = left === 0
      ? 'Both played — back tomorrow'
      : `${left} to play today`;

    // The streak is the shelf's headline, so say plainly what keeps it: playing
    // anything. A streak the player can't work out how to keep is just a number.
    if (!daily.streak) {
      el.streak.textContent = 'Play either game to start a streak 🔥';
    } else {
      const safe = daily.lastDay === day;
      el.streak.textContent = safe
        ? `${daily.streak}-day streak 🔥 — safe for today`
        : `${daily.streak}-day streak 🔥 — play either game to keep it`;
    }
  }

  function start() {
    render();
    showScreen(el.screen);
  }

  // The picker is the shelf's front door. On the /daily/ web deploy it is also
  // the app's front door — there is no Learn to go back to (main.js: DAILY_ONLY)
  // — so the back arrow goes away rather than tipping visitors into a Learn map
  // that deploy deliberately withholds.
  if (el.back) el.back.hidden = !canGoBack;
  el.back?.addEventListener('click', () => goBack());

  return { start, render, screen: el.screen };
}
