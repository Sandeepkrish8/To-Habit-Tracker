// src/components/StreakFlame.jsx
// A living flame for a streak (Framer Motion).
//   • grows and changes color at 7 / 30 / 100 days
//   • its shape morphs between tiers (animating the SVG path `d`)
//   • each layer flickers on its own rhythm, so the flame never looks looped
//   • a cold, smoking flame when a streak breaks

import { motion } from 'framer-motion';
import { flameTier, flamePath, TIERS } from '../features/habits/flame';

// Outer, middle and inner layers: [width, height, flicker seconds]
const LAYERS = [[38, 118, 1.3], [24, 78, 0.9], [12, 44, 0.7]];
const SMOKE = [0, 0.8, 1.6];

export default function StreakFlame({ streak = 0, best = 0, size = 48, still = false, className = '' }) {
  const tier = flameTier(streak, best);
  const t = TIERS[tier];
  const flicker = !still && tier !== 'ember';

  return (
    <motion.svg
      width={size}
      height={size * 1.3}
      viewBox="0 0 100 130"
      className={`shrink-0 overflow-visible ${className}`}
      role="img"
      aria-label={`${t.label}${streak > 0 ? `, ${streak}-day streak` : ''}`}
      animate={{ filter: t.glow ? `drop-shadow(0 0 ${Math.max(2, size / 6)}px ${t.glow})` : 'drop-shadow(0 0 0px transparent)' }}
      transition={{ duration: 0.6 }}
    >
      {/* Smoke puffs drift up from a cold flame */}
      {tier === 'cold' && !still && SMOKE.map((delay) => (
        <motion.circle
          key={delay}
          cx={44}
          fill="#cbd5e1"
          initial={{ cy: 70, r: 4, opacity: 0 }}
          animate={{ cy: [70, 10], r: [4, 12], opacity: [0.6, 0] }}
          transition={{ duration: 2.4, repeat: Infinity, delay, ease: 'easeOut' }}
        />
      ))}

      {/* Whole flame scales up as the tier grows (spring), anchored at its base */}
      <motion.g
        initial={false}
        animate={{ scale: t.scale }}
        transition={{ type: 'spring', stiffness: 160, damping: 14 }}
        style={{ originX: 0.5, originY: 1 }}
      >
        {LAYERS.map(([w, h, seconds], i) => (
          <motion.g
            key={i}
            style={{ originX: 0.5, originY: 1 }}
            animate={flicker ? { scaleY: [1, 1.07, 0.96, 1.04, 1], skewX: [0, 2, -1.5, 1, 0] } : { scaleY: 1, skewX: 0 }}
            transition={flicker ? { duration: seconds, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.3 }}
          >
            <motion.path
              initial={false}
              animate={{ d: flamePath(w * t.width, h, t.lean * (1 - i * 0.3)), fill: t.colors[i] }}
              transition={{ duration: 0.6, ease: 'easeInOut' }}
            />
          </motion.g>
        ))}
      </motion.g>
    </motion.svg>
  );
}
