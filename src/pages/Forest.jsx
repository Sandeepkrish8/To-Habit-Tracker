// src/pages/Forest.jsx
// Your focus forest — every tree is a completed focus session.
// Browse it by day, week, month, year, or all time, plus a year-long heatmap.

import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import Tree from '../components/Tree';
import useNow from '../hooks/useNow';
import { selectTrees, selectHealthyCount } from '../features/forest/forestSlice';
import { SPECIES, nextUnlock } from '../features/forest/species';
import { selectConsistency, selectTotalHabits } from '../features/habits/habitsSlice';
import { weatherOf } from '../features/habits/weather';
import { phaseOf, SKIES, RAIN_SKIES } from '../features/habits/sky';
import { hasWebGL, prefersReducedMotion } from '../utils/webgl';
import { loadJSON, saveJSON } from '../utils/storage';
import { toDateStr, todayStr, daysAgoStr, parseDateStr } from '../utils/date';

// three.js is big, so the 3D island is code-split: it only downloads when you open 3D
const ForestIsland = lazy(() => import('../components/three/ForestIsland'));
const MAX_3D_TREES = 150;

const RANGES = [
  { id: 'day',   label: 'Today' },
  { id: 'week',  label: 'Week' },
  { id: 'month', label: 'Month' },
  { id: 'year',  label: 'Year' },
  { id: 'all',   label: 'All' },
];

/** Returns a predicate that keeps trees inside the chosen range */
const inRange = (range) => {
  const today = todayStr();
  switch (range) {
    case 'day':   return (t) => t.date === today;
    case 'week':  return (t) => t.date >= daysAgoStr(6);
    case 'month': return (t) => t.date.startsWith(today.slice(0, 7)); // "YYYY-MM"
    case 'year':  return (t) => t.date.startsWith(today.slice(0, 4)); // "YYYY"
    default:      return () => true;
  }
};

/** Bigger trees for longer sessions: 25 min → 44px, 60 min → 68px */
const treeSize = (minutes) => Math.round(44 + Math.min(Math.max(minutes - 25, 0), 35) * (24 / 35));

const formatMinutes = (mins) => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

/** Consecutive days (ending today, or yesterday if today is still empty) with a planted tree */
const calcFocusStreak = (healthyDates) => {
  let streak = 0;
  let offset = healthyDates.has(todayStr()) ? 0 : 1;
  while (healthyDates.has(daysAgoStr(offset))) {
    streak++;
    offset++;
  }
  return streak;
};

const HEAT_COLORS = [
  'bg-gray-100 dark:bg-gray-700/60',
  'bg-emerald-200 dark:bg-emerald-900',
  'bg-emerald-400 dark:bg-emerald-700',
  'bg-emerald-500 dark:bg-emerald-500',
  'bg-emerald-700 dark:bg-emerald-300',
];

