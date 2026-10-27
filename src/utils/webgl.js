// src/utils/webgl.js
// 3D needs WebGL. Some old phones, locked-down browsers and "lite" modes don't
// have it, so every 3D view falls back to the 2D version.

let cached = null;

export function hasWebGL() {
  if (cached !== null) return cached;
  try {
    const canvas = document.createElement('canvas');
    cached = Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    cached = false;
  }
  return cached;
}

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
