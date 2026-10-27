// src/pages/Progress.jsx
// Levels, XP, badges and the weekly challenge — plus links to stats and Wrapped.

import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import Tree from '../components/Tree';
import { selectProgress, levelTitle, XP } from '../features/achievements/progress';
import { selectTotalCompletions } from '../features/habits/habitsSlice';
import { selectTrees } from '../features/forest/forestSlice';
import { selectJournal } from '../features/journal/journalSlice';
import { monthLabel, monthKey, todayStr } from '../utils/date';

/** Your avatar tree upgrades as you level up */
const avatarSpecies = (level) =>
  level >= 9 ? 'golden' : level >= 7 ? 'maple' : level >= 5 ? 'cherry' : level >= 3 ? 'pine' : 'oak';

function Badge({ badge, index }) {
  const { icon, name, desc, value, goal, unit, unlocked } = badge;
  return (
    <div
      className="anim-fade-up text-center"
      style={{ animationDelay: `${index * 50}ms` }}
      title={desc}
    >
      <div
        className={`relative mx-auto w-16 h-16 sm:w-20 sm:h-20 rounded-3xl grid place-items-center text-3xl sm:text-4xl overflow-hidden transition-transform hover:scale-105
          ${unlocked
            ? 'bg-gradient-to-br from-amber-100 to-white dark:from-amber-500/30 dark:to-gray-800 shadow-lg shadow-amber-200/60 dark:shadow-amber-900/30'
            : 'bg-gray-100 dark:bg-gray-800 grayscale opacity-50'}`}
      >
        {icon}
        {unlocked && <span className="anim-shine absolute inset-y-0 -left-1/2 w-1/3 bg-white/60" style={{ animationDelay: `${index * 0.3}s` }} aria-hidden="true" />}
      </div>
      <p className="mt-2 text-xs sm:text-sm font-bold text-gray-800 dark:text-gray-100">{name}</p>
      {unlocked ? (
        <p className="text-[11px] text-emerald-600 dark:text-emerald-400">Unlocked ✓</p>
      ) : (
        <>
          <div className="mx-2 mt-1 h-1 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
            <div className="h-full bg-violet-400 rounded-full" style={{ width: `${(value / goal) * 100}%` }} />
          </div>
          <p className="text-[10px] text-gray-400 mt-0.5">{value}/{goal} {unit}</p>
        </>
      )}
    </div>
  );
}

export default function Progress() {
  const { xp, level, into, needed, badges, challenge } = useSelector(selectProgress);
  const completions = useSelector(selectTotalCompletions);
  const trees = useSelector(selectTrees);
  const checkIns = Object.keys(useSelector(selectJournal)).length;
  const claimed = useSelector((s) => s.achievements.claimed.length);

  const focusMinutes = trees.filter((t) => !t.withered).reduce((sum, t) => sum + t.minutes, 0);
  const unlockedCount = badges.filter((b) => b.unlocked).length;

  const breakdown = [
    { icon: '✅', label: 'Habits',     value: completions * XP.habit },
    { icon: '⏱️', label: 'Focus',      value: focusMinutes * XP.focusMin },
    { icon: '🌙', label: 'Check-ins',  value: checkIns * XP.checkIn },
    { icon: '🎯', label: 'Challenges', value: claimed * XP.challenge },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-5">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Progress 🏅</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Every habit and focus minute earns XP.</p>
      </div>

      <div className="grid lg:grid-cols-[1fr_300px] gap-5">
        <div className="space-y-5 min-w-0">
          {/* Level card */}
          <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700 p-5 sm:p-6 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="shrink-0 w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-200 to-amber-500 grid place-items-center">
                <Tree species={avatarSpecies(level)} size={46} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline gap-2 flex-wrap">
                  <p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">Level {level} · {levelTitle(level)}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">{into} / {needed} XP</p>
                </div>
                <div className="mt-2 h-3 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-violet-400 to-violet-600 transition-all duration-1000"
                    style={{ width: `${(into / needed) * 100}%` }}
                  />
                </div>
                <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                  {needed - into} XP to <b>Level {level + 1} · {levelTitle(level + 1)}</b> · {xp} XP total
                </p>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-2">
              {breakdown.map((b) => (
                <div key={b.label} className="rounded-xl bg-gray-50 dark:bg-gray-900/60 px-3 py-2">
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">{b.icon} {b.label}</p>
                  <p className="font-bold text-gray-900 dark:text-white tabular-nums">{b.value} XP</p>
                </div>
              ))}
            </div>
          </div>

          {/* Badges */}
          <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700 p-5 sm:p-6 shadow-sm">
            <p className="text-[11px] font-bold tracking-wider text-gray-400 uppercase mb-4">Badges · {unlockedCount} of {badges.length}</p>
            <div className="grid grid-cols-4 gap-y-5 gap-x-2">
              {badges.map((b, i) => <Badge key={b.id} badge={b} index={i} />)}
            </div>
          </div>
        </div>

        <div className="space-y-5 min-w-0">
          {/* Weekly challenge */}
          <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
            <p className="text-[11px] font-bold tracking-wider text-gray-400 uppercase mb-2">This week's challenge</p>
            {challenge ? (
              <>
                <p className="font-bold text-gray-900 dark:text-white">{challenge.habit.icon} {challenge.habit.name} {challenge.target} times this week</p>
                <div className="flex gap-1.5 my-3">
                  {Array.from({ length: challenge.target }, (_, i) => (
                    <span
                      key={i}
                      className={`flex-1 h-8 rounded-lg grid place-items-center text-xs text-white transition-colors duration-500
                        ${i < challenge.done ? 'bg-violet-600' : 'bg-violet-100 dark:bg-violet-950/60'}`}
                    >
                      {i < challenge.done ? '✓' : ''}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {challenge.claimed
                    ? `🎉 Completed! +${XP.challenge} XP earned`
                    : `Reward: +${XP.challenge} XP · ${challenge.daysLeft} ${challenge.daysLeft === 1 ? 'day' : 'days'} left`}
                </p>
              </>
            ) : (
              <p className="text-sm text-gray-400">Add a habit to get your first challenge.</p>
            )}
          </div>

          <Link to="/wrapped" className="block rounded-3xl p-5 text-white bg-gradient-to-br from-violet-600 to-pink-500 shadow-lg shadow-violet-200 dark:shadow-violet-950 hover:-translate-y-0.5 transition-transform">
            <p className="text-sm opacity-90">🎁 Monthly Wrapped</p>
            <p className="text-xl font-bold mt-1">Your {monthLabel(monthKey(todayStr())).split(' ')[0]} story →</p>
          </Link>

          <Link to="/stats" className="flex items-center justify-between rounded-3xl p-5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm hover:border-violet-300 transition-colors">
            <span className="font-semibold text-gray-800 dark:text-gray-100">📊 Weekly stats</span>
            <span className="text-gray-400">→</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