/** GitHub-style grid of the last 52 weeks, shaded by trees planted per day */
function YearHeatmap({ countsByDate }) {
  const weeks = useMemo(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 364);
    start.setDate(start.getDate() - start.getDay()); // back up to Sunday

    const cols = [];
    for (const d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      if (d.getDay() === 0) cols.push([]);
      const date = toDateStr(d);
      cols[cols.length - 1].push({ date, count: countsByDate.get(date) ?? 0 });
    }
    return cols;
  }, [countsByDate]);

  // On narrow screens, start scrolled to the most recent weeks
  const scrollRef = useRef(null);
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, []);

  return (
    <div ref={scrollRef} className="overflow-x-auto pb-1">
      <div className="flex gap-[3px] w-max">
        {weeks.map((week) => (
          <div key={week[0].date} className="flex flex-col gap-[3px]">
            {week.map(({ date, count }) => (
              <div
                key={date}
                title={`${date}: ${count} ${count === 1 ? 'tree' : 'trees'}`}
                className={`w-[11px] h-[11px] rounded-[3px] ${HEAT_COLORS[Math.min(count, 4)]}`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, delay }) {
  return (
    <div
      className="anim-fade-up bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm"
      style={{ animationDelay: `${delay}ms` }}
    >
      <p className="text-xs text-gray-500 dark:text-gray-400">{icon} {label}</p>
      <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1 tabular-nums">{value}</p>
    </div>
  );
}

export default function Forest() {
  const trees = useSelector(selectTrees);
  const healthyCount = useSelector(selectHealthyCount);
  const [range, setRange] = useState('week');
  const [view, setView] = useState(() => (hasWebGL() ? loadJSON('habitTracker_forestView', '2d') : '2d'));
  const [selected, setSelected] = useState(null); // tree tapped in 3D
  const consistency = useSelector(selectConsistency);
  const habitCount = useSelector(selectTotalHabits);
  const phase = phaseOf(new Date(useNow(true, 60_000)).getHours());
  const weather = weatherOf(consistency, habitCount > 0);

  const chooseView = (v) => {
    setView(v);
    setSelected(null);
    saveJSON('habitTracker_forestView', v); // remember your choice on this device
  };

  const visible = useMemo(() => trees.filter(inRange(range)), [trees, range]);

  const stats = useMemo(() => {
    const healthy = visible.filter((t) => !t.withered);
    return {
      planted:  healthy.length,
      withered: visible.length - healthy.length,
      minutes:  healthy.reduce((sum, t) => sum + t.minutes, 0),
      success:  visible.length ? Math.round((healthy.length / visible.length) * 100) : 0,
    };
  }, [visible]);

  // Healthy trees per day — feeds both the heatmap and the focus streak
  const countsByDate = useMemo(() => {
    const map = new Map();
    for (const t of trees) {
      if (!t.withered) map.set(t.date, (map.get(t.date) ?? 0) + 1);
    }
    return map;
  }, [trees]);

  const focusStreak = calcFocusStreak(countsByDate);
  const upcoming = nextUnlock(healthyCount);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">My Forest 🌳</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            Every tree is a focus session you finished.{' '}
            <Link to="/wrapped" className="text-violet-600 dark:text-violet-400 font-medium hover:underline">🎁 See your month Wrapped →</Link>
          </p>
        </div>

        <div className="flex gap-2 flex-wrap self-start sm:self-auto">
          {/* 2D / 3D toggle (3D only where WebGL works) */}
          {hasWebGL() && (
            <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-2xl p-1">
              {[['2d', '🌳 2D'], ['3d', '🏝️ 3D']].map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => chooseView(id)}
                  aria-pressed={view === id}
                  className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-all duration-200
                    ${view === id ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {/* Range tabs */}
          <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-2xl p-1">
            {RANGES.map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setRange(id)}
                className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-all duration-200
                  ${range === id
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                  }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon="🌳" label="Trees planted" value={stats.planted}               delay={0} />
        <StatCard icon="⏱️" label="Focus time"    value={formatMinutes(stats.minutes)} delay={60} />
        <StatCard icon="🎯" label="Success rate"  value={`${stats.success}%`}         delay={120} />
        <StatCard icon="🔥" label="Focus streak"  value={`${focusStreak}d`}           delay={180} />
      </div>

      {/* 3D island: drag to orbit, tap a tree to fly to it */}
      {view === '3d' && visible.length > 0 ? (
        <div className={`relative h-[420px] sm:h-[520px] rounded-3xl overflow-hidden border border-emerald-100 dark:border-emerald-900/50 bg-gradient-to-b ${weather === 'rainy' ? RAIN_SKIES[phase] : SKIES[phase]}`}>
          <Suspense fallback={<div className="h-full grid place-items-center text-sm text-gray-600 dark:text-gray-300">🌱 Growing your island…</div>}>
            <ForestIsland
              key={range}
              trees={visible.slice(-MAX_3D_TREES)}
              phase={phase}
              weather={weather}
              selectedId={selected?.id ?? null}
              onSelect={setSelected}
              reducedMotion={prefersReducedMotion()}
            />
          </Suspense>
          <p className="absolute left-4 top-3 px-2.5 py-1 rounded-full text-[11px] font-medium bg-white/80 dark:bg-slate-900/70 text-gray-700 dark:text-gray-200 pointer-events-none">
            Drag to orbit · scroll to zoom · tap a tree
            {visible.length > MAX_3D_TREES && ` · newest ${MAX_3D_TREES}`}
          </p>
          {selected && (
            <div className="anim-fade-up absolute left-4 bottom-4 right-4 sm:right-auto sm:w-72 p-4 rounded-2xl bg-white/95 dark:bg-gray-900/95 shadow-xl">
              <div className="flex items-start gap-3">
                <Tree species={selected.species} withered={selected.withered} size={40} sway={false} />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 dark:text-white">{selected.withered ? 'Withered tree' : SPECIES[selected.species].name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {selected.minutes} min · {parseDateStr(selected.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    {' · '}{new Date(selected.plantedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                  </p>
                  {selected.label && <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-1 truncate">📖 {selected.label}</p>}
                </div>
                <button onClick={() => setSelected(null)} aria-label="Close" className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">✕</button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* The forest itself — key={range} replays the planting animation on tab change */
        <div
          key={range}
          className="relative rounded-3xl overflow-hidden border border-emerald-100 dark:border-emerald-900/50 bg-gradient-to-b from-sky-100 via-emerald-50 to-emerald-100 dark:from-slate-900 dark:via-emerald-950/60 dark:to-emerald-950"
        >
          {visible.length === 0 ? (
            <div className="py-16 px-6 text-center">
              <Tree species="oak" growth={0} size={72} className="mx-auto" />
              <p className="mt-3 text-gray-600 dark:text-gray-300 font-medium">No trees here yet</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Finish a focus session to plant one.</p>
              <Link
                to="/pomodoro"
                className="inline-block mt-5 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors"
              >
                🌱 Start focusing
              </Link>
            </div>
          ) : (
            <div className="flex flex-wrap items-end justify-center gap-x-1 gap-y-3 px-4 pt-8 pb-6 min-h-48">
              {visible.map((t, i) => (
                <Tree
                  key={t.id}
                  species={t.species}
                  withered={t.withered}
                  size={treeSize(t.minutes)}
                  className="anim-pop"
                  // Stagger the pop-in, capped so big forests don't take forever
                  style={{ animationDelay: `${Math.min(i, 40) * 35}ms` }}
                />
              ))}
            </div>
          )}
          {/* Grass strip */}
          <div className="h-3 bg-emerald-300/70 dark:bg-emerald-800/70" />
        </div>
      )}

      {stats.withered > 0 && (
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
          🥀 {stats.withered} {stats.withered === 1 ? 'tree' : 'trees'} withered from sessions you gave up on.
        </p>
      )}

      <div className="grid md:grid-cols-3 gap-4">
        {/* Year heatmap */}
        <div className="md:col-span-2 min-w-0 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-3">Year at a glance</h2>
          <YearHeatmap countsByDate={countsByDate} />
          <div className="flex items-center justify-end gap-1 mt-2 text-xs text-gray-400">
            Less
            {HEAT_COLORS.map((c) => <span key={c} className={`w-[11px] h-[11px] rounded-[3px] ${c}`} />)}
            More
          </div>
        </div>

        {/* Next unlock */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-3">Next unlock</h2>
          {upcoming ? (
            <div className="flex items-center gap-4">
              <Tree species={upcoming.id} size={56} sway={false} className="grayscale opacity-60 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{upcoming.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {upcoming.unlockAt - healthyCount} more {upcoming.unlockAt - healthyCount === 1 ? 'tree' : 'trees'} to go
                </p>
                <div className="mt-2 h-2 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all duration-700"
                    style={{ width: `${(healthyCount / upcoming.unlockAt) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              🏆 You've unlocked every species, including the {SPECIES.golden.name}!
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
