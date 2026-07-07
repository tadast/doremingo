// Inline SVG art — the flamingo mascot and simplified Curwen hand signs.
// Plain strings so the UI can inject them without fetches or build steps.

export const FLAMINGO = `
<svg viewBox="0 0 100 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <g class="flamingo">
    <!-- Editor pose transform lives on this inner group, NOT on .flamingo — the
         CSS bob/hop/party animations drive .flamingo's own transform and would
         otherwise clobber it. -->
    <g transform="matrix(0.94694, 0, 0, 0.95957, -2.137162, 2.470338)">
    <!-- the famous one-leg stance: one straight, one tucked up -->
    <path d="M 50.045 119.716 L 50.045 92.879 M 50.045 92.879 L 50 88" stroke="#e8438a" stroke-width="3" fill="none" stroke-linecap="round" style="transform-box: fill-box; transform-origin: 50% 50%;" transform="matrix(-1, 0, 0, -1, 0.000003, -0.000002)"/>
    <path class="leg-up" d="M 48.57 88.164 L 64.885 103.201 L 42.451 103.201" stroke="#e8438a" stroke-width="3" fill="none" stroke-linecap="round"/>
    <!-- body -->
    <ellipse cx="48" cy="70" rx="26" ry="20" fill="#ff5d8f"/>
    <ellipse class="wing" cx="43.95" cy="71.893" rx="15.95" ry="8.893" fill="#ff87ad" style="transform-box: fill-box; transform-origin: 50% 50%;" transform="matrix(0.965926, -0.258819, 0.258819, 0.965926, 2.091908, -2.732504)"/>
    <!-- tail fluff -->
    <path d="M 22.452 65.763 C 11.479 63.356 4.621 66.966 1.878 76.592 C 11.479 80.202 19.709 79.6 26.567 74.787 L 22.452 65.763 Z" fill="#ff87ad"/>
    <!-- neck: gentle S, kept clear of the beak -->
    <path d="M 66.048 77.418 C 74.63 64.931 78.922 46.2 72.484 27.471" stroke="#ff5d8f" stroke-width="9" fill="none" stroke-linecap="round"/>
    <!-- head -->
    <circle cx="74.464" cy="21.546" r="9" fill="#ff5d8f"/>
    <!-- beak: out from the face, with the droopy dark tip -->
    <polygon points="74.972 24.637 106.798 37.806 90.71 19.195" fill="#ffd166" style="transform-origin: 87.21px 32.693px;" transform="matrix(0.965926, 0.258819, -0.258819, 0.965926, -0.000001, 0)"/>
    <polygon points="104.799 42.104 100.417 32.249 93.225 35.031" fill="#3b2d3f" style="transform-origin: 99.63px 36.116px;"/>
    <!-- eye -->
    <circle class="eye" cx="75.49" cy="21.062" r="2.8" fill="#3b2d3f"/>
    <circle cx="74.823" cy="20.461" r="1" fill="#fff"/>
    <!-- blush -->
    <circle cx="69.464" cy="24.546" r="2.2" fill="#ff87ad" opacity="0.9"/>

    <!-- mood FX: hidden by default, shown per .mascot state in CSS. Inside the
         flamingo group so they ride its bob/hop/party motion. -->
    <g class="fx fx-happy">
      <path class="spark spark-a" d="M86 4 L87.6 9 L92 10 L87.6 11 L86 16 L84.4 11 L80 10 L84.4 9 Z" fill="#ffd166"/>
      <path class="spark spark-b" d="M20 40 L21.2 44 L25 45 L21.2 46 L20 50 L18.8 46 L15 45 L18.8 44 Z" fill="#06d6a0"/>
    </g>
    <g class="fx fx-party" transform="matrix(1, 0, 0, 1, 6.463553, 1.546175)">
      <polygon points="52.263 15.528 68.317 15.528 60.464 0.578" fill="#06d6a0" style="transform-box: fill-box; transform-origin: 50% 50%;" transform="matrix(0.863133, -0.49833, 0.511712, 0.863133, 0, 0.000001)"/>
      <polygon points="58.277 16.352 69.338 10.508 58.495 5.008" fill="none" stroke="#fff7ed" stroke-width="1.4" stroke-dasharray="3 3" style="transform-origin: 61.488px 9.753px;"/>
      <circle cx="66.57" cy="-2.281" r="3" fill="#4cc9f0" style="transform-box: fill-box; transform-origin: 50% 50%;" transform="matrix(0.866026, -0.5, 0.5, 0.866026, -10.397082, 3.265041)"/>
      <circle cx="18" cy="34" r="3" fill="#4cc9f0"/>
      <circle cx="86" cy="46" r="3" fill="#06d6a0"/>
      <rect x="14" y="60" width="5" height="5" rx="1" fill="#ffd166"/>
      <rect x="84" y="74" width="5" height="5" rx="1" fill="#c66cf6"/>
    </g>
    <g class="fx fx-sad" transform="matrix(1, 0, 0, 1, 12.355412, 0.995468)">
      <ellipse class="tear" cx="63" cy="26" rx="2" ry="2.8" fill="#4cc9f0"/>
    </g>
    </g>
  </g>
</svg>`;

// Simplified Curwen/Kodály hand-sign glyphs (white, drawn for ~22px).
// Stylised, not anatomical — a memory hook, per issue 09.
export const HAND_SIGNS = {
  1: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="13" r="7" fill="currentColor"/><path d="M6 11 q6 -3 12 0" stroke="currentColor" stroke-width="1.4" fill="none" opacity=".5"/></svg>', // Do: fist
  2: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="10" width="18" height="6" rx="3" fill="currentColor" transform="rotate(-35 12 13)"/></svg>', // Re: hand slanting up
  3: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="10" width="18" height="6" rx="3" fill="currentColor"/></svg>', // Mi: flat hand
  4: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="8" width="16" height="6" rx="3" fill="currentColor"/><path d="M8 14 l3 7 l3 -7 z" fill="currentColor"/></svg>', // Fa: thumb points down
  5: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3" width="6" height="18" rx="3" fill="currentColor"/></svg>', // Sol: upright palm
  6: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9 q8 -4 16 2 q-2 8 -10 8 q-7 -2 -6 -10 z" fill="currentColor"/></svg>', // La: drooping hand
  7: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="16" r="5" fill="currentColor"/><rect x="13" y="2" width="4" height="11" rx="2" fill="currentColor" transform="rotate(20 15 8)"/></svg>', // Ti: index points up
};
