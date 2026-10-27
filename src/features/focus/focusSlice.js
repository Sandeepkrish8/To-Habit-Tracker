// src/features/focus/focusSlice.js
// The focus timer lives in Redux (not in the Pomodoro page) so it keeps running on
// every page, can be started from the command bar, and shows in the mini timer.
//
// The timer stores the timestamp it ends at (`endAt`) instead of counting down
// with setInterval ticks, so it stays accurate when the tab is in the background.

import { createSlice } from '@reduxjs/toolkit';
import { SPECIES } from '../forest/species';
import { loadJSON } from '../../utils/storage';

export const MODES = {
  work:  { label: 'Focus',       duration: null,    color: '#059669', emoji: '🌱' },
  break: { label: 'Short Break', duration:  5 * 60, color: '#0891b2', emoji: '☕' },
  long:  { label: 'Long Break',  duration: 15 * 60, color: '#2563eb', emoji: '🧘' },
};

// Longer sessions grow bigger trees in the forest
export const FOCUS_OPTIONS = [25, 45, 60];

/** Session length in seconds */
export const durationOf = (mode, focusMinutes) =>
  mode === 'work' ? focusMinutes * 60 : MODES[mode].duration;

/** Seconds left at time `now` */
export const timeLeftAt = (timer, now) => {
  const duration = durationOf(timer.mode, timer.focusMinutes);
  if (timer.endAt === null) return timer.remaining;
  return Math.min(duration, Math.max(0, Math.ceil((timer.endAt - now) / 1000)));
};

const DEFAULT_TIMER = {
  mode:         'work',
  focusMinutes: 25,
  species:      'oak',
  label:        '',      // what you're focusing on — saved with the tree
  endAt:        null,    // timestamp when running, null when paused/idle
  remaining:    25 * 60, // seconds left while paused/idle
  strict:       false,   // leaving the tab pauses the tree
  sound:        null,    // ambient sound id
  volume:       0.5,
};

const loadTimer = () => {
  const saved = loadJSON('habitTracker_timer', null);
  if (saved && MODES[saved.mode] && SPECIES[saved.species]) return { ...DEFAULT_TIMER, ...saved };
  return DEFAULT_TIMER;
};

const resetTo = (state, mode) => {
  state.mode = mode;
  state.endAt = null;
  state.remaining = durationOf(mode, state.focusMinutes);
};

const withNow = (payload) => ({ payload: { ...payload, now: Date.now() } });

const focusSlice = createSlice({
  name: 'focus',
  initialState: loadTimer(),

  reducers: {
    setMode(state, action) {
      resetTo(state, action.payload);
    },
    setFocusMinutes(state, action) {
      state.focusMinutes = action.payload;
      if (state.mode === 'work' && state.endAt === null) state.remaining = action.payload * 60;
    },
    setSpecies(state, action)  { state.species = action.payload; },
    setLabel(state, action)    { state.label = action.payload.slice(0, 60); },
    setStrict(state, action)   { state.strict = action.payload; },
    setSound(state, action)    { state.sound = action.payload; },
    setVolume(state, action)   { state.volume = action.payload; },

    /** Start or resume the current session */
    start: {
      reducer(state, action) {
        if (state.endAt === null) state.endAt = action.payload.now + state.remaining * 1000;
      },
      prepare: () => withNow({}),
    },

    /** Pause, remembering how many seconds were left */
    pause: {
      reducer(state, action) {
        if (state.endAt === null) return;
        state.remaining = Math.max(0, Math.ceil((state.endAt - action.payload.now) / 1000));
        state.endAt = null;
      },
      prepare: () => withNow({}),
    },

    /** Back to the start of the current mode */
    reset(state) {
      resetTo(state, state.mode);
    },

    /** Session finished — move on to `nextMode` without starting it */
    completeSession(state, action) {
      resetTo(state, action.payload);
    },

    /** Jump straight into a running focus session (command bar, new tab page) */
    startFocus: {
      reducer(state, action) {
        state.mode = 'work';
        state.focusMinutes = action.payload.minutes;
        state.remaining = action.payload.minutes * 60;
        state.endAt = action.payload.now + state.remaining * 1000;
      },
      prepare: (minutes) => withNow({ minutes }),
    },
  },
});

export const {
  setMode, setFocusMinutes, setSpecies, setLabel, setStrict, setSound, setVolume,
  start, pause, reset, completeSession, startFocus,
} = focusSlice.actions;

export const selectFocus = (state) => state.focus;

export default focusSlice.reducer;
