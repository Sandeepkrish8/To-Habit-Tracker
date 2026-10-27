// src/hooks/useCountUp.js
// Animates a number from 0 up to `target` with an ease-out curve.

import { useEffect, useState } from 'react';

export default function useCountUp(target, duration = 900) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const total = reduced ? 0 : duration;
    const startTime = performance.now();
    let frame;
    const step = (t) => {
      const k = total > 0 ? Math.min(1, (t - startTime) / total) : 1;
      const eased = 1 - Math.pow(1 - k, 3); // fast at first, gently settling
      setValue(Math.round(target * eased));
      if (k < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);

  return value;
}
