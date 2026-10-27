// src/pages/Dashboard.jsx
// Home — the living forest, today's progress, and your habit list.
// Habits can be dragged into a new order (Framer Motion's Reorder), and after
// 6 PM a "Review your day" card opens the swipe review.

import { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import { AnimatePresence, Reorder, useDragControls } from 'framer-motion';
import { addHabit, selectHabits, selectTodayCount, selectConsistency, setHabitOrder } from '../features/habits/habitsSlice';
import { weatherOf } from '../features/habits/weather';
import HabitCard from '../components/HabitCard';
import ForestScene from '../components/ForestScene';
import EveningReview from '../components/EveningReview';
import StreakFlame from '../components/StreakFlame';
import Odometer from '../components/Odometer';
import useNow from '../hooks/useNow';
import { todayStr } from '../utils/date';

// Preset icons for habit creation
const ICONS = ['🎯', '💪', '📚', '🧘', '🏃', '💧', '🥗', '😴', '🎨', '🎵', '💻', '✍️'];
const COLORS = ['#7c3aed', '#db2777', '#059669', '#d97706', '#2563eb', '#dc2626', '#0891b2', '#65a30d'];

/** One draggable row. Only the ⠿ handle starts a drag, so press-and-hold still completes. */
function ReorderableHabit({ habit }) {
  const controls = useDragControls();
  return (
    <Reorder.Item
      value={habit.id}
      dragListener={false}
      dragControls={controls}
      className="list-none relative"
      whileDrag={{ scale: 1.03, zIndex: 10, boxShadow: '0 18px 30px -12px rgba(0,0,0,0.35)' }}
      style={{ borderRadius: 16 }}
    >
      <HabitCard habit={habit} onDragHandle={(e) => controls.start(e)} />
    </Reorder.Item>
  );
}

export default function Dashboard() {
  const dispatch = useDispatch();
  const habits = useSelector(selectHabits);
  const todayCount = useSelector(selectTodayCount);
  const consistency = useSelector(selectConsistency);
  const rainy = weatherOf(consistency, habits.length > 0) === 'rainy';
  const hour = new Date(useNow(true, 60_000)).getHours();

  // Whether the review is open lives in the URL (?review=1), so the command bar
  // and the back button can open/close it too
  const [params, setParams] = useSearchParams();
  const reviewOpen = params.get('review') === '1';
  const openReview = () => setParams({ review: '1' });
  const closeReview = () => setParams({}, { replace: true });
  const today = todayStr();
  const undoneCount = habits.filter((h) => !h.completedDates.includes(today)).length;
  const evening = hour >= 18 || hour < 3;

  /** Scroll to the first unfinished habit and focus its hold button */
  const focusFirstUndone = () => {
    const button = document.querySelector('[data-undone-habit]');
    button?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    button?.focus({ preventScroll: true });
  };

  // Form state
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('🎯');
  const [color, setColor] = useState('#7c3aed');
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');

  const handleAdd = () => {
    if (!name.trim()) {
      setError('Please enter a habit name.');
      return;
    }
    if (name.trim().length > 50) {
      setError('Name must be 50 characters or less.');
      return;
    }
    dispatch(addHabit({ name, icon, color }));
    setName('');
    setIcon('🎯');
    setColor('#7c3aed');
    setShowForm(false);
    setError('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleAdd();
    if (e.key === 'Escape') { setShowForm(false); setError(''); }
  };

  const completionPct = habits.length > 0 ? Math.round((todayCount / habits.length) * 100) : 0;
  const todayLabel = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-6">

      {/* Header */}
      <div>
        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{todayLabel}</p>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mt-1">My Habits</h1>
      </div>

      <ForestScene />

      {/* Evening: invite a 10-second swipe review of anything unfinished */}
      {evening && undoneCount > 0 && (
        <button
          onClick={openReview}
          className="anim-fade-up w-full rounded-2xl p-4 flex items-center gap-3 text-left text-white bg-gradient-to-r from-indigo-900 to-indigo-700 shadow-lg shadow-indigo-900/20 hover:-translate-y-0.5 transition-transform"
        >
          <span className="text-2xl">🌙</span>
          <span className="flex-1">
            <span className="block font-semibold">Review your day</span>
            <span className="block text-sm text-indigo-200">{undoneCount} {undoneCount === 1 ? 'habit' : 'habits'} left · swipe through in 10 seconds</span>
          </span>
          <span className="text-indigo-200">→</span>
        </button>
      )}

      {/* Gentle nudge when it's been raining — encouraging, never guilt-tripping */}
      {rainy && (
        <div className="anim-fade-up rounded-2xl p-4 bg-gradient-to-br from-sky-50 to-emerald-50 dark:from-sky-950/40 dark:to-emerald-950/40 border border-sky-100 dark:border-sky-900 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1">
            <p className="font-semibold text-gray-900 dark:text-white">Your forest misses you 🌱</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Finish just one habit to bring the sun back. Small wins count.</p>
          </div>
          <button
            onClick={focusFirstUndone}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors"
          >
            ☀️ Do one habit now
          </button>
        </div>
      )}

      {/* Progress summary card */}
      {habits.length > 0 && (
        <div className="bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl p-5 text-white shadow-lg shadow-violet-200 dark:shadow-violet-950">
          <div className="flex items-end justify-between mb-3">
            <div>
              <p className="text-violet-200 text-sm font-medium">Today's Progress</p>
              <p className="text-4xl font-bold mt-0.5"><Odometer value={completionPct} />%</p>
            </div>
            <div className="flex items-end gap-2 text-right">
              <p className="text-violet-200 text-sm">
                {todayCount} / {habits.length} done
                {consistency.dayStreak > 0 && <span className="block text-white font-semibold">{consistency.dayStreak}-day streak</span>}
              </p>
              <StreakFlame
                streak={consistency.dayStreak}
                best={habits.some((h) => h.completedDates.length > 0) ? 1 : 0}
                size={34}
              />
            </div>
          </div>
          {/* Progress bar */}
          <div className="w-full bg-white/20 rounded-full h-2.5">
            <div
              className="bg-white rounded-full h-2.5 transition-all duration-700 ease-out"
              style={{ width: `${completionPct}%` }}
            />
          </div>
          {completionPct === 100 && (
            <p className="text-white/90 text-sm mt-3 font-medium animate-pulse">
              🎉 All habits done! Amazing work today!
            </p>
          )}
        </div>
      )}

      {/* Add habit button / form */}
      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="w-full py-3 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500 hover:border-violet-400 hover:text-violet-500 dark:hover:border-violet-600 dark:hover:text-violet-400 font-medium text-sm transition-all duration-200 flex items-center justify-center gap-2"
        >
          <span className="text-lg">+</span> Add a new habit
        </button>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm space-y-4">
          <h2 className="font-semibold text-gray-800 dark:text-gray-100">New Habit</h2>

          {/* Name input */}
          <input
            autoFocus
            type="text"
            placeholder="e.g. Morning run, Read 30 min…"
            value={name}
            onChange={(e) => { setName(e.target.value); setError(''); }}
            onKeyDown={handleKeyDown}
            maxLength={50}
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-100 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 transition"
          />
          {error && <p className="text-red-500 text-xs">{error}</p>}

          {/* Icon picker */}
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 font-medium">Choose icon</p>
            <div className="flex flex-wrap gap-2">
              {ICONS.map((ic) => (
                <button
                  key={ic}
                  onClick={() => setIcon(ic)}
                  className={`w-9 h-9 rounded-lg text-xl flex items-center justify-center transition-all duration-150
                    ${icon === ic ? 'ring-2 ring-violet-500 bg-violet-50 dark:bg-violet-950 scale-110' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                >
                  {ic}
                </button>
              ))}
            </div>
          </div>

          {/* Color picker */}
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 font-medium">Choose color</p>
            <div className="flex gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full transition-all duration-150 ${color === c ? 'ring-2 ring-offset-2 ring-gray-400 dark:ring-offset-gray-800 scale-110' : ''}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleAdd}
              className="flex-1 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition-colors duration-200 shadow-sm"
            >
              Add Habit
            </button>
            <button
              onClick={() => { setShowForm(false); setError(''); setName(''); }}
              className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Habit list */}
      {habits.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <div className="text-6xl">🌱</div>
          <p className="text-gray-500 dark:text-gray-400 font-medium">No habits yet.</p>
          <p className="text-gray-400 dark:text-gray-500 text-sm">Add your first habit to get started!</p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
            Hold 👆 to complete · tap a habit for details · drag ⠿ to reorder
          </p>
          <Reorder.Group
            axis="y"
            values={habits.map((h) => h.id)}
            onReorder={(ids) => dispatch(setHabitOrder(ids))}
            className="space-y-3"
          >
            {habits.map((habit) => (
              <ReorderableHabit key={habit.id} habit={habit} />
            ))}
          </Reorder.Group>
        </div>
      )}

      <AnimatePresence>
        {reviewOpen && <EveningReview habits={habits} onClose={closeReview} />}
      </AnimatePresence>
    </div>
  );
}
