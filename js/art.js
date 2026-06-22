// Inline SVG art — the flamingo mascot and simplified Curwen hand signs.
// Plain strings so the UI can inject them without fetches or build steps.

export const FLAMINGO = `
<svg viewBox="0 0 100 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <g class="flamingo">
    <!-- the famous one-leg stance: one straight, one tucked up -->
    <path d="M50 88 L50 110 M50 110 L43 114" stroke="#e8438a" stroke-width="3" fill="none" stroke-linecap="round"/>
    <path class="leg-up" d="M50 88 L58 96 L47 96" stroke="#e8438a" stroke-width="3" fill="none" stroke-linecap="round"/>
    <!-- body -->
    <ellipse cx="48" cy="70" rx="26" ry="20" fill="#ff5d8f"/>
    <ellipse class="wing" cx="41" cy="72" rx="13" ry="9" fill="#ff87ad"/>
    <!-- tail fluff -->
    <path d="M24 62 q-8 -2 -10 6 q7 3 12 -1 z" fill="#ff87ad"/>
    <!-- neck: gentle S, kept clear of the beak -->
    <path d="M62 60 C70 52 74 40 68 28" stroke="#ff5d8f" stroke-width="9" fill="none" stroke-linecap="round"/>
    <!-- head -->
    <circle cx="68" cy="20" r="9" fill="#ff5d8f"/>
    <!-- beak: out from the face, with the droopy dark tip -->
    <polygon points="76,17 91,26 79,29" fill="#ffd166"/>
    <polygon points="91,26 85,23.5 83,28.5" fill="#3b2d3f"/>
    <!-- eye -->
    <circle class="eye" cx="66" cy="17" r="2.8" fill="#3b2d3f"/>
    <circle cx="67" cy="16" r="1" fill="#fff"/>
    <!-- blush -->
    <circle cx="63" cy="23" r="2.2" fill="#ff87ad" opacity="0.9"/>

    <!-- mood FX: hidden by default, shown per .mascot state in CSS. Inside the
         flamingo group so they ride its bob/hop/party motion. -->
    <g class="fx fx-happy">
      <path class="spark spark-a" d="M86 4 L87.6 9 L92 10 L87.6 11 L86 16 L84.4 11 L80 10 L84.4 9 Z" fill="#ffd166"/>
      <path class="spark spark-b" d="M20 40 L21.2 44 L25 45 L21.2 46 L20 50 L18.8 46 L15 45 L18.8 44 Z" fill="#06d6a0"/>
    </g>
    <g class="fx fx-party">
      <polygon points="60,8 76,8 68,-7" fill="#06d6a0"/>
      <polygon points="60,8 76,8 68,-7" fill="none" stroke="#fff7ed" stroke-width="1.4" stroke-dasharray="3 3"/>
      <circle cx="68" cy="-8" r="3" fill="#4cc9f0"/>
      <circle cx="18" cy="34" r="3" fill="#4cc9f0"/>
      <circle cx="86" cy="46" r="3" fill="#06d6a0"/>
      <rect x="14" y="60" width="5" height="5" rx="1" fill="#ffd166"/>
      <rect x="84" y="74" width="5" height="5" rx="1" fill="#c66cf6"/>
    </g>
    <g class="fx fx-sad">
      <ellipse class="tear" cx="63" cy="26" rx="2" ry="2.8" fill="#4cc9f0"/>
    </g>
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
