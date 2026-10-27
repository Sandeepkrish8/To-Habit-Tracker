// src/pages/HabitDetail.jsx
// One habit up close. The habit card on Home *morphs* into this page: the card,
// icon and name share a `layoutId`, so Framer Motion animates them from where
// they were in the list to where they are here. Swipe down to go back.

import { useLayoutEffect } from 'react';
import { useSelector } from 'react-redux';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import StreakFlame from '../components/StreakFlame';
import Odometer from '../components/Odometer';
import { selectHabits } from '../features/habits/habitsSlice';
import { TIERS, flameTier } from '../features/habits/flame';
import { daysAgoStr, todayStr, toDateStr, monthKey } from '../utils/date';

const fadeIn = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } };

export default function HabitDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const habit = useSelector(selectHabits).find((h) => h.id === id);

  // The list may have been scrolled down; start the detail page at the top
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  if (!habit) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-3">
        <p className="text-5xl">🔍</p>
        <p className="text-gray-500 dark:text-gray-400">This habit doesn't exist any more.</p>
        <Link to="/" className="text-violet-600 dark:text-violet-400 font-medium">← Back to habits</Link>
      </div>
    );
  }

  const today = todayStr();
  const created = toDateStr(new Date(habit.createdAt));
  const done = new Set(habit.completedDates);

  // This month: share of days (since the habit existed) that were completed
  const month = monthKey(today);
  const monthStart = created > `${month}-01` ? created : `${month}-01`;
  const daysSoFar = Math.max(1, Number(today.slice(8)) - Number(monthStart.slice(8)) + 1);
  const doneThisMonth = habit.completedDates.filter((d) => d >= monthStart && d <= today).length;
  const monthPct = Math.round((doneThisMonth / daysSoFar) * 100);

  const last35 = Array.from({ length: 35 }, (_, i) => daysAgoStr(34 - i));
  const tier = TIERS[flameTier(habit.streak, habit.bestStreak)];

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
      <motion.div
        layoutId={`habit-${id}`}
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.5 }}
        onDragEnd={(_, info) => {
          // A long pull or a quick flick down closes the page
          if (info.offset.y > 110 || info.velocity.y > 600) navigate('/');
        }}
        className="relative p-5 sm:p-7 border bg-white dark:bg-gray-900 shadow-xl cursor-grab active:cursor-grabbing"
        style={{
          borderRadius: 28, // set in style (not a class) so Framer keeps corners round mid-morph
          backgroundImage: `linear-gradient(180deg, ${habit.color}2e, transparent 55%)`,
          borderColor: `${habit.color}55`,
        }}
      >
        <div className="mx-auto mb-3 w-10 h-1.5 rounded-full bg-gray-300 dark:bg-gray-700" aria-hidden="true" />
        <button onClick={() => navigate('/')} className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200">
          ‹ Habits
        </button>

        <div className="flex items-center gap-4 mt-3">
          <motion.div
            layoutId={`habit-icon-${id}`}
            className="w-16 h-16 grid place-items-center text-4xl shrink-0"
            style={{ borderRadius: 18, backgroundColor: `${habit.color}22`, border: `2px solid ${habit.color}44` }}
          >
            {habit.icon}
          </motion.div>
          <motion.h1 layoutId={`habit-name-${id}`} className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            {habit.name}
          </motion.h1>
        </div>

        {/* Everything below fades in after the morph */}
        <motion.div {...fadeIn} transition={{ delay: 0.15 }}>
          <div className="flex items-center gap-4 mt-6 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/60">
            <StreakFlame streak={habit.streak} best={habit.bestStreak} size={64} />
            <div>
              <p className="text-3xl font-extrabold text-gray-900 dark:text-white">
                <Odometer value={habit.streak} /> <span className="text-base font-semibold text-gray-500">day streak</span>
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{tier.label}</p>
              {habit.streak === 0 && habit.bestStreak > 0 && (
                <Link to={`/calendar?habit=${id}`} className="text-xs font-medium text-sky-600 dark:text-sky-400">🧊 Missed a day? Use a streak freeze →</Link>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 mt-3">
            {[['Best', habit.bestStreak, ' days'], ['This month', monthPct, '%'], ['Total', habit.completedDates.length, '']].map(([label, value, unit]) => (
              <div key={label} className="rounded-2xl border border-gray-200 dark:border-gray-700 p-3">
                <p className="text-[10px] font-bold tracking-wider text-gray-400 uppercase">{label}</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white"><Odometer value={value} />{unit && <span className="text-sm text-gray-500">{unit}</span>}</p>
              </div>
            ))}
          </div>

          <p className="text-[11px] font-bold tracking-wider text-gray-400 uppercase mt-6 mb-2">Last 35 days</p>
          <div className="grid grid-cols-7 gap-1.5 max-w-xs">
            {last35.map((d, i) => (
              <motion.div
                key={d}
                title={d}
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 + i * 0.012 }}
                className={`aspect-square rounded-md ${d === today ? 'ring-2 ring-offset-1 ring-gray-400 dark:ring-offset-gray-900' : ''}`}
                style={{ backgroundColor: done.has(d) ? habit.color : d < created ? 'transparent' : `${habit.color}1f` }}
              />
            ))}
          </div>

          <div className="flex gap-2 mt-6">
            <Link to={`/calendar?habit=${id}`} className="flex-1 text-center py-2.5 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-semibold">
              📅 Open in calendar
            </Link>
          </div>
          <p className="text-center text-[11px] text-gray-400 mt-4">Swipe down to go back</p>
        </motion.div>
      </motion.div>
    </div>
  );
}
