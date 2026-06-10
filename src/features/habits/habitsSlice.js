// src/features/habits/habitsSlice.js
// Redux slice for habits: add, delete, toggle, and streak calculation.

import { createSlice } from '@reduxjs/toolkit';
import { v4 as uuidv4 } from 'uuid';

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Returns today's date string in "YYYY-MM-DD" format */
const toDateStr = (date) => date.toISOString().split('T')[0];
const today = () => toDateStr(new Date());

/**
 * Calculate the current streak for a habit.
 * A streak is the number of consecutive days ending today (or yesterday if
 * today is not yet completed) that the habit was completed.
 */
const calcStreak = (completedDates) => {
  if (!completedDates || completedDates.length === 0) return 0;

  // Sort dates descending
  const sorted = [...completedDates].sort((a, b) => (a > b ? -1 : 1));
  const todayStr = today();

  // Streak must include today or yesterday to be "active"
  if (sorted[0] !== todayStr) return 0;

  let streak = 0;
  let cursor = new Date();

  for (const dateStr of sorted) {
    const cursorStr = toDateStr(cursor);
    if (dateStr === cursorStr) {
      streak++;
      // Move cursor back one day
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
};

// ── Initial State (hydrated from localStorage) ────────────────────────────────

const loadHabits = () => {
  try {
    const raw = localStorage.getItem('habitTracker_habits');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

// ── Slice ─────────────────────────────────────────────────────────────────────

const habitsSlice = createSlice({
  name: 'habits',
  initialState: {
    habits: loadHabits(),
  },
  reducers: {
    /**
     * addHabit — creates a new habit.
     * Payload: { name: string, icon: string, color: string }
     */
    addHabit(state, action) {
      const { name, icon, color } = action.payload;
      state.habits.push({
        id: uuidv4(),
        name: name.trim(),
        icon,
        color,
        createdAt: new Date().toISOString(),
        completedDates: [],
        streak: 0,
      });
    },

    /**
     * deleteHabit — removes a habit by id.
     * Payload: habitId (string)
     */
    deleteHabit(state, action) {
      state.habits = state.habits.filter((h) => h.id !== action.payload);
    },

    /**
     * toggleHabit — marks today done or undone, then recalculates streak.
     * Payload: habitId (string)
     */
    toggleHabit(state, action) {
      const habit = state.habits.find((h) => h.id === action.payload);
      if (!habit) return;

      const todayStr = today();
      const alreadyDone = habit.completedDates.includes(todayStr);

      if (alreadyDone) {
        // Un-complete today
        habit.completedDates = habit.completedDates.filter((d) => d !== todayStr);
      } else {
        // Complete today
        habit.completedDates.push(todayStr);
      }

      // Recalculate streak after toggling
      habit.streak = calcStreak(habit.completedDates);
    },
  },
});

export const { addHabit, deleteHabit, toggleHabit } = habitsSlice.actions;

// ── Selectors ─────────────────────────────────────────────────────────────────

/** Returns all habits */
export const selectHabits = (state) => state.habits.habits;

/** Returns the number of habits completed today */
export const selectTodayCount = (state) => {
  const todayStr = today();
  return state.habits.habits.filter((h) => h.completedDates.includes(todayStr)).length;
};

/**
 * Returns last 7 days of completion data for Recharts.
 * Shape: [{ day: 'Mon', date: '2025-01-06', count: 3, total: 5 }, ...]
 */
export const selectWeeklyData = (state) => {
  const habits = state.habits.habits;
  const result = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = toDateStr(d);
    const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short' });

    const count = habits.filter((h) => h.completedDates.includes(dateStr)).length;
    result.push({
      day: dayLabel,
      date: dateStr,
      count,
      total: habits.length,
    });
  }
  return result;
};

export default habitsSlice.reducer;
