// src/features/journal/journalSlice.js
// Evening check-ins: mood, energy, sleep and a short note — one entry per day.

import { createSlice } from '@reduxjs/toolkit';
import { loadJSON } from '../../utils/storage';

export const MOODS = [
  { value: 1, emoji: '😞', label: 'Rough' },
  { value: 2, emoji: '😐', label: 'Meh' },
  { value: 3, emoji: '🙂', label: 'Okay' },
  { value: 4, emoji: '😄', label: 'Good' },
  { value: 5, emoji: '🤩', label: 'Great' },
];

export const ENERGY = ['low', 'medium', 'high'];

const journalSlice = createSlice({
  name: 'journal',
  initialState: {
    // { "YYYY-MM-DD": { date, mood: 1-5, energy, sleep: hours, note } }
    entries: loadJSON('habitTracker_journal', {}),
  },
  reducers: {
    /** saveCheckIn — create or replace the entry for `date` */
    saveCheckIn(state, action) {
      const { date, mood, energy, sleep, note } = action.payload;
      state.entries[date] = { date, mood, energy, sleep, note: note.trim().slice(0, 280) };
    },
  },
});

export const { saveCheckIn } = journalSlice.actions;

export const selectJournal = (state) => state.journal.entries;

export default journalSlice.reducer;
