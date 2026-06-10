// src/components/HabitCard.jsx
// Displays a single habit with toggle, streak, best streak, and delete controls.

import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { toggleHabit, deleteHabit } from '../features/habits/habitsSlice';

// Computed once per render — avoids repeated Date() calls
const getTodayStr = () => new Date().toISOString().split('T')[0];

export default function HabitCard({ habit }) {
  const dispatch    = useDispatch();
  const navigate    = useNavigate();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const todayStr    = getTodayStr();
  const isDoneToday = habit.completedDates.includes(todayStr);
  const totalDone   = habit.completedDates.length;

  // ── Handlers ────────────────────────────────────────────────
  const handleToggle = (e) => {
    e.stopPropagation(); // prevent card click → navigate
    dispatch(toggleHabit(habit.id));
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

  const handleCardClick = () => {
    navigate(`/habit/${habit.id}`); // → Habit Detail page
  };

  // ── Render ───────────────────────────────────────────────────
  return (
    <div
      onClick={handleCardClick}
      className={`relative group flex items-center justify-between gap-4 p-4 rounded-2xl border 
        transition-all duration-300 shadow-sm hover:shadow-md cursor-pointer
        ${isDoneToday
          ? 'bg-violet-50 dark:bg-violet-950/40 border-violet-200 dark:border-violet-700'
          : 'bg-white dark:bg-gray-800/60 border-gray-200 dark:border-gray-700'
        }`}
    >
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

            {/* Current streak */}
            <div className="flex items-center gap-1">
              <span className="text-xs">🔥</span>
              <span className="text-xs font-medium text-orange-500 dark:text-orange-400">
                {habit.streak ?? 0} day streak
              </span>
            </div>

            {/* Best streak — only show if > current streak */}
            {(habit.bestStreak ?? 0) > (habit.streak ?? 0) && (
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

      {/* ── Right: toggle + delete ── */}
      <div className="flex items-center gap-2 flex-shrink-0">

        {/* Toggle complete button */}
        <button
          onClick={handleToggle}
          title={isDoneToday ? 'Mark undone' : 'Mark done'}
          className={`w-9 h-9 rounded-full flex items-center justify-center text-lg 
            font-bold border-2 transition-all duration-200
            ${isDoneToday
              ? 'bg-violet-500 border-violet-500 text-white scale-105 shadow-lg shadow-violet-200 dark:shadow-violet-900'
              : 'bg-transparent border-gray-300 dark:border-gray-600 text-gray-300 dark:text-gray-600 hover:border-violet-400 hover:text-violet-400'
            }`}
        >
          {isDoneToday ? '✓' : ''}
        </button>

        {/* Delete — confirm flow */}
        {!confirmDelete ? (
          <button
            onClick={handleDeleteClick}
            title="Delete habit"
            className="opacity-0 group-hover:opacity-100 w-8 h-8 rounded-full flex 
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

      {/* Done today overlay badge */}
      {isDoneToday && (
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 
          transition-opacity duration-200">
          <span className="text-xs bg-violet-100 dark:bg-violet-900 text-violet-600 
            dark:text-violet-300 px-2 py-0.5 rounded-full font-medium">
            Done today ✓
          </span>
        </div>
      )}
    </div>
  );
}