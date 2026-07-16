// Bits every Daily game's UI adapter needs: putting a share text somewhere the
// player can paste it, the "next puzzle in…" countdown to local midnight, and
// how a game introduces itself on a card.
//
// This is deliberately thin. The two adapters (ui.js for Melody, ui-sprint.js
// for Sprint) are otherwise separate concrete implementations — a third game
// earns an abstraction over them, two do not (ADR-0004).

import { dailyConfig } from './schedule.js';
import { DAILY_GAME_IDS } from './registry.js';
import { gameStats, isPlayed } from './stats.js';
import { formatElapsed } from './share.js';

// How each game introduces itself on a card. `blurb` sells the game to someone
// who has never tapped it; `done` reports the day's result at a glance. Lives
// here rather than in the picker because the shelf is no longer the only place
// that offers a game — a finished result offers the ones you haven't played.
export const GAME_CARDS = {
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

/**
 * One game's card — the shelf's tile, and the same tile a result view uses to
 * point at the games still unplayed. A played card still opens: its locked
 * result view is where the share button lives.
 */
export function createGameCard({ gameId, daily, now, openGame }) {
  const meta = GAME_CARDS[gameId];
  const config = dailyConfig(now(), gameId);
  const played = isPlayed(daily, config.day, gameId);
  const today = gameStats(daily, gameId).today;

  const btn = document.createElement('button');
  btn.className = `picker-card${played ? ' played' : ''}`;
  btn.type = 'button';
  btn.dataset.game = gameId;

  // Melody's Tier is the day's difficulty and belongs on the card — it's what a
  // player wants to know before committing their one attempt. Sprint climbs
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

  btn.addEventListener('click', () => openGame(gameId));
  return btn;
}

/**
 * The result view's tail: the other games on the shelf you haven't played yet.
 * A finished result is the moment a player is most willing to play again, and
 * the only route on from here used to be the back arrow. Renders nothing (and
 * hides itself) once the day is spent — "come back tomorrow" is the countdown's
 * job, not a dead tile's.
 */
export function renderNextGames({ wrap, lead, cards, daily, exclude, now, openGame }) {
  if (!wrap) return;
  const day = dailyConfig(now(), exclude).day;
  const rest = DAILY_GAME_IDS.filter((id) => id !== exclude && !isPlayed(daily, day, id));

  wrap.hidden = rest.length === 0;
  cards.replaceChildren(
    ...rest.map((id) => createGameCard({ gameId: id, daily, now, openGame })),
  );
  if (lead && rest.length) {
    lead.textContent = rest.length > 1 ? 'Still to play today' : 'One more today';
  }
}

/**
 * Share sheet → clipboard → dump the text on screen. Each fallback exists for a
 * real platform: navigator.share is iOS/Android, clipboard is desktop browsers,
 * and the on-screen dump covers insecure origins where both are missing (there
 * is no way to copy for the player, so at least let them select it).
 */
export function copyShare(text, statusEl) {
  const done = () => {
    statusEl.textContent = 'Copied to clipboard ✓';
  };
  if (navigator.share) {
    navigator.share({ text }).catch(() => navigator.clipboard?.writeText(text).then(done));
  } else if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(done, () => {
      statusEl.textContent = text;
    });
  } else {
    statusEl.textContent = text;
  }
}

/**
 * Ticking countdown to the next local midnight — when the day's lock lifts.
 * `isVisible` lets the timer stop itself once its screen goes away, so a
 * forgotten interval can't keep the app awake.
 */
export function createCountdown({ el, now, isVisible }) {
  let timer = null;

  function tick() {
    if (!isVisible()) {
      stop();
      return;
    }
    const d = now();
    const next = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
    const ms = next - d;
    const h = String(Math.floor(ms / 3600000)).padStart(2, '0');
    const m = String(Math.floor((ms % 3600000) / 60000)).padStart(2, '0');
    const s = String(Math.floor((ms % 60000) / 1000)).padStart(2, '0');
    el.textContent = `Next puzzle in ${h}:${m}:${s}`;
  }

  function start() {
    stop();
    tick();
    timer = setInterval(tick, 1000);
  }

  function stop() {
    clearInterval(timer);
    timer = null;
  }

  return { start, stop };
}
