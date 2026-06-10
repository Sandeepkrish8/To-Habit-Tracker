// src/features/habits/habitsSlice.js
// Redux slice for habits: add, delete, toggle, streak calculation, and selectors.

import { createSlice } from '@reduxjs/toolkit';
import { v4 as uuidv4 } from 'uuid';

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Returns a date as "YYYY-MM-DD" string */
const toDateStr = (date) => date.toISOString().split('T')[0];

/** Returns today as "YYYY-MM-DD" */
const todayStr = () => toDateStr(new Date());

/** Returns yesterday as "YYYY-MM-DD" */
const yesterdayStr = () => toDateStr(new Date(Date.now() - 86_400_000));

/**
 * Calculate current streak for a habit.
 * 
 * Rules:
 * - If last completed date is neither today nor yesterday → streak is 0
 * - Otherwise count consecutive days backwards from last completed date
 * 
 * Fix from v1: streak no longer shows 0 before you tick today
 */
const calcStreak = (completedDates) => {
  if (!completedDates || completedDates.length === 0) return 0;

  // Sort descending (most recent first)
  const sorted = [...completedDates].sort((a, b) => (a > b ? -1 : 1));
  const latest = sorted[0];
  const today = todayStr();
  const yesterday = yesterdayStr();

  // Streak is broken if last completion was before yesterday
  if (latest !== today && latest !== yesterday) return 0;

  // Start cursor from the most recent completed date
  const startDate = new Date(latest + 'T00:00:00');
  let streak = 0;
  let cursor = startDate;

  for (const dateStr of sorted) {
    if (dateStr === toDateStr(cursor)) {
      streak++;
      cursor.setDate(cursor.getDate() - 1); // go back one day
    } else {
      break; // gap found — streak ends
    }
  }

  return streak;
};

/**
 * Calculate the best (longest) streak ever for a habit.
 * Scans all completedDates regardless of recency.
 */
const calcBestStreak = (completedDates) => {
  if (!completedDates || completedDates.length === 0) return 0;

  const sorted = [...completedDates].sort((a, b) => (a > b ? 1 : -1)); // ascending
  let best = 1;
  let current = 1;

  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1] + 'T00:00:00');
    const curr = new Date(sorted[i]  + 'T00:00:00');
    const diffDays = (curr - prev) / 86_400_000;

    if (diffDays === 1) {
      // Consecutive day
      current++;
      if (current > best) best = current;
    } else {
      // Gap — reset
      current = 1;
    }
  }

  return best;
};

// ── localStorage loader ───────────────────────────────────────────────────────

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
     * addHabit
     * Payload: { name: string, icon: string, color: string }
     */
    addHabit(state, action) {
      const { name, icon, color } = action.payload;
      state.habits.push({
        id:             uuidv4(),
        name:           name.trim(),
        icon:           icon  || '🎯',
        color:          color || '#7c3aed',
        createdAt:      new Date().toISOString(),
        completedDates: [],
        streak:         0,
        bestStreak:     0,
      });
    },

    /**
     * deleteHabit
     * Payload: habitId (string)
     */
    deleteHabit(state, action) {
      state.habits = state.habits.filter((h) => h.id !== action.payload);
    },

    /**
     * toggleHabit — marks today done or undone, recalculates streak.
     * Payload: habitId (string)
     */
    toggleHabit(state, action) {
      const habit = state.habits.find((h) => h.id === action.payload);
      if (!habit) return;

      const today = todayStr();
      const alreadyDone = habit.completedDates.includes(today);

      if (alreadyDone) {
        // Unmark today
        habit.completedDates = habit.completedDates.filter((d) => d !== today);
      } else {
        // Mark today complete
        habit.completedDates.push(today);
      }

      // Recalculate both streaks
      habit.streak     = calcStreak(habit.completedDates);
      habit.bestStreak = calcBestStreak(habit.completedDates);
    },

    /**
     * editHabit — update name, icon, or color of an existing habit.
     * Payload: { id: string, name?: string, icon?: string, color?: string }
     */
    editHabit(state, action) {
      const { id, name, icon, color } = action.payload;
      const habit = state.habits.find((h) => h.id === id);
      if (!habit) return;
      if (name  !== undefined) habit.name  = name.trim();
      if (icon  !== undefined) habit.icon  = icon;
      if (color !== undefined) habit.color = color;
    },

    /**
     * reorderHabits — drag-and-drop reorder support.
     * Payload: { fromIndex: number, toIndex: number }
     */
    reorderHabits(state, action) {
      const { fromIndex, toIndex } = action.payload;
      const [moved] = state.habits.splice(fromIndex, 1);
      state.habits.splice(toIndex, 0, moved);
    },
  },
});

export const {
  addHabit,
  deleteHabit,
  toggleHabit,
  editHabit,
  reorderHabits,
} = habitsSlice.actions;

// ── Selectors ─────────────────────────────────────────────────────────────────

/** All habits */
export const selectHabits = (state) => state.habits.habits;

/** Number of habits completed today */
export const selectTodayCount = (state) => {
  const today = todayStr();
  return state.habits.habits.filter((h) =>
    h.completedDates.includes(today)
  ).length;
};

/** Total habits count */
export const selectTotalHabits = (state) => state.habits.habits.length;

/** Completion percentage for today (0–100) */
export const selectTodayPct = (state) => {
  const total = state.habits.habits.length;
  if (total === 0) return 0;
  const today = todayStr();
  const done = state.habits.habits.filter((h) =>
    h.completedDates.includes(today)
  ).length;
  return Math.round((done / total) * 100);
};

/** Highest current streak across all habits */
export const selectTopStreak = (state) =>
  state.habits.habits.reduce((max, h) => Math.max(max, h.streak ?? 0), 0);

/** Highest best streak across all habits */
export const selectTopBestStreak = (state) =>
  state.habits.habits.reduce((max, h) => Math.max(max, h.bestStreak ?? 0), 0);

/**
 * Last 7 days of completion data for Recharts.
 * Shape: [{ day: 'Mon', date: '2025-06-10', count: 3, total: 5, pct: 60 }]
 */
export const selectWeeklyData = (state) => {
  const habits = state.habits.habits;
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i)); // oldest → newest
    const dateStr = toDateStr(d);
    const count   = habits.filter((h) => h.completedDates.includes(dateStr)).length;
    return {
      day:   d.toLocaleDateString('en-US', { weekday: 'short' }),
      date:  dateStr,
      count,
      total: habits.length,
      pct:   habits.length > 0 ? Math.round((count / habits.length) * 100) : 0,
    };
  });
};

/**
 * Total completions all time across all habits.
 */
export const selectTotalCompletions = (state) =>
  state.habits.habits.reduce(
    (sum, h) => sum + (h.completedDates?.length ?? 0),
    0
  );

export default habitsSlice.reducer;