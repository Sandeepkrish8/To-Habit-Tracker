// src/utils/date.js
// Local-time date helpers.
//
// Why not `date.toISOString().split('T')[0]`? toISOString() converts to UTC first,
// so in India (UTC+5:30) local midnight becomes 18:30 of the *previous* day.
// That made streaks always 0 and ticks before 5:30 AM count for yesterday.

/** Returns a date as a local "YYYY-MM-DD" string */
export const toDateStr = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0'); // months are 0-based
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

/** Returns today as a local "YYYY-MM-DD" string */
export const todayStr = () => toDateStr(new Date());

/** Returns the local date `n` days before today as "YYYY-MM-DD" */
export const daysAgoStr = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toDateStr(d);
};
