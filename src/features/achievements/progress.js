// src/features/achievements/progress.js
// XP, levels, badges and the weekly challenge — all *derived* from your habits,
// trees and check-ins, so they can never drift out of sync with your data.

import { createSelector } from '@reduxjs/toolkit';
import { selectHabits, selectRawHabits, selectPerfectDates } from '../habits/habitsSlice';
import { selectTrees } from '../forest/forestSlice';
import { selectJournal } from '../journal/journalSlice';
import { addDays, todayStr, weekStart } from '../../utils/date';

export const XP = {
  habit:     10, // per completed habit
  focusMin:   1, // per minute of finished focus
  checkIn:    5, // per evening check-in
  challenge: 50, // per completed weekly challenge
};

const LEVEL_TITLES = [
  'Seedling', 'Sprout', 'Sapling', 'Gardener', 'Tree Hugger',
  'Woodland Scout', 'Grove Keeper', 'Forest Ranger', 'Forest Guardian', 'Ancient Oak',
];

export const levelTitle = (level) => LEVEL_TITLES[level - 1] ?? 'Legend of the Forest';

/** Level L → L+1 costs 100 × L XP, so early levels come fast and later ones take commitment */
export const levelFromXP = (xp) => {
  let level = 1;
  let floor = 0;
  while (xp >= floor + 100 * level) {
    floor += 100 * level;
    level++;
  }
  return { level, into: xp - floor, needed: 100 * level };
};

/** Longest run of consecutive days in a Set of "YYYY-MM-DD" strings */
const longestRun = (dates) => {
  let best = 0;
  for (const d of dates) {
    if (dates.has(addDays(d, -1))) continue; // only start counting at the beginning of a run
    let len = 1;
    while (dates.has(addDays(d, len))) len++;
    best = Math.max(best, len);
  }
  return best;
};

const hourOf = (tree) => new Date(tree.plantedAt).getHours();

/** Badge definitions: `value` is progress toward `goal` */
const BADGES = [
  { id: 'first-seed',   icon: '🌱', name: 'First Seed',   desc: 'Plant your first tree',            goal: 1,   unit: 'tree',
    value: (d) => d.healthy.length },
  { id: 'flame-7',      icon: '🔥', name: '7-Day Flame',  desc: 'Keep any habit going for 7 days',  goal: 7,   unit: 'days',
    value: (d) => d.bestStreak },
  { id: 'early-bird',   icon: '🌅', name: 'Early Bird',   desc: 'Finish 5 focus sessions before 8 AM', goal: 5, unit: 'sessions',
    value: (d) => d.healthy.filter((t) => hourOf(t) < 8).length },
  { id: 'perfect-week', icon: '⭐', name: 'Perfect Week', desc: 'Every habit, 7 days straight',     goal: 7,   unit: 'days',
    value: (d) => d.perfectRun },
  { id: 'deep-diver',   icon: '🤿', name: 'Deep Diver',   desc: 'Finish three 60-minute sessions',  goal: 3,   unit: 'sessions',
    value: (d) => d.healthy.filter((t) => t.minutes >= 60).length },
  { id: 'centurion',    icon: '💯', name: 'Centurion',    desc: 'Complete 100 habits',              goal: 100, unit: 'habits',
    value: (d) => d.completions },
  { id: 'night-owl',    icon: '🦉', name: 'Night Owl',    desc: 'Finish 5 sessions after 10 PM',    goal: 5,   unit: 'sessions',
    value: (d) => d.healthy.filter((t) => hourOf(t) >= 22 || hourOf(t) < 4).length },
  { id: 'golden-grove', icon: '🏆', name: 'Golden Grove', desc: 'Grow a forest of 60 trees',        goal: 60,  unit: 'trees',
    value: (d) => d.healthy.length },
];

/** Picks this week's challenge habit deterministically from the week's date */
const challengeFor = (habits, week, completedThisWeek) => {
  if (habits.length === 0) return null;
  const seed = [...week].reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  const habit = habits[seed % habits.length];
  const target = 5;
  return {
    week,
    habit,
    target,
    done: Math.min(target, completedThisWeek(habit)),
    daysLeft: 7 - Math.round((new Date() - new Date(`${week}T00:00:00`)) / 86_400_000),
  };
};

const selectClaimed = (state) => state.achievements.claimed;
const selectToday = () => todayStr();

/** Everything the Progress page, toasts and XP chips need */
export const selectProgress = createSelector(
  [selectHabits, selectRawHabits, selectTrees, selectJournal, selectPerfectDates, selectClaimed, selectToday],
  (habits, rawHabits, trees, journal, perfectDates, claimed, today) => {
    const healthy = trees.filter((t) => !t.withered);
    const completions = rawHabits.reduce((sum, h) => sum + h.completedDates.length, 0);
    const checkIns = Object.keys(journal).length;

    const data = {
      healthy,
      completions,
      bestStreak: habits.reduce((max, h) => Math.max(max, h.bestStreak), 0),
      perfectRun: longestRun(perfectDates),
    };

    const badges = BADGES.map((b) => {
      const value = Math.min(b.goal, b.value(data));
      return { ...b, value, unlocked: value >= b.goal };
    });

    const week = weekStart(today);
    const weekEnd = addDays(week, 6);
    const challenge = challengeFor(rawHabits, week, (h) =>
      h.completedDates.filter((d) => d >= week && d <= weekEnd).length
    );

    const xp =
      completions * XP.habit +
      healthy.reduce((sum, t) => sum + t.minutes, 0) * XP.focusMin +
      checkIns * XP.checkIn +
      claimed.length * XP.challenge;

    return {
      xp,
      ...levelFromXP(xp),
      badges,
      challenge: challenge && { ...challenge, claimed: claimed.includes(week) },
    };
  }
);
