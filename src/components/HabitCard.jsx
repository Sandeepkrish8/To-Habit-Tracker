// src/components/HabitCard.jsx
// A single habit: press & hold to complete (with confetti, XP, and a water drop
// that flies to your forest), tap to undo, click the card to open its calendar.

import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { toggleHabit, setHabitDone, deleteHabit } from '../features/habits/habitsSlice';
import { XP } from '../features/achievements/progress';
import { useToast } from '../context/toast';
import useHoldToConfirm from '../hooks/useHoldToConfirm';
import { todayStr as getTodayStr } from '../utils/date';

// Fixed confetti directions: [dx, dy, rotation] — fixed so renders stay pure
const CONFETTI = [
  [-70, -60, 220], [60, -70, -180], [-90, -10, 140], [90, -20, -120], [-40, -90, 300],
  [30, -95, -260], [-100, 30, 90], [100, 25, -80], [0, -100, 180], [-55, 40, -60],
  [55, 45, 60], [-20, -70, 120], [20, -60, -140], [75, -45, 200],
];
const CONFETTI_COLORS = ['#f472b6', '#fbbf24', '#34d399', '#60a5fa', '#a78bfa', '#fb923c'];

const RING = 2 * Math.PI * 18;

/** Sends a water drop from the button to the forest scene (if one is on screen) */
const sendWaterDrop = (el, color) => {
  const r = el.getBoundingClientRect();
  window.dispatchEvent(new CustomEvent('habitflow:water', {
    detail: { x: r.left + r.width / 2, y: r.top + r.height / 2, color },
  }));
};

