// src/pages/Wrapped.jsx
// Monthly "Wrapped" — your month as swipeable story cards, like Spotify Wrapped.
// Tap right/left to move, hold to pause, ← → keys, swipe on phones.
// Save a card as PNG (html-to-image) or share it (Web Share API).

import { useEffect, useEffectEvent, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import { toPng } from 'html-to-image';
import Tree from '../components/Tree';
import useCountUp from '../hooks/useCountUp';
import { useToast } from '../context/toast';
import { selectRawHabits } from '../features/habits/habitsSlice';
import { selectTrees } from '../features/forest/forestSlice';
import { selectJournal, MOODS } from '../features/journal/journalSlice';
import { todayStr, monthKey, monthLabel, addMonths, addDays } from '../utils/date';

const STORY_MS = 6000;

/** Longest run of consecutive days in a sorted list of dates */
const longestRun = (dates) => {
  let best = 0;
  let run = 0;
  dates.forEach((d, i) => {
    run = i > 0 && addDays(dates[i - 1], 1) === d ? run + 1 : 1;
    best = Math.max(best, run);
  });
  return best;
};

/** Everything the story cards show, for one "YYYY-MM" month */
const summarize = (month, habits, trees, journal) => {
  const inMonth = (d) => d.startsWith(month);
  const prev = addMonths(month, -1);
  const today = todayStr();
  const daysInMonth = new Date(Number(month.slice(0, 4)), Number(month.slice(5)), 0).getDate();
  const daysSoFar = monthKey(today) === month ? Number(today.slice(8)) : daysInMonth;

  const done = habits.reduce((n, h) => n + h.completedDates.filter(inMonth).length, 0);
  const prevDone = habits.reduce((n, h) => n + h.completedDates.filter((d) => d.startsWith(prev)).length, 0);

  const monthTrees = trees.filter((t) => !t.withered && inMonth(t.date));
  const focusMinutes = monthTrees.reduce((s, t) => s + t.minutes, 0);

  const ranked = habits
    .map((h) => {
      const dates = h.completedDates.filter(inMonth).sort();
      return { habit: h, days: dates.length, bestRun: longestRun(dates) };
    })
    .sort((a, b) => b.days - a.days);

  const moods = Object.values(journal).filter((e) => inMonth(e.date)).map((e) => e.mood);
  const avgMood = moods.length ? moods.reduce((a, b) => a + b, 0) / moods.length : null;

  return {
    done,
    change: prevDone > 0 ? Math.round(((done - prevDone) / prevDone) * 100) : null,
    trees: monthTrees,
    focusMinutes,
    top: ranked[0]?.days > 0 ? ranked[0] : null,
    daysSoFar,
    checkIns: moods.length,
    avgMood,
  };
};

const formatMinutes = (m) => (m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`);

// ── Story cards ───────────────────────────────────────────────────────────────

function Card({ gradient, children }) {
  return (
    <div className={`w-full h-full rounded-[28px] p-6 pt-10 text-white flex flex-col bg-gradient-to-br ${gradient}`}>
      {children}
    </div>
  );
}

function HabitsCard({ s, month }) {
  const n = useCountUp(s.done);
  return (
    <Card gradient="from-violet-600 to-pink-600">
      <p className="text-sm opacity-90">Your {monthLabel(month)} 🍂</p>
      <div className="mt-auto">
        <p className="text-7xl font-extrabold leading-none tabular-nums">{n}</p>
        <p className="text-lg font-semibold mt-1">habits completed</p>
        {s.change !== null && (
          <span className="inline-block mt-3 px-3 py-1 rounded-full bg-white/20 text-sm font-semibold">
            {s.change >= 0 ? '▲' : '▼'} {Math.abs(s.change)}% vs {monthLabel(addMonths(month, -1)).split(' ')[0]}
          </span>
        )}
      </div>
      <p className="mt-auto text-xs opacity-75">HabitFlow · Wrapped</p>
    </Card>
  );
}

function ForestCard({ s }) {
  const n = useCountUp(s.trees.length);
  return (
    <Card gradient="from-emerald-700 to-emerald-950">
      <p className="text-sm opacity-90">Your forest grew</p>
      <p className="text-6xl font-extrabold leading-none mt-2 tabular-nums">{n} <span className="text-xl">{s.trees.length === 1 ? 'tree' : 'trees'}</span></p>
      <div className="flex flex-wrap justify-center items-end gap-0.5 mt-6 max-h-48 overflow-hidden">
        {s.trees.length === 0
          ? <Tree species="oak" growth={0} size={56} />
          // No pop-in animation here: a PNG saved mid-animation would be missing trees
          : s.trees.slice(0, 24).map((t) => (
            <Tree key={t.id} species={t.species} size={34} sway={false} />
          ))}
      </div>
      <p className="mt-auto text-base font-semibold">⏱️ {formatMinutes(s.focusMinutes)} of deep focus</p>
    </Card>
  );
}

function TopHabitCard({ s }) {
  const n = useCountUp(s.top?.days ?? 0);
  return (
    <Card gradient="from-amber-500 to-orange-600">
      <p className="text-sm opacity-90">Your top habit</p>
      {s.top ? (
        <>
          <p className="text-6xl mt-6">{s.top.habit.icon}</p>
          <p className="text-3xl font-extrabold mt-2">{s.top.habit.name}</p>
          <p className="text-base mt-2 leading-relaxed">
            <b className="tabular-nums">{n}</b> of {s.daysSoFar} days<br />
            Longest run: {s.top.bestRun} {s.top.bestRun === 1 ? 'day' : 'days'} 🔥
          </p>
        </>
      ) : (
        <p className="text-xl font-bold mt-auto">Your top habit shows up here once you start checking habits off.</p>
      )}
      <p className="mt-auto text-xs opacity-75">HabitFlow · Wrapped</p>
    </Card>
  );
}

function MoodCard({ s }) {
  const mood = MOODS.find((m) => m.value === Math.round(s.avgMood));
  return (
    <Card gradient="from-sky-500 to-indigo-700">
      <p className="text-sm opacity-90">How the month felt</p>
      <p className="text-8xl mt-8 text-center">{mood?.emoji}</p>
      <p className="text-2xl font-extrabold text-center mt-3">Mostly {mood?.label.toLowerCase()}</p>
      <p className="text-center text-sm mt-1 opacity-90">{s.checkIns} evening check-ins · avg {s.avgMood.toFixed(1)} / 5</p>
      <p className="mt-auto text-xs opacity-75">HabitFlow · Wrapped</p>
    </Card>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Wrapped() {
  const habits = useSelector(selectRawHabits);
  const trees = useSelector(selectTrees);
  const journal = useSelector(selectJournal);
  const toast = useToast();
  const [params, setParams] = useSearchParams();

  const currentMonth = monthKey(todayStr());
  const month = /^\d{4}-\d{2}$/.test(params.get('month') ?? '') && params.get('month') <= currentMonth ? params.get('month') : currentMonth;
  const s = useMemo(() => summarize(month, habits, trees, journal), [month, habits, trees, journal]);

  const stories = [
    { id: 'habits', render: () => <HabitsCard s={s} month={month} /> },
    { id: 'forest', render: () => <ForestCard s={s} /> },
    { id: 'top',    render: () => <TopHabitCard s={s} /> },
    ...(s.checkIns >= 3 ? [{ id: 'mood', render: () => <MoodCard s={s} /> }] : []),
  ];

  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const cardRef = useRef(null);
  const press = useRef(null); // { x, y, time } of the current pointer press
  const current = Math.min(index, stories.length - 1);

  const go = (delta) => setIndex((i) => Math.max(0, Math.min(stories.length - 1, i + delta)));

  const changeMonth = (delta) => {
    setIndex(0);
    setParams({ month: addMonths(month, delta) }, { replace: true });
  };

  // Hold to pause; a quick tap moves left (left third) or right
  const onPointerDown = (e) => {
    press.current = { x: e.clientX, y: e.clientY, time: performance.now() };
    setPaused(true);
  };
  const onPointerUp = (e) => {
    if (!press.current) return;
    const { x, y, time } = press.current;
    press.current = null;
    setPaused(false);
    const dx = e.clientX - x;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(e.clientY - y)) return go(dx < 0 ? 1 : -1); // swipe
    if (performance.now() - time > 250) return; // it was a hold — just resume
    const rect = e.currentTarget.getBoundingClientRect();
    go(e.clientX - rect.left < rect.width / 3 ? -1 : 1);
  };

  const onKey = useEffectEvent((e) => {
    if (e.key === 'ArrowRight') go(1);
    else if (e.key === 'ArrowLeft') go(-1);
  });
  useEffect(() => {
    const handler = (e) => onKey(e);
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  /** Renders the visible card to a PNG */
  const renderPng = () => toPng(cardRef.current, { pixelRatio: 2, cacheBust: true });
  const fileName = `habitflow-${month}-${stories[current].id}.png`;

  const save = async () => {
    try {
      const url = await renderPng();
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      toast.show({ icon: '⬇️', message: 'Image saved' });
    } catch {
      toast.show({ icon: '⚠️', message: "Couldn't create the image" });
    }
  };

  const share = async () => {
    try {
      const blob = await (await fetch(await renderPng())).blob();
      const file = new File([blob], fileName, { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `My ${monthLabel(month)} on HabitFlow` });
      } else {
        await save(); // desktop browsers often can't share files — download instead
      }
    } catch (err) {
      if (err?.name !== 'AbortError') toast.show({ icon: '⚠️', message: "Couldn't share the image" });
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 sm:px-6 py-8 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Wrapped 🎁</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{monthLabel(month)}</p>
        </div>
        <div className="flex gap-1.5">
          <button onClick={() => changeMonth(-1)} aria-label="Previous month" className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700">‹</button>
          <button onClick={() => changeMonth(1)} aria-label="Next month" disabled={month === currentMonth} className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30">›</button>
        </div>
      </div>

      {/* Story viewer */}
      <div
        className="relative aspect-[9/16] mx-auto select-none touch-pan-y cursor-pointer shadow-2xl shadow-violet-300/40 dark:shadow-black/40 rounded-[28px]"
        style={{ width: 'min(100%, calc(70vh * 9 / 16))' }} // fit both narrow and short screens
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => { press.current = null; setPaused(false); }}
        onContextMenu={(e) => e.preventDefault()}
        role="region"
        aria-roledescription="carousel"
        aria-label={`Story ${current + 1} of ${stories.length}`}
      >
        {/* key remounts the card so its numbers count up again */}
        <div ref={cardRef} key={`${month}-${current}`} className="anim-fade-up absolute inset-0">
          {stories[current].render()}
        </div>

        {/* Progress segments */}
        <div className="absolute top-3 inset-x-4 flex gap-1" aria-hidden="true">
          {stories.map((st, i) => (
            <div key={st.id} className="flex-1 h-[3px] rounded-full bg-white/30 overflow-hidden">
              {i < current && <div className="h-full bg-white" />}
              {i === current && (
                <div
                  key={`${month}-${current}`}
                  className="anim-story h-full bg-white"
                  style={{ animationDuration: `${STORY_MS}ms`, animationPlayState: paused ? 'paused' : 'running' }}
                  onAnimationEnd={() => go(1)}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      <p className="text-center text-xs text-gray-400 dark:text-gray-500">Tap → next · tap left edge ← back · hold to pause</p>

      <div className="flex gap-3">
        <button onClick={save} className="flex-1 py-3 rounded-2xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-semibold text-sm hover:opacity-90 transition-opacity">
          ⬇ Save image
        </button>
        <button onClick={share} className="flex-1 py-3 rounded-2xl bg-violet-600 hover:bg-violet-700 text-white font-semibold text-sm transition-colors">
          ↗ Share
        </button>
      </div>
      <p className="text-center text-[11px] text-gray-400 dark:text-gray-500">Saves the card you're looking at</p>
    </div>
  );
}
