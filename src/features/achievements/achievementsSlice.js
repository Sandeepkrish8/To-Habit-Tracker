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
  },
});

export const { initAchievements, markBadgesSeen, markLevelSeen, claimChallenge } = achievementsSlice.actions;

export const selectAchievementState = (state) => state.achievements;

export default achievementsSlice.reducer;
