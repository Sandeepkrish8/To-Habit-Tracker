// src/features/achievements/achievementsSlice.js
// Remembers which badges and levels you've already been told about, and which
// weekly challenges you've claimed. Everything else about progress is derived.

import { createSlice } from '@reduxjs/toolkit';
import { loadJSON } from '../../utils/storage';

const DEFAULT = {
  initialized: false, // first run marks existing badges as seen without toasting them
  seenBadges:  [],
  seenLevel:   1,
  claimed:     [],    // week keys ("YYYY-MM-DD" of Monday) whose challenge was completed
  milestonesInitialized: false,
  celebrated:  [],    // "habitId:7" / ":30" / ":100" streak milestones already celebrated
  ceremony:    null,  // { habitId, milestone } currently being celebrated
};

const achievementsSlice = createSlice({
  name: 'achievements',
  initialState: { ...DEFAULT, ...loadJSON('habitTracker_achievements', {}) },
  reducers: {
    initAchievements(state, action) {
      state.initialized = true;
      state.seenBadges = action.payload.badges;
      state.seenLevel = action.payload.level;
    },
    markBadgesSeen(state, action) {
      for (const id of action.payload) if (!state.seenBadges.includes(id)) state.seenBadges.push(id);
    },
    markLevelSeen(state, action) {
      state.seenLevel = Math.max(state.seenLevel, action.payload);
    },
    claimChallenge(state, action) {
      if (!state.claimed.includes(action.payload)) state.claimed.push(action.payload);
    },
    /** Payload: milestone keys to mark as celebrated (first run marks existing ones silently) */
    markCelebrated(state, action) {
      state.milestonesInitialized = true;
      for (const key of action.payload) if (!state.celebrated.includes(key)) state.celebrated.push(key);
    },
    /** A new milestone: remember it and start its ceremony. Payload: { keys, habitId, milestone } */
    celebrate(state, action) {
      const { keys, habitId, milestone } = action.payload;
      for (const key of keys) if (!state.celebrated.includes(key)) state.celebrated.push(key);
      state.ceremony = { habitId, milestone };
    },
    dismissCeremony(state) {
      state.ceremony = null;
    },
  },
});

export const {
  initAchievements, markBadgesSeen, markLevelSeen, claimChallenge, markCelebrated, celebrate, dismissCeremony,
} = achievementsSlice.actions;

export const selectAchievementState = (state) => state.achievements;

export default achievementsSlice.reducer;
