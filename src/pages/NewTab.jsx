// src/pages/NewTab.jsx
// The Chrome new tab page (also at /newtab on the website): a big clock, today's
// habits as one-tap chips, your focus timer, and your forest along the bottom.

import { useSelector, useDispatch } from 'react-redux';
import { Link } from 'react-router-dom';
import Tree from '../components/Tree';
import useNow from '../hooks/useNow';
import { openPalette } from '../context/palette';
import { selectRawHabits, toggleHabit } from '../features/habits/habitsSlice';
import { selectTrees } from '../features/forest/forestSlice';
import { FOCUS_OPTIONS, MODES, selectFocus, startFocus, timeLeftAt } from '../features/focus/focusSlice';
import { todayStr } from '../utils/date';

const greetingFor = (hour) =>
  hour < 5 ? 'Still up? 🌙' : hour < 12 ? 'Good morning 👋' : hour < 17 ? 'Good afternoon ☀️' : hour < 21 ? 'Good evening 🌆' : 'Good night 🌙';

const pad = (n) => String(n).padStart(2, '0');

export default function NewTab() {
  const dispatch = useDispatch();
  const habits = useSelector(selectRawHabits);
  const trees = useSelector(selectTrees);
  const timer = useSelector(selectFocus);
  const now = useNow(true, 1000);

  const date = new Date(now);
  const today = todayStr();
  const doneCount = habits.filter((h) => h.completedDates.includes(today)).length;
  const running = timer.endAt !== null;
  const left = timeLeftAt(timer, now);
  const forest = trees.filter((t) => !t.withered).slice(-14);

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col items-center px-4 pt-[10vh] pb-36
      bg-gradient-to-b from-amber-50 via-white to-emerald-50 dark:from-slate-950 dark:via-slate-900 dark:to-emerald-950">

      <p className="text-7xl sm:text-8xl font-extrabold tracking-tighter text-gray-900 dark:text-white tabular-nums">
        {pad(date.getHours())}:{pad(date.getMinutes())}
      </p>
      <p className="mt-2 text-gray-600 dark:text-gray-300">
        {greetingFor(date.getHours())} · {date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
      </p>

      {/* Web search, like a normal new tab */}
      <form action="https://www.google.com/search" method="get" className="mt-8 w-full max-w-lg">
        <label className="flex items-center gap-3 px-5 py-3 rounded-full bg-white dark:bg-gray-800 shadow-md border border-gray-200 dark:border-gray-700 focus-within:ring-2 focus-within:ring-emerald-400">
          <span aria-hidden="true">🔍</span>
          <span className="sr-only">Search the web</span>
          <input name="q" placeholder="Search the web" className="flex-1 bg-transparent focus:outline-none text-gray-800 dark:text-gray-100 placeholder-gray-400" />
        </label>
      </form>

      {/* Today's habits — one tap to tick off */}
      {habits.length > 0 && (
        <div className="mt-8 w-full max-w-2xl">
          <p className="text-center text-xs font-semibold text-gray-500 dark:text-gray-400 mb-3">
            Today · {doneCount} of {habits.length} done
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {habits.map((h) => {
              const done = h.completedDates.includes(today);
              return (
                <button
                  key={h.id}
                  onClick={() => dispatch(toggleHabit(h.id))}
                  aria-pressed={done}
                  className={`px-4 py-2 rounded-full text-sm font-medium border transition-all duration-200 hover:-translate-y-0.5
                    ${done
                      ? 'bg-emerald-100 dark:bg-emerald-900/50 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                      : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200'}`}
                >
                  {done ? '✓' : '○'} {h.icon} {h.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Focus */}
      <div className="mt-8 flex flex-wrap justify-center items-center gap-2">
        {running ? (
          <Link to="/pomodoro" className="px-5 py-2.5 rounded-full bg-emerald-600 text-white font-semibold shadow-lg shadow-emerald-600/30">
            {MODES[timer.mode].emoji} {pad(Math.floor(left / 60))}:{pad(left % 60)} · {timer.label || MODES[timer.mode].label}
          </Link>
        ) : (
          FOCUS_OPTIONS.map((m) => (
            <Link
              key={m}
              to="/pomodoro"
              onClick={() => dispatch(startFocus(m))}
              className="px-4 py-2 rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-semibold hover:opacity-90"
            >
              ⏱️ Focus {m}
            </Link>
          ))
        )}
      </div>

      <div className="mt-6 flex gap-4 text-xs text-gray-500 dark:text-gray-400">
        <button onClick={openPalette} className="hover:text-gray-800 dark:hover:text-gray-200">
          <kbd className="font-sans px-1.5 py-0.5 rounded border border-gray-300 dark:border-gray-600">Ctrl K</kbd> for anything
        </button>
        <Link to="/" className="hover:text-gray-800 dark:hover:text-gray-200">Open HabitFlow →</Link>
      </div>

      {/* Your forest, along the bottom */}
      <div className="absolute bottom-0 inset-x-0 h-28 flex justify-center items-end gap-1 border-b-[12px] border-emerald-300 dark:border-emerald-800" aria-hidden="true">
        {(forest.length ? forest : [null, null, null]).map((t, i) => (
          <Tree
            key={t?.id ?? i}
            species={t?.species ?? 'oak'}
            growth={t ? 1 : 0}
            size={t ? 40 + Math.min(t.minutes, 60) * 0.3 : 44}
            className="anim-pop"
            style={{ animationDelay: `${i * 40}ms` }}
          />
        ))}
      </div>
    </div>
  );
}
