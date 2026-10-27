// src/features/habits/habitsSlice.js
// Redux slice for habits: add, delete, toggle (today or any past day), streak freezes, and selectors.
//
// Streaks are *derived* in selectors instead of stored. A stored streak goes stale
// the moment a day passes without a toggle; a derived one is always correct.

import { createSlice, createSelector } from '@reduxjs/toolkit';
import { v4 as uuidv4 } from 'uuid';
import { toDateStr, todayStr, daysAgoStr, addDays } from '../../utils/date';
import { loadJSON } from '../../utils/storage';

/** Freezes everyone starts with; one more is earned for every 7 perfect days */
export const STARTER_FREEZES = 2;

// ── Streak helpers ────────────────────────────────────────────────────────────

/**
 * Current streak: consecutive completed days ending today (or yesterday, so an
 * unfinished today doesn't break it). Frozen days bridge a gap without adding to it.
 */
export const calcStreak = (completedDates, frozen) => {
  const done = new Set(completedDates);
  let offset = done.has(todayStr()) ? 0 : 1;
  let streak = 0;
  // Cap the walk at ~10 years so a long run of frozen days can never loop forever
  for (let guard = 0; guard < 3660; guard++, offset++) {
    const day = daysAgoStr(offset);
    if (done.has(day)) streak++;
    else if (!frozen.has(day)) break;
  }
  return streak;
};

/** Longest streak ever, with frozen days bridging gaps */
export const calcBestStreak = (completedDates, frozen) => {
  if (completedDates.length === 0) return 0;
  const sorted = [...completedDates].sort();
  let best = 1;
  let current = 1;

  for (let i = 1; i < sorted.length; i++) {
    // Walk the days between two completions; any unfrozen gap day breaks the run
    let day = addDays(sorted[i - 1], 1);
    while (day < sorted[i] && frozen.has(day)) day = addDays(day, 1);

    current = day === sorted[i] ? current + 1 : 1;
    best = Math.max(best, current);
  }
  return best;
};

/** Has this habit been created by `date`? Older days shouldn't count against new habits. */
const existedOn = (habit, date) => toDateStr(new Date(habit.createdAt)) <= date;

// ── Slice ─────────────────────────────────────────────────────────────────────

const toggleDate = (habit, date) => {
  habit.completedDates = habit.completedDates.includes(date)
    ? habit.completedDates.filter((d) => d !== date)
    : [...habit.completedDates, date];
};

