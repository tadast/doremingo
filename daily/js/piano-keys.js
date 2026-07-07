// Piano keyboard builder — shared by the quiz answer row and the Daily palette.
// Movable-do layout: whites are always degrees 1-7 plus a disabled Do′ (the
// landing key for upward resolutions); blacks sit in the mode's whole-step
// gaps, named where the mode defines a chromatic degree, blank otherwise.
// Keys outside the pool render disabled (.off) so Do is always leftmost and
// every level shows the same keyboard.

import { DEGREES, SCALES, degreeInfo } from './theory.js';
import { HAND_SIGNS } from './art.js';

export function buildPianoKeys(pool, mode, onTap) {
  const inPool = new Set(pool.map(String));

  // Disabled keys carry their label markup too, but CSS keeps it hidden
  // until the resolution walk lights the key — a blank key reads as
  // unplayable, yet names itself when the walk passes over it.
  const makeKey = (d, { enabled = false, octaveUp = false } = {}) => {
    const btn = document.createElement('button');
    btn.className = 'degree-btn';
    if (d != null) {
      const info = degreeInfo(d, mode);
      btn.dataset.degree = String(d);
      const sign = HAND_SIGNS[d] ? `<span class="sign">${HAND_SIGNS[d]}</span>` : '';
      btn.innerHTML = `${sign}<span>${info.name}${octaveUp ? '′' : ''}</span><span class="num">${info.label}</span>`;
    }
    if (octaveUp) btn.dataset.octave = '1';
    if (enabled) {
      btn.addEventListener('click', (e) => {
        e.stopPropagation(); // don't let the answering tap skip its own resolution
        onTap(d);
      });
    } else {
      btn.classList.add('off');
      btn.disabled = true;
    }
    return btn;
  };

  const whites = [1, 2, 3, 4, 5, 6, 7].map((d) => makeKey(d, { enabled: inPool.has(String(d)) }));
  whites.push(makeKey(1, { octaveUp: true }));

  const scale = SCALES[mode];
  const blacks = [];
  for (let i = 0; i < 7; i++) {
    const next = scale[i + 1] ?? 12;
    if (next - scale[i] < 2) continue; // half step — no black key in this gap
    const off = scale[i] + 1;
    const token = Object.keys(DEGREES[mode])
      .find((k) => !/^\d$/.test(k) && DEGREES[mode][k].off === off) ?? null;
    const btn = makeKey(token, { enabled: token != null && inPool.has(token) });
    btn.classList.add('black');
    btn.style.left = `${((i + 1) / 8) * 100}%`;
    blacks.push(btn);
  }

  return [...whites, ...blacks];
}
