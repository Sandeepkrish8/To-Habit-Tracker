// src/components/MilestoneWatcher.jsx
// When a habit's streak reaches 7, 30 or 100 days for the first time, show a
// full-screen ceremony: fireworks (staggered particles), the badge spinning in,
// and the new flame.

import { useEffect, useEffectEvent } from 'react';
import { createPortal } from 'react-dom';
import { useDispatch, useSelector } from 'react-redux';
import { AnimatePresence, motion } from 'framer-motion';
import StreakFlame from './StreakFlame';
import useFullscreenElement from '../hooks/useFullscreenElement';
import { selectHabits } from '../features/habits/habitsSlice';
import { MILESTONES, MILESTONE_COPY } from '../features/habits/flame';
import {
  markCelebrated, celebrate, dismissCeremony, selectAchievementState,
} from '../features/achievements/achievementsSlice';

const COLORS = ['#60a5fa', '#f472b6', '#fde047', '#a78bfa', '#34d399', '#fb923c'];
// Burst centers as % of the screen
const BURSTS = [[18, 22], [80, 18], [12, 72], [86, 70], [50, 12]];

// Parent "orchestrates" its children: each particle starts a little after the last
const burst = { show: { transition: { staggerChildren: 0.02 } } };
const particle = {
  hidden: { x: 0, y: 0, opacity: 0, scale: 0 },
  show: (angle) => ({
    x: Math.cos(angle) * 70,
    y: Math.sin(angle) * 70,
    opacity: [0, 1, 1, 0],
    scale: [0, 1.2, 1, 0.6],
    transition: { duration: 1.4, repeat: 2, repeatDelay: 0.3 },
  }),
};

function Ceremony({ milestone, habit, onClose }) {
  const copy = MILESTONE_COPY[milestone];

  const onKey = useEffectEvent((e) => {
    if (e.key === 'Escape' || e.key === 'Enter') onClose();
  });
  useEffect(() => {
    navigator.vibrate?.([30, 50, 30]);
    const handler = (e) => onKey(e);
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <motion.div
      className="fixed inset-0 z-[90] flex items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_50%_55%,#1e3a8a,#0c0a09_70%)] text-white px-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={copy.title}
    >
      {BURSTS.map(([left, top], b) => (
        <motion.div
          key={b}
          className="absolute"
          style={{ left: `${left}%`, top: `${top}%` }}
          variants={burst}
          initial="hidden"
          animate="show"
          transition={{ delayChildren: b * 0.25 }}
          aria-hidden="true"
        >
          {Array.from({ length: 16 }, (_, i) => (
            <motion.span
              key={i}
              custom={(i / 16) * Math.PI * 2}
              variants={particle}
              className="absolute w-2 h-2 rounded-full"
              style={{ backgroundColor: COLORS[(i + b) % COLORS.length], boxShadow: `0 0 10px ${COLORS[(i + b) % COLORS.length]}` }}
            />
          ))}
        </motion.div>
      ))}

      <div className="relative flex flex-col items-center text-center" onClick={(e) => e.stopPropagation()}>
        <motion.div
          initial={{ rotateY: 0, scale: 0 }}
          animate={{ rotateY: 360, scale: 1 }}
          transition={{ type: 'spring', stiffness: 120, damping: 12, delay: 0.1 }}
        >
          <StreakFlame streak={milestone} best={milestone} size={130} />
        </motion.div>
        <motion.p initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.35 }}
          className="mt-4 text-xs font-bold tracking-[0.2em] text-sky-300">MILESTONE UNLOCKED</motion.p>
        <motion.p initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.45 }}
          className="text-4xl font-extrabold mt-1">{copy.title}</motion.p>
        <motion.p initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.55 }}
          className="mt-2 text-lg">{habit.icon} {habit.name}</motion.p>
        <motion.p initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.65 }}
          className="text-slate-300">{copy.line}</motion.p>
        <motion.button
          initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.8 }}
          whileTap={{ scale: 0.92 }}
          onClick={onClose}
          className="mt-8 px-8 py-3 rounded-full bg-white text-slate-900 font-semibold"
        >
          Keep it burning 🔥
        </motion.button>
      </div>
    </motion.div>
  );
}

export default function MilestoneWatcher() {
  const dispatch = useDispatch();
  const habits = useSelector(selectHabits);
  const { milestonesInitialized, celebrated, ceremony } = useSelector(selectAchievementState);
  const fullscreenEl = useFullscreenElement();
  // The ceremony lives in Redux, so this component only *reads* it — no setState in an effect
  const habit = ceremony && habits.find((h) => h.id === ceremony.habitId);

  useEffect(() => {
    // Every milestone each habit has reached so far, e.g. "abc:7", "abc:30"
    const reached = habits.flatMap((h) => MILESTONES.filter((m) => h.streak >= m).map((m) => ({ key: `${h.id}:${m}`, m, h })));
    const fresh = reached.filter((r) => !celebrated.includes(r.key));
    if (fresh.length === 0) return;

    // First run ever: count what you already have as celebrated — no surprise fireworks
    if (!milestonesInitialized) {
      dispatch(markCelebrated(reached.map((r) => r.key)));
      return;
    }
    // Celebrate the biggest new milestone; lower ones for the same habit are implied
    const top = fresh.reduce((best, r) => (r.m > best.m ? r : best));
    dispatch(celebrate({
      keys: fresh.filter((r) => r.h.id === top.h.id).map((r) => r.key),
      habitId: top.h.id,
      milestone: top.m,
    }));
  }, [habits, celebrated, milestonesInitialized, dispatch]);

  return createPortal(
    <AnimatePresence>
      {habit && (
        <Ceremony
          key={habit.id + ceremony.milestone}
          milestone={ceremony.milestone}
          habit={habit}
          onClose={() => dispatch(dismissCeremony())}
        />
      )}
    </AnimatePresence>,
    fullscreenEl ?? document.body
  );
}
