// src/app/store.js
// Redux store with localStorage middleware for auto-persistence.

import { configureStore } from '@reduxjs/toolkit';
import habitsReducer from '../features/habits/habitsSlice';
import forestReducer from '../features/forest/forestSlice';
import focusReducer from '../features/focus/focusSlice';
import journalReducer from '../features/journal/journalSlice';
import achievementsReducer from '../features/achievements/achievementsSlice';
import { saveJSON } from '../utils/storage';

// localStorage key → the piece of state saved under it
const PERSISTED = {
  habitTracker_habits:       (s) => s.habits.habits,
  habitTracker_frozen:       (s) => s.habits.frozenDates,
  habitTracker_forest:       (s) => s.forest.trees,
  habitTracker_timer:        (s) => s.focus,
  habitTracker_journal:      (s) => s.journal.entries,
  habitTracker_achievements: (s) => s.achievements,
};

// localStorage save middleware — runs after every action, but only rewrites
// the keys whose state actually changed (Redux state is immutable, so a
// reference check is enough)
const localStorageMiddleware = (storeAPI) => {
  const lastSaved = {};
  return (next) => (action) => {
    const result = next(action);
    const state = storeAPI.getState();
    for (const [key, select] of Object.entries(PERSISTED)) {
      const value = select(state);
      if (lastSaved[key] !== value) {
        lastSaved[key] = value;
        saveJSON(key, value);
      }
    }
    return result;
  };
};

const store = configureStore({
  reducer: {
    habits:       habitsReducer,
    forest:       forestReducer,
    focus:        focusReducer,
    journal:      journalReducer,
    achievements: achievementsReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(localStorageMiddleware),
});

export default store;