export default function HabitCard({ habit }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const toast = useToast();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [burst, setBurst] = useState(0); // increments to replay the celebration

  const isDoneToday = habit.completedDates.includes(getTodayStr());
  const totalDone = habit.completedDates.length;

  // Undo restores an exact state for an exact day, so pressing it twice (or after midnight) is safe
  const undoTo = (done, date) => () => dispatch(setHabitDone({ id: habit.id, date, done }));

  const { progress, handlers } = useHoldToConfirm({
    duration: 600,
    onConfirm: () => {
      const date = getTodayStr();
      // Measure the button before re-rendering replaces it with the ✓ button
      const button = document.getElementById(`hold-${habit.id}`);
      if (button) sendWaterDrop(button, habit.color);
      // Explicit "done", not a toggle — safe even if another tab already ticked it
      dispatch(setHabitDone({ id: habit.id, date, done: true }));
      setBurst((b) => b + 1);
      navigator.vibrate?.(30);
      toast.show({ icon: '✅', message: `Marked "${habit.name}" done`, action: { label: 'Undo', onClick: undoTo(false, date) } });
    },
  });

  // ── Handlers ────────────────────────────────────────────────
  const handleUnmark = (e) => {
    e.stopPropagation();
    dispatch(toggleHabit(habit.id));
    toast.show({ icon: '↩️', message: `"${habit.name}" unmarked`, action: { label: 'Undo', onClick: undoTo(true, getTodayStr()) } });
  };

  const handleDeleteClick = (e) => {
    e.stopPropagation();
    setConfirmDelete(true);
  };

  const handleDeleteConfirm = (e) => {
    e.stopPropagation();
    dispatch(deleteHabit(habit.id));
  };

  const handleDeleteCancel = (e) => {
    e.stopPropagation();
    setConfirmDelete(false);
  };

  // ── Render ───────────────────────────────────────────────────
  return (
    <div
      onClick={() => navigate(`/calendar?habit=${habit.id}`)}
      className={`relative group flex items-center justify-between gap-4 p-4 rounded-2xl border
        transition-all duration-300 shadow-sm hover:shadow-md cursor-pointer
        ${progress > 0 ? 'scale-[0.98] border-emerald-300 dark:border-emerald-700' : ''}
        ${isDoneToday
          ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800'
          : 'bg-white dark:bg-gray-800/60 border-gray-200 dark:border-gray-700'
        }`}
    >
      {/* Confetti burst — key replays the animation on every completion */}
      {burst > 0 && (
        <div key={burst} className="pointer-events-none absolute right-10 top-1/2" aria-hidden="true">
          {CONFETTI.map(([dx, dy, rot], i) => (
            <span
              key={i}
              className="anim-confetti absolute w-2 h-1 rounded-sm"
              style={{ backgroundColor: CONFETTI_COLORS[i % CONFETTI_COLORS.length], '--dx': `${dx}px`, '--dy': `${dy}px`, '--rot': `${rot}deg` }}
            />
          ))}
          <span className="anim-float-up absolute -top-10 -left-6 text-xs font-bold px-2 py-0.5 rounded-full bg-violet-600 text-white whitespace-nowrap">
            +{XP.habit} XP
          </span>
        </div>
      )}

      {/* ── Left: icon + name + streaks ── */}
      <div className="flex items-center gap-3 min-w-0">

        {/* Colored icon bubble */}
        <div
          className="flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center text-xl shadow-inner"
          style={{
            backgroundColor: habit.color + '22',
            border: `2px solid ${habit.color}44`,
          }}
        >
          {habit.icon}
        </div>

        {/* Name + stats */}
        <div className="min-w-0">
          <p
            className={`font-semibold text-sm sm:text-base truncate transition-all duration-200
              ${isDoneToday
                ? 'line-through text-gray-400 dark:text-gray-500'
                : 'text-gray-800 dark:text-gray-100'
              }`}
          >
            {habit.name}
          </p>

          {/* Streak row */}
          <div className="flex items-center gap-3 mt-0.5 flex-wrap">

            {/* Current streak — bumps when it grows */}
            <div className="flex items-center gap-1">
              <span className="text-xs">🔥</span>
              <span
                key={burst > 0 ? habit.streak : 'static'}
                className={`text-xs font-medium text-orange-500 dark:text-orange-400 ${burst > 0 ? 'anim-bump' : ''}`}
              >
                {habit.streak} day streak
              </span>
            </div>

            {/* Best streak — only show if > current streak */}
            {habit.bestStreak > habit.streak && (
              <div className="flex items-center gap-1">
                <span className="text-xs">🏆</span>
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  Best: {habit.bestStreak}
                </span>
              </div>
            )}

            {/* Total completions */}
            <div className="flex items-center gap-1">
              <span className="text-xs">✅</span>
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {totalDone} total
              </span>
            </div>

          </div>
        </div>
      </div>

      {/* ── Right: hold-to-complete + delete ── */}
      <div className="flex items-center gap-2 flex-shrink-0">

        {isDoneToday ? (
          <button
            onClick={handleUnmark}
            title="Tap to undo"
            aria-label={`${habit.name} done today. Tap to undo`}
            className="w-11 h-11 rounded-full flex items-center justify-center text-xl font-bold
              bg-emerald-500 text-white shadow-lg shadow-emerald-200 dark:shadow-emerald-950 transition-transform duration-200 hover:scale-105"
          >
            ✓
          </button>
        ) : (
          <button
            id={`hold-${habit.id}`}
            data-undone-habit
            {...handlers}
            title="Press and hold to complete"
            aria-label={`Hold to mark ${habit.name} done`}
            className="relative w-11 h-11 rounded-full flex items-center justify-center touch-none select-none
              text-gray-300 dark:text-gray-600 hover:text-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
          >
            {/* Progress ring fills while you hold */}
            <svg className="absolute inset-0 -rotate-90" viewBox="0 0 44 44" aria-hidden="true">
              <circle cx="22" cy="22" r="18" fill="none" strokeWidth="3" className="stroke-gray-200 dark:stroke-gray-700" />
              <circle
                cx="22" cy="22" r="18" fill="none" strokeWidth="3" strokeLinecap="round"
                className="stroke-emerald-500"
                strokeDasharray={`${progress * RING} ${RING}`}
              />
            </svg>
            <span className={`text-lg transition-transform ${progress > 0 ? 'scale-125 text-emerald-500' : ''}`}>
              {progress > 0 ? '✓' : '👆'}
            </span>
          </button>
        )}

        {/* Delete — confirm flow */}
        {!confirmDelete ? (
          <button
            onClick={handleDeleteClick}
            title="Delete habit"
            aria-label={`Delete ${habit.name}`}
            className="opacity-0 group-hover:opacity-100 focus:opacity-100 w-8 h-8 rounded-full flex
              items-center justify-center text-sm text-gray-400 dark:text-gray-500
              hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-500
              transition-all duration-200"
          >
            🗑️
          </button>
        ) : (
          // Confirm / cancel row
          <div
            className="flex items-center gap-1"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={handleDeleteConfirm}
              className="text-xs px-2 py-1 rounded-lg bg-red-500 text-white
                hover:bg-red-600 transition-colors font-medium"
            >
              Delete
            </button>
            <button
              onClick={handleDeleteCancel}
              className="text-xs px-2 py-1 rounded-lg border border-gray-200
                dark:border-gray-600 text-gray-500 dark:text-gray-400
                hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
