// src/components/EveningReview.jsx
// "Review your day": unfinished habits as a swipeable card stack (Framer Motion).
// Swipe right (or ✓ / →) = done · swipe left (or ✕ / ←) = skipped.
//
//   useMotionValue  – tracks the card's x position without re-rendering React
//   useTransform    – derives tilt and stamp opacity from that x
//   drag + velocity – a quick flick decides, not just a long drag
//   AnimatePresence – lets the decided card fly off before it unmounts

import { useEffect, useEffectEvent, useState } from 'react';
import { useDispatch } from 'react-redux';
import { AnimatePresence, animate, motion, useMotionValue, useTransform } from 'framer-motion';
import StreakFlame from './StreakFlame';
import { setHabitDone } from '../features/habits/habitsSlice';
import { todayStr } from '../utils/date';

const SWIPE_DISTANCE = 120; // px dragged
const SWIPE_VELOCITY = 500; // px/s flick

// The decided card flies off in the direction you chose
const flyOff = {
  exit: (direction) => ({ x: direction * 600, rotate: direction * 35, opacity: 0, transition: { duration: 0.35 } }),
};

function SwipeCard({ habit, onDecide }) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-18, 18]);
  const doneOpacity = useTransform(x, [20, 110], [0, 1]);
  const skipOpacity = useTransform(x, [-110, -20], [1, 0]);

  return (
    <motion.div
      className="absolute inset-0 bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-6 flex flex-col items-center justify-center text-center cursor-grab active:cursor-grabbing touch-none select-none"
      style={{ x, rotate }}
      drag="x"
      dragElastic={0.9}
      onDragEnd={(_, info) => {
        const right = info.offset.x > SWIPE_DISTANCE || info.velocity.x > SWIPE_VELOCITY;
        const left = info.offset.x < -SWIPE_DISTANCE || info.velocity.x < -SWIPE_VELOCITY;
        if (right) onDecide('done');
        else if (left) onDecide('skip');
        else animate(x, 0, { type: 'spring', stiffness: 500, damping: 30 }); // not far enough — spring back
      }}
      initial={{ scale: 0.95, y: 12, opacity: 0 }}
      animate={{ scale: 1, y: 0, opacity: 1 }}
      variants={flyOff}
      exit="exit"
    >
      <motion.span style={{ opacity: doneOpacity }} className="absolute top-6 left-5 -rotate-12 border-[3px] border-emerald-600 text-emerald-600 font-extrabold text-xl px-3 py-0.5 rounded-lg">
        DONE ✓
      </motion.span>
      <motion.span style={{ opacity: skipOpacity }} className="absolute top-6 right-5 rotate-12 border-[3px] border-rose-500 text-rose-500 font-extrabold text-xl px-3 py-0.5 rounded-lg">
        SKIP
      </motion.span>
      <span className="text-6xl">{habit.icon}</span>
      <p className="mt-3 text-xl font-bold text-gray-900 dark:text-white">{habit.name}</p>
      <p className="mt-2 flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
        <StreakFlame streak={habit.streak} best={habit.bestStreak} size={16} /> {habit.streak}-day streak
      </p>
      <p className="mt-6 text-xs text-gray-400">Did you do it today?</p>
    </motion.div>
  );
}