const habitsSlice = createSlice({
  name: 'habits',
  initialState: {
    habits:      loadJSON('habitTracker_habits', []),
    frozenDates: loadJSON('habitTracker_frozen', []),
  },

  reducers: {
    /**
     * addHabit
     * Payload: { name: string, icon: string, color: string }
     */
    addHabit: {
      reducer(state, action) {
        state.habits.push(action.payload);
      },
      // uuid + timestamp are generated here so the reducer stays pure
      prepare({ name, icon, color }) {
        return {
          payload: {
            id:             uuidv4(),
            name:           name.trim(),
            icon:           icon  || '🎯',
            color:          color || '#7c3aed',
            createdAt:      new Date().toISOString(),
            completedDates: [],
          },
        };
      },
    },

    /**
     * deleteHabit
     * Payload: habitId (string)
     */
    deleteHabit(state, action) {
      state.habits = state.habits.filter((h) => h.id !== action.payload);
    },

    /**
     * toggleHabit — marks today done or undone.
     * Payload: habitId (string)
     */
    toggleHabit: {
      reducer(state, action) {
        const habit = state.habits.find((h) => h.id === action.payload.id);
        if (habit) toggleDate(habit, action.payload.date);
      },
      prepare: (id) => ({ payload: { id, date: todayStr() } }),
    },

    /**
     * setHabitDone — backfill: set a habit done/undone on any day.
     * Payload: { id: string, date: "YYYY-MM-DD", done: boolean }
     */
    setHabitDone(state, action) {
      const { id, date, done } = action.payload;
      const habit = state.habits.find((h) => h.id === id);
      if (!habit || habit.completedDates.includes(date) === done) return;
      toggleDate(habit, date);
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

    /**
     * setHabitOrder — drag-to-reorder. Payload: habit ids in their new order
     */
    setHabitOrder(state, action) {
      const byId = new Map(state.habits.map((h) => [h.id, h]));
      const ordered = action.payload.map((id) => byId.get(id)).filter(Boolean);
      // Keep any habit the payload didn't mention (e.g. added in another tab)
      state.habits = [...ordered, ...state.habits.filter((h) => !action.payload.includes(h.id))];
    },

    /** applyFreeze — protect every streak on a missed day. Payload: "YYYY-MM-DD" */
    applyFreeze(state, action) {
      if (!state.frozenDates.includes(action.payload)) state.frozenDates.push(action.payload);
    },

    /** removeFreeze — give a freeze back. Payload: "YYYY-MM-DD" */
    removeFreeze(state, action) {
      state.frozenDates = state.frozenDates.filter((d) => d !== action.payload);
    },
  },
});

export const {
  addHabit,
  deleteHabit,
  toggleHabit,
  setHabitDone,
  editHabit,
  reorderHabits,
  setHabitOrder,
  applyFreeze,
  removeFreeze,
} = habitsSlice.actions;

// ── Selectors ─────────────────────────────────────────────────────────────────

/** Raw habits as stored (no derived fields) */
export const selectRawHabits = (state) => state.habits.habits;

/** Days protected by a streak freeze */
export const selectFrozenDates = (state) => state.habits.frozenDates;

// Including today as an input makes memoized selectors recompute after midnight
const selectToday = () => todayStr();

/** All habits, each with fresh `streak` and `bestStreak` fields */
export const selectHabits = createSelector(
  [selectRawHabits, selectFrozenDates, selectToday],
  (habits, frozenDates) => {
    const frozen = new Set(frozenDates);
    return habits.map((h) => ({
      ...h,
      streak:     calcStreak(h.completedDates, frozen),
      bestStreak: calcBestStreak(h.completedDates, frozen),
    }));
  }
);

/** Map of "YYYY-MM-DD" → number of habits completed that day */
export const selectCompletionsByDate = createSelector([selectRawHabits], (habits) => {
  const map = new Map();
  for (const h of habits) {
    for (const d of h.completedDates) map.set(d, (map.get(d) ?? 0) + 1);
  }
  return map;
});

/** Set of days where every habit that existed that day was completed */
export const selectPerfectDates = createSelector([selectRawHabits], (habits) => {
  const perfect = new Set();
  const candidates = new Set(habits.flatMap((h) => h.completedDates));
  for (const date of candidates) {
    const active = habits.filter((h) => existedOn(h, date));
    if (active.length > 0 && active.every((h) => h.completedDates.includes(date))) perfect.add(date);
  }
  return perfect;
});

/** Streak freezes still available to spend */
export const selectFreezesLeft = createSelector(
  [selectPerfectDates, selectFrozenDates],
  (perfect, frozen) => Math.max(0, STARTER_FREEZES + Math.floor(perfect.size / 7) - frozen.length)
);

/**
 * "Any habit" day streak plus how many days in a row were missed —
 * drives the weather on the home screen.
 */
export const selectConsistency = createSelector(
  [selectRawHabits, selectCompletionsByDate, selectFrozenDates, selectToday],
  (habits, byDate, frozenDates, today) => {
    if (habits.length === 0) return { dayStreak: 0, missedDays: 0, doneToday: false };
    const frozen = new Set(frozenDates);
    const firstDay = habits.map((h) => toDateStr(new Date(h.createdAt))).sort()[0];

    const doneToday = byDate.has(today);
    let dayStreak = 0;
    let missedDays = 0;
    let offset = doneToday ? 0 : 1;
    let countingMissed = !doneToday;

    for (let guard = 0; guard < 3660; guard++, offset++) {
      const day = daysAgoStr(offset);
      if (day < firstDay) break;
      if (byDate.has(day)) {
        countingMissed = false;
        dayStreak++;
      } else if (frozen.has(day)) {
        continue;
      } else if (countingMissed) {
        missedDays++;
      } else {
        break;
      }
    }
    return { dayStreak, missedDays, doneToday };
  }
);

/** Number of habits completed today */
export const selectTodayCount = (state) => {
  const today = todayStr();
  return state.habits.habits.filter((h) => h.completedDates.includes(today)).length;
};

/** Total habits count */
export const selectTotalHabits = (state) => state.habits.habits.length;

/** Completion percentage for today (0–100) */
export const selectTodayPct = (state) => {
  const total = selectTotalHabits(state);
  return total === 0 ? 0 : Math.round((selectTodayCount(state) / total) * 100);
};

/** Highest current streak across all habits */
export const selectTopStreak = createSelector([selectHabits], (habits) =>
  habits.reduce((max, h) => Math.max(max, h.streak), 0)
);

/** Highest best streak across all habits */
export const selectTopBestStreak = createSelector([selectHabits], (habits) =>
  habits.reduce((max, h) => Math.max(max, h.bestStreak), 0)
);

/**
 * Last 7 days of completion data for Recharts.
 * Shape: [{ day: 'Mon', date: '2025-06-10', count: 3, total: 5, pct: 60 }]
 */
export const selectWeeklyData = createSelector([selectRawHabits, selectToday], (habits) =>
  Array.from({ length: 7 }, (_, i) => {
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
  })
);

/** Total completions all time across all habits */
export const selectTotalCompletions = (state) =>
  state.habits.habits.reduce((sum, h) => sum + h.completedDates.length, 0);

export default habitsSlice.reducer;
