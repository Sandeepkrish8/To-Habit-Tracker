// src/features/journal/insights.js
// Finds patterns in your own data. Plain JavaScript, computed on your device —
// nothing is uploaded anywhere.

import { toDateStr } from '../../utils/date';

/** Check-ins needed before mood/sleep insights are trustworthy */
export const MIN_CHECKINS = 14;

const avg = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;

const existedOn = (habit, date) => toDateStr(new Date(habit.createdAt)) <= date;

/** Share of that day's habits you completed (0–1), or null if no habits existed */
const completionRate = (habits, date) => {
  const active = habits.filter((h) => existedOn(h, date));
  if (active.length === 0) return null;
  return active.filter((h) => h.completedDates.includes(date)).length / active.length;
};

/** Do you finish more habits after a good night's sleep? */
export const sleepInsight = (habits, entries) => {
  const rates = (pred) => entries.filter(pred).map((e) => completionRate(habits, e.date)).filter((r) => r !== null);
  const good = rates((e) => e.sleep >= 7);
  const poor = rates((e) => e.sleep < 7);
  if (good.length < 3 || poor.length < 3) return null;
  const goodPct = Math.round(avg(good) * 100);
  const poorPct = Math.round(avg(poor) * 100);
  return { goodPct, poorPct, lift: poorPct > 0 ? Math.round(((goodPct - poorPct) / poorPct) * 100) : null };
};

/** Minutes of finished focus by the hour the session *started* */
export const focusByHour = (trees) => {
  const hours = Array(24).fill(0);
  for (const t of trees) {
    if (t.withered) continue;
    const startedAt = new Date(new Date(t.plantedAt).getTime() - t.minutes * 60_000);
    hours[startedAt.getHours()] += t.minutes;
  }
  return hours;
};

/** Best 2-hour focus window, e.g. { start: 9, end: 11 } — needs at least 5 sessions */
export const bestFocusWindow = (trees) => {
  if (trees.filter((t) => !t.withered).length < 5) return null;
  const hours = focusByHour(trees);
  let best = 0;
  for (let h = 1; h < 23; h++) if (hours[h] + hours[h + 1] > hours[best] + hours[best + 1]) best = h;
  return { start: best, end: best + 2, hours };
};

/** The habit whose days have the biggest mood boost */
export const moodBoostHabit = (habits, entries) => {
  let best = null;
  for (const h of habits) {
    const relevant = entries.filter((e) => existedOn(h, e.date));
    const withIt = relevant.filter((e) => h.completedDates.includes(e.date)).map((e) => e.mood);
    const without = relevant.filter((e) => !h.completedDates.includes(e.date)).map((e) => e.mood);
    if (withIt.length < 3 || without.length < 3) continue;
    const diff = avg(withIt) - avg(without);
    if (diff >= 0.3 && (!best || diff > best.diff)) {
      best = { habit: h, diff, withMood: avg(withIt), withoutMood: avg(without) };
    }
  }
  return best;
};

/** Formats an hour as "9 AM" */
export const hourLabel = (h) => {
  const hr = h % 24;
  return `${hr % 12 === 0 ? 12 : hr % 12} ${hr < 12 ? 'AM' : 'PM'}`;
};