export default function EveningReview({ habits, onClose }) {
  const dispatch = useDispatch();
  // Snapshot the list once, so cards don't shift while you're reviewing
  const [queue] = useState(() => habits.filter((h) => !h.completedDates.includes(todayStr())));
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [results, setResults] = useState({}); // id → 'done' | 'skip'

  const finished = index >= queue.length;
  const doneCount = Object.values(results).filter((r) => r === 'done').length;

  const decide = (choice) => {
    const habit = queue[index];
    if (!habit) return;
    if (choice === 'done') {
      dispatch(setHabitDone({ id: habit.id, date: todayStr(), done: true }));
      navigator.vibrate?.(20);
    }
    setDirection(choice === 'done' ? 1 : -1);
    setResults((r) => ({ ...r, [habit.id]: choice }));
    setIndex((i) => i + 1);
  };

  // Keyboard: → done, ← skip, Esc close
  const onKey = useEffectEvent((e) => {
    if (e.key === 'Escape') onClose();
    else if (!finished && e.key === 'ArrowRight') decide('done');
    else if (!finished && e.key === 'ArrowLeft') decide('skip');
  });
  useEffect(() => {
    const handler = (e) => onKey(e);
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <motion.div
      className="fixed inset-0 z-[75] flex flex-col bg-gradient-to-b from-indigo-950 to-indigo-800 text-white"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      role="dialog"
      aria-modal="true"
      aria-label="Review your day"
    >
      <div className="max-w-sm w-full mx-auto px-6 pt-10 flex items-start justify-between">
        <div>
          <p className="text-xs text-indigo-200">{new Date().toLocaleDateString('en-US', { weekday: 'long' })} evening 🌙</p>
          <h2 className="text-2xl font-bold">Review your day</h2>
          <p className="text-xs text-indigo-200 mt-0.5">
            {finished ? 'All reviewed' : `${index + 1} of ${queue.length} · swipe, tap, or use ← →`}
          </p>
        </div>
        <button onClick={onClose} aria-label="Close review" className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20">✕</button>
      </div>

      {!finished ? (
        <>
          <div className="relative flex-1 max-w-sm w-full mx-auto px-8 py-8">
            <div className="relative h-full max-h-[380px]">
              {/* The next two cards wait behind, springing forward as the top one leaves */}
              {queue.slice(index + 1, index + 3).reverse().map((h, i, arr) => {
                const depth = arr.length - i; // 1 = right behind the top card
                return (
                  <motion.div
                    key={h.id}
                    className="absolute inset-0 bg-white/90 dark:bg-gray-700 rounded-3xl"
                    animate={{ scale: 1 - depth * 0.05, y: depth * 14, opacity: 1 - depth * 0.25 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 26 }}
                  />
                );
              })}
              <AnimatePresence custom={direction}>
                <SwipeCard key={queue[index].id} habit={queue[index]} onDecide={decide} />
              </AnimatePresence>
            </div>
          </div>
          <div className="flex justify-center gap-6 pb-12">
            <motion.button whileTap={{ scale: 0.88 }} onClick={() => decide('skip')} aria-label="Skipped it"
              className="w-16 h-16 rounded-full bg-white text-rose-500 text-2xl font-bold shadow-xl">✕</motion.button>
            <motion.button whileTap={{ scale: 0.88 }} onClick={() => decide('done')} aria-label="Did it"
              className="w-16 h-16 rounded-full bg-emerald-500 text-white text-3xl font-bold shadow-xl shadow-emerald-500/40">✓</motion.button>
          </div>
        </>
      ) : (
        <motion.div
          className="flex-1 flex flex-col items-center justify-center text-center px-6"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 16 }}
        >
          <span className="text-7xl">🎉</span>
          <p className="text-2xl font-bold mt-3">{queue.length === 0 ? 'Nothing left to review!' : 'Day reviewed!'}</p>
          {queue.length > 0 && (
            <p className="text-indigo-200 mt-1">{doneCount} done · {queue.length - doneCount} skipped</p>
          )}
          <div className="flex flex-wrap justify-center gap-2 mt-5 max-w-xs">
            {queue.map((h, i) => (
              <motion.span
                key={h.id}
                initial={{ y: 12, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.15 + i * 0.07 }}
                className={`px-3 py-1.5 rounded-full text-sm font-semibold ${results[h.id] === 'done' ? 'bg-emerald-500' : 'bg-white/15'}`}
              >
                {h.icon} {results[h.id] === 'done' ? '✓' : '–'}
              </motion.span>
            ))}
          </div>
          {doneCount > 0 && <p className="text-xs text-indigo-200 mt-6">Your forest got {doneCount} {doneCount === 1 ? 'drop' : 'drops'} of water 💧</p>}
          <button onClick={onClose} className="mt-8 px-8 py-3 rounded-full bg-white text-indigo-900 font-semibold">Done</button>
        </motion.div>
      )}
    </motion.div>
  );
}
