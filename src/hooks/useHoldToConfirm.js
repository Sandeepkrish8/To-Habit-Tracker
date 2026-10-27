// src/hooks/useHoldToConfirm.js
// Press-and-hold interaction: progress fills 0 → 1 while held, rewinds when
// released early, and calls `onConfirm` once it reaches 1.
//
// Pointer events cover mouse, touch and pen with one API. Space/Enter work too,
// so keyboard users can hold to confirm as well.

import { useCallback, useEffect, useRef, useState } from 'react';

export default function useHoldToConfirm({ duration = 600, onConfirm }) {
  const [progress, setProgress] = useState(0);
  const progressRef = useRef(0);
  const frame = useRef(null);
  const holding = useRef(false);
  const confirmRef = useRef(onConfirm);

  // Keep the latest callback without re-creating the handlers
  useEffect(() => {
    confirmRef.current = onConfirm;
  }, [onConfirm]);

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  /** Animates progress toward 1 (holding) or back to 0 (released) */
  const animate = useCallback((forward) => {
    cancelAnimationFrame(frame.current);
    const from = progressRef.current;
    const startTime = performance.now();
    // Filling takes the remaining share of `duration`; rewinding is twice as fast
    const total = forward ? (1 - from) * duration : from * duration * 0.5;

    const step = (t) => {
      const k = total > 0 ? Math.min(1, (t - startTime) / total) : 1;
      const p = forward ? from + (1 - from) * k : from * (1 - k);
      progressRef.current = p;
      setProgress(p);
      if (k < 1) {
        frame.current = requestAnimationFrame(step);
      } else if (forward) {
        holding.current = false;
        confirmRef.current?.();
        progressRef.current = 0;
        setProgress(0);
      }
    };
    frame.current = requestAnimationFrame(step);
  }, [duration]);

  const press = useCallback(() => {
    if (holding.current) return;
    holding.current = true;
    animate(true);
  }, [animate]);

  const release = useCallback(() => {
    if (!holding.current) return;
    holding.current = false;
    animate(false);
  }, [animate]);

  const handlers = {
    onPointerDown: (e) => {
      if (e.button !== 0) return;
      e.stopPropagation();
      e.currentTarget.setPointerCapture?.(e.pointerId); // keep receiving events if the finger drifts
      press();
    },
    onPointerUp: release,
    onPointerCancel: release,
    onLostPointerCapture: release,
    onKeyDown: (e) => {
      if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) {
        e.preventDefault();
        press();
      }
    },
    onKeyUp: (e) => {
      if (e.key === ' ' || e.key === 'Enter') release();
    },
    onClick: (e) => e.stopPropagation(), // never let the card underneath react
    onContextMenu: (e) => e.preventDefault(), // long-press on phones opens a menu otherwise
  };

  return { progress, handlers };
}
