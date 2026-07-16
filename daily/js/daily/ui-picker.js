// The Daily picker — the shelf itself (ADR-0004). Lists the day's games, each
// with its own lock state, above one Daily-wide streak.
//
// Why a picker and not two tabs: the tab bar is the Mode seam (Learn / Daily /
// Warmup — see CONTEXT.md: Mode), and the games are not Modes. Keeping them
// behind #/daily also means the /daily/ web deploy still has one front door,
// and a third game costs a card rather than a rethink.

import { dailyConfig } from './schedule.js';
import { DAILY_GAME_IDS } from './registry.js';
import { defaultDaily, gameStats, isPlayed } from './stats.js';
import { formatElapsed } from './share.js';

// How each game introduces itself on the shelf. `blurb` sells the game to
// someone who has never tapped it; `done` reports the day's result at a glance.
const CARDS = {
  melody: {
    name: 'Melody',
    icon: '🎵',
    blurb: 'Echo a hidden tune, note by note.',
    done: (today) => (today.solved ? `Solved ${today.guesses}/${today.maxGuesses} ✓` : `X/${today.maxGuesses} — heard it out`),
  },
  sprint: {
    name: 'Sprint',
    icon: '⚡',
    blurb: 'Sixteen notes, Easy to Master, against the clock.',
    done: (today) => `${today.correct}/${today.rounds} · ${formatElapsed(today.elapsedMs)} ✓`,
  },
};

export function createPicker({ getState, showScreen, goBack, openGame, now = () => new Date() }) {
  const $ = (id) => document.getElementById(id);
  const el = {
    screen: $('picker-screen'),
    back: $('picker-back-btn'),
    sub: $('picker-sub'),
    cards: $('picker-cards'),
    streak: $('picker-streak'),
  };

  function cardFor(gameId, daily) {
    const meta = CARDS[gameId];
    const config = dailyConfig(now(), gameId);
    const played = isPlayed(daily, config.day, gameId);
    const today = gameStats(daily, gameId).today;

    const btn = document.createElement('button');
    btn.className = `picker-card${played ? ' played' : ''}`;
    btn.type = 'button';
    btn.dataset.game = gameId;

    // Melody's Tier is the day's difficulty and belongs on the card — it's what
    // a player wants to know before committing their one attempt. Sprint climbs
    // every Tier, so a badge would say nothing.
    const tier = gameId === 'melody' && config.tier
      ? `<span class="daily-tier tier-${config.tier.toLowerCase()}">${config.tier}</span>`
      : '';
    const status = played
      ? `<span class="picker-done">${meta.done(today)}</span>`
      : `<span class="picker-go">Play →</span>`;

    btn.innerHTML =
      `<span class="picker-icon" aria-hidden="true">${meta.icon}</span>`
      + `<span class="picker-body">`
      + `<span class="picker-name">${meta.name} #${config.day}${tier}</span>`
      + `<span class="picker-blurb">${meta.blurb}</span>`
      + `</span>`
      + status;

    // A played game still opens — its locked result view is where the share
    // button lives, and re-reading your own grid is the point of a shelf.
    btn.addEventListener('click', () => openGame(gameId));
    return btn;
  }

  function render() {
    const state = getState();
    state.daily ??= defaultDaily();
    const daily = state.daily;
    const day = dailyConfig(now(), 'melody').day;

    el.cards.replaceChildren(...DAILY_GAME_IDS.map((id) => cardFor(id, daily)));

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

  el.back?.addEventListener('click', () => goBack());

  return { start, render, screen: el.screen };
}
