// src/utils/seeded.js
// Seeded random numbers ("mulberry32"): the same seed always gives the same
// sequence, so a tree grown from seed 42 looks identical every time you see it.

export function seeded(seed) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296; // 0 ≤ n < 1
  };
}

/** Turns any string (like a tree id) into a 32-bit seed */
export const hashString = (str) =>
  [...str].reduce((h, ch) => (Math.imul(h, 31) + ch.charCodeAt(0)) | 0, 7);
