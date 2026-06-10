// src/components/HabitCard.jsx
// Displays a single habit with toggle, streak, and delete controls.

import { useDispatch } from 'react-redux';
import { toggleHabit, deleteHabit } from '../features/habits/habitsSlice';

// Returns today's date string "YYYY-MM-DD"
const today = () => new Date().toISOString().split('T')[0];

export default function HabitCard({ habit }) {
  const dispatch = useDispatch();
  const isDoneToday = habit.completedDates.includes(today());

  return (
    <div
      className={`relative group flex items-center justify-between gap-4 p-4 rounded-2xl border transition-all duration-300 shadow-sm hover:shadow-md
        ${isDoneToday
          ? 'bg-violet-50 dark:bg-violet-950/40 border-violet-200 dark:border-violet-700'
          : 'bg-white dark:bg-gray-800/60 border-gray-200 dark:border-gray-700'
        }`}
    >
      {/* Left — icon + name + streak */}
      <div className="flex items-center gap-3 min-w-0">
        {/* Colored icon bubble */}
        <div
          className="flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center text-xl shadow-inner"
          style={{ backgroundColor: habit.color + '22', border: `2px solid ${habit.color}44` }}
        >
          {habit.icon}
        </div>

        <div className="min-w-0">
          <p
            className={`font-semibold text-sm sm:text-base truncate transition-all duration-200
              ${isDoneToday ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-800 dark:text-gray-100'}`}
          >
            {habit.name}
          </p>

          {/* Streak badge */}
          <div className="flex items-center gap-1 mt-0.5">
            <span className="text-xs">🔥</span>
            <span className="text-xs font-medium text-orange-500 dark:text-orange-400">
              {habit.streak} day streak
            </span>
          </div>
        </div>
      </div>

      {/* Right — toggle + delete */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Toggle complete button */}
        <button
          onClick={() => dispatch(toggleHabit(habit.id))}
          title={isDoneToday ? 'Mark undone' : 'Mark done'}
          className={`w-9 h-9 rounded-full flex items-center justify-center text-lg font-bold border-2 transition-all duration-200
            ${isDoneToday
              ? 'bg-violet-500 border-violet-500 text-white scale-105 shadow-lg shadow-violet-200 dark:shadow-violet-900'
              : 'bg-transparent border-gray-300 dark:border-gray-600 text-gray-300 dark:text-gray-600 hover:border-violet-400 hover:text-violet-400'
            }`}
        >
          {isDoneToday ? '✓' : ''}
        </button>

        {/* Delete button — visible on hover */}
        <button
          onClick={() => dispatch(deleteHabit(habit.id))}
          title="Delete habit"
          className="opacity-0 group-hover:opacity-100 w-8 h-8 rounded-full flex items-center justify-center text-sm text-gray-400 dark:text-gray-500 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-500 transition-all duration-200"
        >
          🗑️
        </button>
      </div>
    </div>
  );
}
