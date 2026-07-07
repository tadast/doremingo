// Seeded pseudo-random generator — pure, deterministic.
//
// Daily mode needs the *same* puzzle for everyone on a given day, so it cannot
// use Math.random(). seededRng(str) hashes a string seed (the local date) into
// a 32-bit state and returns a Math.random-compatible function: each call yields
// the next float in [0, 1). Same seed → same sequence, forever.
//
// cyrb53 (string → 53-bit hash) feeds mulberry32 (fast 32-bit PRNG). Both are
// well-known public-domain algorithms.

export function cyrb53(str, seed = 0) {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}

export function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A Math.random-compatible generator seeded deterministically from a string. */
export function seededRng(seed) {
  return mulberry32(cyrb53(String(seed)));
}

/** Pick one element of arr using rng. */
export function pick(arr, rng) {
  return arr[Math.floor(rng() * arr.length)];
}
