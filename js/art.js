// Inline SVG art — the flamingo mascot and simplified Curwen hand signs.
// Plain strings so the UI can inject them without fetches or build steps.

export const FLAMINGO = `
<svg viewBox="0 0 100 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <g class="flamingo">
    <!-- legs -->
    <path d="M46 88 L46 108 M46 108 L40 114" stroke="#e8438a" stroke-width="3" fill="none" stroke-linecap="round"/>
    <path class="leg-up" d="M56 88 L56 98 L62 102" stroke="#e8438a" stroke-width="3" fill="none" stroke-linecap="round"/>
    <!-- body -->
    <ellipse cx="50" cy="70" rx="27" ry="21" fill="#ff5d8f"/>
    <ellipse class="wing" cx="42" cy="72" rx="14" ry="10" fill="#ff87ad"/>
    <!-- tail fluff -->
    <path d="M25 64 q-8 -2 -10 6 q7 3 12 -1 z" fill="#ff87ad"/>
    <!-- neck -->
    <path d="M70 60 C88 50 84 28 70 20" stroke="#ff5d8f" stroke-width="9" fill="none" stroke-linecap="round"/>
    <!-- head -->
    <circle cx="68" cy="18" r="10" fill="#ff5d8f"/>
    <!-- beak -->
    <path d="M76 22 q10 2 12 8 q-8 4 -14 -2 z" fill="#3b2d3f"/>
    <path d="M76 22 q10 2 12 8 l-6 1 q-4 -5 -6 -9 z" fill="#ffd166"/>
    <!-- eye -->
    <circle class="eye" cx="66" cy="16" r="3" fill="#3b2d3f"/>
    <circle cx="67" cy="15" r="1" fill="#fff"/>
    <!-- blush -->
    <circle cx="60" cy="22" r="3" fill="#ff87ad"/>
  </g>
</svg>`;

// Simplified Curwen/Kodály hand-sign glyphs (white, drawn for ~22px).
// Stylised, not anatomical — a memory hook, per issue 09.
export const HAND_SIGNS = {
  1: '<svg viewBox="0 0 24 24"><circle cx="12" cy="13" r="7" fill="currentColor"/><path d="M6 11 q6 -3 12 0" stroke="currentColor" stroke-width="1.4" fill="none" opacity=".5"/></svg>', // Do: fist
  2: '<svg viewBox="0 0 24 24"><rect x="3" y="10" width="18" height="6" rx="3" fill="currentColor" transform="rotate(-35 12 13)"/></svg>', // Re: hand slanting up
  3: '<svg viewBox="0 0 24 24"><rect x="3" y="10" width="18" height="6" rx="3" fill="currentColor"/></svg>', // Mi: flat hand
  4: '<svg viewBox="0 0 24 24"><rect x="4" y="8" width="16" height="6" rx="3" fill="currentColor"/><path d="M8 14 l3 7 l3 -7 z" fill="currentColor"/></svg>', // Fa: thumb points down
  5: '<svg viewBox="0 0 24 24"><rect x="9" y="3" width="6" height="18" rx="3" fill="currentColor"/></svg>', // Sol: upright palm
  6: '<svg viewBox="0 0 24 24"><path d="M4 9 q8 -4 16 2 q-2 8 -10 8 q-7 -2 -6 -10 z" fill="currentColor"/></svg>', // La: drooping hand
  7: '<svg viewBox="0 0 24 24"><circle cx="12" cy="16" r="5" fill="currentColor"/><rect x="13" y="2" width="4" height="11" rx="2" fill="currentColor" transform="rotate(20 15 8)"/></svg>', // Ti: index points up
};
