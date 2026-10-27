// src/features/forest/forestSlice.js
// Redux slice for the focus forest: every completed focus session plants a tree,
// every abandoned one leaves a withered tree behind.

import { createSlice } from '@reduxjs/toolkit';
import { v4 as uuidv4 } from 'uuid';
import { toDateStr } from '../../utils/date';
import { loadJSON } from '../../utils/storage';

/**
 * Builds a tree record. Runs in `prepare` so the reducer itself stays pure
 * (no uuid or Date calls inside the reducer).
 * Payload: { species: string, minutes: number, at?: number (timestamp), label?: string, seed?: number }
 */
const prepareTree = (withered) => ({ species, minutes, at = Date.now(), label = '', seed = 1 }) => ({
  payload: {
    id:        uuidv4(),
    species,
    minutes,
    withered,
    label,     // what you were focusing on
    seed,      // shape of its 3D tree
    date:      toDateStr(new Date(at)), // local "YYYY-MM-DD" the session ended on
    plantedAt: new Date(at).toISOString(),
  },
});

// ── Slice ─────────────────────────────────────────────────────────────────────

const forestSlice = createSlice({
  name: 'forest',
  initialState: {
    trees: loadJSON('habitTracker_forest', []),
  },

  reducers: {
    /** plantTree — a focus session was completed */
    plantTree: {
      reducer(state, action) {
        state.trees.push(action.payload);
      },
      prepare: prepareTree(false),
    },

    /** witherTree — a focus session was abandoned before the timer finished */
    witherTree: {
      reducer(state, action) {
        state.trees.push(action.payload);
      },
      prepare: prepareTree(true),
    },
  },
});

export const { plantTree, witherTree } = forestSlice.actions;

// ── Selectors ─────────────────────────────────────────────────────────────────

/** All trees, healthy and withered, oldest first */
export const selectTrees = (state) => state.forest.trees;

/** Number of healthy (completed-session) trees — drives species unlocks */
export const selectHealthyCount = (state) =>
  state.forest.trees.reduce((n, t) => (t.withered ? n : n + 1), 0);

export default forestSlice.reducer;
