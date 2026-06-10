// src/app/store.js
// Redux store with localStorage middleware for auto-persistence.

import { configureStore } from '@reduxjs/toolkit';
import habitsReducer from '../features/habits/habitsSlice';

// localStorage save middleware — runs after every action
const localStorageMiddleware = (storeAPI) => (next) => (action) => {
  const result = next(action);
  const state = storeAPI.getState();
  try {
    localStorage.setItem('habitTracker_habits', JSON.stringify(state.habits.habits));
  } catch {
    // Storage quota exceeded or unavailable — fail silently
  }
  return result;
};

const store = configureStore({
  reducer: {
    habits: habitsReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(localStorageMiddleware),
});

export default store;
