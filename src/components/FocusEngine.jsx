// src/components/FocusEngine.jsx
// Runs the focus timer for the whole app (any page): finishes sessions, plants
// trees, plays ambient sound, pauses in strict mode when you leave the tab, and
// hosts the Picture-in-Picture mini timer.

import { useCallback, useEffect, useEffectEvent, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useDispatch, useSelector } from 'react-redux';
import PlantCelebration from './PlantCelebration';
import MiniTimer from './MiniTimer';
import { FocusUIContext } from '../context/focusUI';
import { useToast } from '../context/toast';
import useFullscreenElement from '../hooks/useFullscreenElement';
import { selectFocus, completeSession, pause, start } from '../features/focus/focusSlice';
import { plantTree, selectTrees, selectHealthyCount } from '../features/forest/forestSlice';
import { playAmbient, stopAmbient, playBeep } from '../services/ambientAudio';
import { toDateStr } from '../utils/date';

const PIP_SUPPORTED = typeof window !== 'undefined' && 'documentPictureInPicture' in window;
const PREVIEW_MS = 4000;

export default function FocusEngine({ children }) {
  const dispatch = useDispatch();
  const toast = useToast();
  const timer = useSelector(selectFocus);
  const trees = useSelector(selectTrees);
  const healthyCount = useSelector(selectHealthyCount);

  const [celebration, setCelebration] = useState(null); // tree just planted
  const [pipWindow, setPipWindow] = useState(null);
  const [previewing, setPreviewing] = useState(false);
  const previewTimer = useRef(null);
  const leftTab = useRef(false);

  const running = timer.endAt !== null;
  const fullscreenEl = useFullscreenElement();

  // ── Finishing a session ─────────────────────────────────────────────────────
  // useEffectEvent always sees the latest state without restarting the interval
  const onFinish = useEffectEvent(() => {
    playBeep();
    if (timer.mode !== 'work') {
      dispatch(completeSession('work'));
      return;
    }
    const tree = { species: timer.species, minutes: timer.focusMinutes, at: timer.endAt, label: timer.label };
    dispatch(plantTree(tree));
    setCelebration(tree);
    // Every 4th tree of the day earns a long break
    const day = toDateStr(new Date(timer.endAt));
    const treesToday = trees.filter((t) => t.date === day && !t.withered).length + 1;
    dispatch(completeSession(treesToday % 4 === 0 ? 'long' : 'break'));
  });

  // Re-reads the clock instead of trusting interval ticks (tabs throttle timers)
  useEffect(() => {
    if (timer.endAt === null) return;
    const endAt = timer.endAt;
    const id = setInterval(() => {
      if (Date.now() >= endAt) {
        clearInterval(id);
        onFinish();
      }
    }, 250);
    return () => clearInterval(id);
  }, [timer.endAt]);

  // ── Ambient sound ───────────────────────────────────────────────────────────
  const soundOn = Boolean(timer.sound) && (running || previewing);
  useEffect(() => {
    if (soundOn) playAmbient(timer.sound, timer.volume);
    else stopAmbient();
  }, [soundOn, timer.sound, timer.volume]);

  useEffect(() => () => {
    stopAmbient();
    clearTimeout(previewTimer.current);
  }, []);

  /** Let the user hear a sound for a few seconds before they start focusing */
  const previewSound = useCallback(() => {
    clearTimeout(previewTimer.current);
    setPreviewing(true);
    previewTimer.current = setTimeout(() => setPreviewing(false), PREVIEW_MS);
  }, []);

  // ── Strict mode: leaving the tab pauses the tree ────────────────────────────
  const onVisibilityChange = useEffectEvent(() => {
    if (document.hidden) {
      // With the mini timer open you're *meant* to be in another app, so don't pause
      if (timer.strict && running && timer.mode === 'work' && !pipWindow) {
        dispatch(pause());
        leftTab.current = true;
      }
    } else if (leftTab.current) {
      leftTab.current = false;
      toast.show({
        icon: '👀',
        message: 'You left the tab. Your tree paused growing',
        action: { label: 'Resume', onClick: () => dispatch(start()) },
        duration: 10000,
      });
    }
  });

  useEffect(() => {
    const handler = () => onVisibilityChange();
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, []);

  // ── Picture-in-Picture mini timer ───────────────────────────────────────────
  const openMiniTimer = useCallback(async () => {
    if (!PIP_SUPPORTED || pipWindow) return;
    try {
      const win = await window.documentPictureInPicture.requestWindow({ width: 280, height: 110 });
      // The PiP window is a blank document: copy our styles (Tailwind) into it
      for (const node of document.querySelectorAll('style, link[rel="stylesheet"]')) {
        win.document.head.appendChild(node.cloneNode(true));
      }
      win.document.title = 'HabitFlow timer';
      win.document.body.style.margin = '0';
      win.addEventListener('pagehide', () => setPipWindow(null));
      setPipWindow(win);
    } catch {
      // User dismissed it or the browser refused — nothing to do
    }
  }, [pipWindow]);

  const closeMiniTimer = useCallback(() => pipWindow?.close(), [pipWindow]);

  const ui = useMemo(() => ({
    pipSupported: PIP_SUPPORTED,
    pipOpen: pipWindow !== null,
    openMiniTimer,
    closeMiniTimer,
    previewSound,
  }), [pipWindow, openMiniTimer, closeMiniTimer, previewSound]);

  return (
    <FocusUIContext.Provider value={ui}>
      {children}

      {/* In the fullscreen focus room only that element is visible, so render there */}
      {celebration && createPortal(
        <PlantCelebration
          tree={celebration}
          totalTrees={healthyCount}
          onClose={() => setCelebration(null)}
          onStartBreak={() => { setCelebration(null); dispatch(start()); }}
        />,
        fullscreenEl ?? document.body
      )}

      {pipWindow && createPortal(<MiniTimer />, pipWindow.document.body)}
    </FocusUIContext.Provider>
  );
}
