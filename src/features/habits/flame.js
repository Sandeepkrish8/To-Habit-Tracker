// src/features/habits/flame.js
// Streak → flame tier. Milestones (7, 30, 100 days) change the flame and
// trigger a celebration.

export const MILESTONES = [7, 30, 100];

/** ember: never started · cold: streak broke · spark → campfire → blue → cosmic */
export const flameTier = (streak, best = 0) => {
  if (streak === 0) return best > 0 ? 'cold' : 'ember';
  if (streak >= 100) return 'cosmic';
  if (streak >= 30) return 'blue';
  if (streak >= 7) return 'campfire';
  return 'spark';
};

export const TIERS = {
  ember:    { scale: 0.5,  lean: 0,  width: 1,    colors: ['#a8a29e', '#d6d3d1', '#f5f5f4'], glow: null,      label: 'Not lit yet' },
  cold:     { scale: 0.55, lean: -8, width: 0.55, colors: ['#64748b', '#94a3b8', '#e2e8f0'], glow: null,      label: 'Cold — streak broke' },
  spark:    { scale: 0.62, lean: 3,  width: 1,    colors: ['#f97316', '#fb923c', '#fde68a'], glow: '#fb923c', label: 'Spark' },
  campfire: { scale: 0.8,  lean: 0,  width: 1.05, colors: ['#ea580c', '#f97316', '#fde047'], glow: '#f97316', label: 'Campfire' },
  blue:     { scale: 0.92, lean: -2, width: 1.05, colors: ['#1d4ed8', '#3b82f6', '#bfdbfe'], glow: '#3b82f6', label: 'Blue flame' },
  cosmic:   { scale: 1,    lean: 3,  width: 1.1,  colors: ['#7c3aed', '#c026d3', '#fdf4ff'], glow: '#c026d3', label: 'Cosmic flame' },
};

export const MILESTONE_COPY = {
  7:   { title: '7-day streak!',   line: 'Your spark became a campfire 🏕️' },
  30:  { title: '30-day streak!',  line: 'Your flame burns blue now 💙' },
  100: { title: '100-day streak!', line: 'A cosmic flame. Legendary 🌌' },
};

/**
 * A teardrop flame path. Every flame uses the SAME commands (M, 4×C, Z), only
 * the numbers change — that's what lets Framer Motion morph one into another.
 */
export const flamePath = (w, h, lean) => {
  const cx = 50;
  const base = 126;
  const top = base - h;
  const n = (v) => v.toFixed(1);
  return [
    `M${n(cx + lean)} ${n(top)}`,
    `C${n(cx + lean + w * 0.15)} ${n(top + h * 0.25)} ${n(cx + w)} ${n(base - h * 0.45)} ${n(cx + w * 0.95)} ${n(base - h * 0.22)}`,
    `C${n(cx + w * 0.9)} ${n(base - h * 0.02)} ${n(cx + w * 0.45)} ${base} ${cx} ${base}`,
    `C${n(cx - w * 0.45)} ${base} ${n(cx - w * 0.9)} ${n(base - h * 0.02)} ${n(cx - w * 0.95)} ${n(base - h * 0.22)}`,
    `C${n(cx - w)} ${n(base - h * 0.45)} ${n(cx + lean - w * 0.15)} ${n(top + h * 0.25)} ${n(cx + lean)} ${n(top)}Z`,
  ].join(' ');
};
