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

/** Parses "YYYY-MM-DD" as local midnight (new Date("YYYY-MM-DD") would be UTC) */
export const parseDateStr = (str) => new Date(`${str}T00:00:00`);

/** Adds `n` days to a "YYYY-MM-DD" string */
export const addDays = (str, n) => {
  const d = parseDateStr(str);
  d.setDate(d.getDate() + n);
  return toDateStr(d);
};

/** Monday of the week containing `str`, as "YYYY-MM-DD" */
export const weekStart = (str) => {
  const d = parseDateStr(str);
  const offset = (d.getDay() + 6) % 7; // Sunday → 6, Monday → 0
  d.setDate(d.getDate() - offset);
  return toDateStr(d);
};

/** "YYYY-MM" month key for a "YYYY-MM-DD" string */
export const monthKey = (str) => str.slice(0, 7);

/** Human label like "October 2026" for a "YYYY-MM" key */
export const monthLabel = (key) =>
  parseDateStr(`${key}-01`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

/** Moves a "YYYY-MM" key by `n` months */
export const addMonths = (key, n) => {
  const d = parseDateStr(`${key}-01`);
  d.setMonth(d.getMonth() + n);
  return toDateStr(d).slice(0, 7);
};
