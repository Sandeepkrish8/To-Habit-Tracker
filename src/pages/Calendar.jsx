// src/pages/Calendar.jsx
// Month view of every habit. Tap any past day to fix it ("backfill"), spend a
// streak freeze on a missed day, swipe or use ‹ › to change month, and jump
// around with the 6-month heatmap.

import { useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import {
  selectHabits, selectFrozenDates, selectFreezesLeft, selectPerfectDates,
  setHabitDone, applyFreeze, removeFreeze,
} from '../features/habits/habitsSlice';
import { useToast } from '../context/toast';
import {
  todayStr, toDateStr, parseDateStr, addMonths, monthLabel, monthKey,
} from '../utils/date';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const existedOn = (habit, date) => toDateStr(new Date(habit.createdAt)) <= date;

/** Builds the month grid: leading blanks, then one entry per day */
const buildMonth = (key) => {
  const first = parseDateStr(`${key}-01`);
  const days = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  return [
    ...Array(first.getDay()).fill(null),
    ...Array.from({ length: days }, (_, i) => `${key}-${String(i + 1).padStart(2, '0')}`),
  ];
};

/** Keeps Tab focus inside the popover (a "focus trap") */
const trapFocus = (e, container) => {
  if (e.key !== 'Tab') return;
  const items = container.querySelectorAll('button:not([disabled]), [href], input');
  if (items.length === 0) return;
  const first = items[0];
  const last = items[items.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
};

function Switch({ checked, onChange, color, label }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className="relative w-10 h-6 rounded-full transition-colors duration-200 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
      style={{ backgroundColor: checked ? color : undefined }}
    >
      <span className={`absolute inset-0 rounded-full ${checked ? '' : 'bg-gray-200 dark:bg-gray-600'}`} />
      <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-200 ${checked ? 'left-[18px]' : 'left-0.5'}`} />
    </button>
  );
}

/** Edit one day. Keyed by date in the parent, so its draft state starts fresh per day. */
function DayPopover({ date, habits, position, frozen, freezesLeft, onClose }) {
  const dispatch = useDispatch();
  const toast = useToast();
  const ref = useRef(null);
  const active = habits.filter((h) => existedOn(h, date));
  const [draft, setDraft] = useState(() =>
    Object.fromEntries(active.map((h) => [h.id, h.completedDates.includes(date)]))
  );

  const isPast = date < todayStr();
  const allDone = active.length > 0 && active.every((h) => draft[h.id]);
  const label = parseDateStr(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  const save = () => {
    for (const h of active) dispatch(setHabitDone({ id: h.id, date, done: draft[h.id] }));
    toast.show({ icon: '📅', message: `${label} updated` });
    onClose();
  };

  const toggleFreeze = () => {
    if (frozen) {
      dispatch(removeFreeze(date));
      toast.show({ icon: '🧊', message: 'Freeze returned' });
    } else {
      dispatch(applyFreeze(date));
      toast.show({ icon: '🧊', message: `Streaks protected on ${label}` });
    }
    onClose();
  };

  return (
    <>
      {/* Click-away backdrop (dimmed on phones, where the popover is a bottom sheet) */}
      <div className="fixed inset-0 z-40 bg-black/30 sm:bg-transparent" onClick={onClose} aria-hidden="true" />
      <div
        ref={(el) => {
          ref.current = el;
          // Move focus inside once, when the popover appears
          if (el && !el.contains(document.activeElement)) el.querySelector('button')?.focus();
        }}
        role="dialog"
        aria-modal="true"
        aria-label={`Edit ${label}`}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onClose();
          trapFocus(e, ref.current);
        }}
        className="anim-fade-up fixed z-50 inset-x-0 bottom-0 rounded-t-3xl sm:rounded-2xl sm:absolute sm:inset-x-auto sm:bottom-auto sm:w-64
          sm:left-[var(--x)] sm:top-[var(--y)] bg-white dark:bg-gray-900 border border-violet-200 dark:border-violet-800 shadow-2xl p-5 sm:p-4"
        style={{ '--x': `${position.x}px`, '--y': `${position.y}px` }}
      >
        <p className="font-bold text-gray-900 dark:text-white">{label}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          {isPast ? 'Forgot to log? Update this day.' : 'Today'}
        </p>

        {active.length === 0 ? (
          <p className="text-sm text-gray-400">No habits existed yet on this day.</p>
        ) : (
          <div className="space-y-2.5">
            {active.map((h) => (
              <div key={h.id} className="flex items-center justify-between gap-3 text-sm text-gray-700 dark:text-gray-200">
                <span className="truncate">{h.icon} {h.name}</span>
                <Switch
                  checked={draft[h.id]}
                  color={h.color}
                  label={`${h.name} on ${label}`}
                  onChange={() => setDraft((d) => ({ ...d, [h.id]: !d[h.id] }))}
                />
              </div>
            ))}
          </div>
        )}

        {active.length > 0 && (
          <button
            onClick={save}
            className="mt-4 w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition-colors"
          >
            Save day
          </button>
        )}

        {/* Streak freeze — only for missed past days */}
        {isPast && active.length > 0 && !allDone && (frozen || freezesLeft > 0) && (
          <button
            onClick={toggleFreeze}
            className="mt-2 w-full py-2 rounded-xl bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 text-sm font-medium hover:bg-sky-100 dark:hover:bg-sky-900/50 transition-colors"
          >
            {frozen ? '🧊 Remove streak freeze' : `🧊 Use a streak freeze (${freezesLeft} left)`}
          </button>
        )}
      </div>
    </>
  );
}

export default function Calendar() {
  const habits = useSelector(selectHabits);
  const frozenDates = useSelector(selectFrozenDates);
  const freezesLeft = useSelector(selectFreezesLeft);
  const perfectDates = useSelector(selectPerfectDates);
  const [params, setParams] = useSearchParams();

  const today = todayStr();
  const [month, setMonth] = useState(() => monthKey(today));
  const [open, setOpen] = useState(null); // { date, x, y }
  const gridRef = useRef(null);
  const swipeStart = useRef(null);

  const filterId = params.get('habit');
  const filtered = habits.find((h) => h.id === filterId) ?? null;
  const visible = useMemo(() => (filtered ? [filtered] : habits), [filtered, habits]);
  const frozen = useMemo(() => new Set(frozenDates), [frozenDates]);

  const cells = useMemo(() => buildMonth(month), [month]);
  const isCurrentMonth = month === monthKey(today);

  // Month summary
  const pastDays = cells.filter((d) => d && d <= today);
  const possible = pastDays.reduce((n, d) => n + visible.filter((h) => existedOn(h, d)).length, 0);
  const done = pastDays.reduce((n, d) => n + visible.filter((h) => h.completedDates.includes(d)).length, 0);
  const monthPerfect = pastDays.filter((d) => perfectDates.has(d)).length;

  const setFilter = (id) => setParams(id ? { habit: id } : {}, { replace: true });

  /** Open the popover next to a day cell (desktop) or as a bottom sheet (phone) */
  const openDay = (date, el) => {
    const grid = gridRef.current.getBoundingClientRect();
    const cell = el.getBoundingClientRect();
    const popoverWidth = 256;
    const rightSpace = grid.right - cell.right;
    const x = rightSpace > popoverWidth + 8
      ? cell.right - grid.left + 8
      : Math.max(0, cell.left - grid.left - popoverWidth - 8);
    setOpen({ date, x, y: cell.top - grid.top });
  };

  const closeDay = () => {
    const date = open?.date;
    setOpen(null);
    // Return focus to the day you were editing
    requestAnimationFrame(() => document.querySelector(`[data-day="${date}"]`)?.focus());
  };

  // Swipe left/right on the grid to change month
  const onPointerDown = (e) => { swipeStart.current = { x: e.clientX, y: e.clientY }; };
  const onPointerUp = (e) => {
    if (!swipeStart.current) return;
    const dx = e.clientX - swipeStart.current.x;
    const dy = e.clientY - swipeStart.current.y;
    swipeStart.current = null;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx < 0 && !isCurrentMonth) setMonth((m) => addMonths(m, 1));
      if (dx > 0) setMonth((m) => addMonths(m, -1));
    }
  };

  // 6-month heatmap: 26 weeks ending this week
  const heatWeeks = useMemo(() => {
    const end = parseDateStr(today);
    const startDay = new Date(end);
    startDay.setDate(startDay.getDate() - 7 * 25 - end.getDay());
    const weeks = [];
    for (const d = new Date(startDay); d <= end; d.setDate(d.getDate() + 1)) {
      if (d.getDay() === 0) weeks.push([]);
      const date = toDateStr(d);
      const active = visible.filter((h) => existedOn(h, date)).length;
      const count = visible.filter((h) => h.completedDates.includes(date)).length;
      weeks[weeks.length - 1].push({ date, level: active ? Math.ceil((count / active) * 4) : 0 });
    }
    return weeks;
  }, [today, visible]);

  const topStreak = filtered ? filtered.streak : habits.reduce((m, h) => Math.max(m, h.streak), 0);
  const HEAT = ['bg-gray-100 dark:bg-gray-800', 'bg-violet-200 dark:bg-violet-900', 'bg-violet-300 dark:bg-violet-700', 'bg-violet-500', 'bg-violet-700 dark:bg-violet-300'];

  if (habits.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16 text-center space-y-3">
        <div className="text-6xl">📅</div>
        <p className="text-gray-500 dark:text-gray-400 font-medium">No habits to show yet.</p>
        <p className="text-gray-400 dark:text-gray-500 text-sm">Add a habit on the Home page to fill your calendar.</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Calendar</h1>
      <p className="text-gray-500 dark:text-gray-400 text-sm mt-1 mb-6">Tap any past day to fix it. Swipe to change month.</p>

      <div className="grid lg:grid-cols-[1fr_280px] gap-5">
        {/* ── Month card ── */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700 p-4 sm:p-6 shadow-sm min-w-0">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{monthLabel(month)}</h2>
            <div className="flex gap-1.5">
              <button onClick={() => setMonth((m) => addMonths(m, -1))} aria-label="Previous month"
                className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600">‹</button>
              <button onClick={() => setMonth((m) => addMonths(m, 1))} aria-label="Next month" disabled={isCurrentMonth}
                className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-30">›</button>
            </div>
          </div>

          {/* Habit filter chips */}
          <div className="flex gap-1.5 flex-wrap my-4">
            <button
              onClick={() => setFilter(null)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${!filtered ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}
            >
              All habits
            </button>
            {habits.map((h) => (
              <button
                key={h.id}
                onClick={() => setFilter(filtered?.id === h.id ? null : h.id)}
                className="px-3 py-1 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5"
                style={{
                  backgroundColor: filtered?.id === h.id ? h.color : `${h.color}1f`,
                  color: filtered?.id === h.id ? '#fff' : h.color,
                }}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: filtered?.id === h.id ? '#fff' : h.color }} />
                {h.name}
              </button>
            ))}
          </div>

          <div
            ref={gridRef}
            className="relative touch-pan-y select-none"
            onPointerDown={onPointerDown}
            onPointerUp={onPointerUp}
          >
            <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
              {WEEKDAYS.map((d, i) => (
                <div key={i} className="text-center text-[11px] font-bold text-gray-400 pb-1">{d}</div>
              ))}
              {cells.map((date, i) => {
                if (!date) return <div key={`blank-${i}`} />;
                const future = date > today;
                const doneHabits = visible.filter((h) => h.completedDates.includes(date));
                const perfect = !filtered && perfectDates.has(date);
                const isFrozen = frozen.has(date);
                const single = filtered && doneHabits.length > 0;
                const selected = open?.date === date;
                return (
                  <button
                    key={date}
                    data-day={date}
                    disabled={future}
                    onClick={(e) => openDay(date, e.currentTarget)}
                    aria-label={`${parseDateStr(date).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}: ${doneHabits.length} done${isFrozen ? ', streak freeze' : ''}`}
                    className={`relative h-12 sm:h-14 rounded-xl p-1.5 text-left transition-all duration-150
                      ${future ? 'opacity-30 cursor-default' : 'hover:ring-2 hover:ring-violet-300 dark:hover:ring-violet-700'}
                      ${perfect ? 'bg-pink-50 dark:bg-pink-950/30' : 'bg-gray-50 dark:bg-gray-900/60'}
                      ${date === today ? 'ring-2 ring-violet-500' : ''}
                      ${selected ? 'ring-2 ring-violet-400 bg-violet-50 dark:bg-violet-950/50' : ''}
                      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500`}
                    style={single ? { backgroundColor: `${filtered.color}2e` } : undefined}
                  >
                    <span className={`text-xs ${date === today ? 'font-extrabold text-violet-600 dark:text-violet-400' : 'font-semibold text-gray-600 dark:text-gray-300'}`}>
                      {Number(date.slice(8))}
                    </span>
                    <span className="flex flex-wrap gap-0.5 mt-1">
                      {doneHabits.slice(0, 6).map((h) => (
                        <i key={h.id} className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full" style={{ backgroundColor: h.color }} />
                      ))}
                    </span>
                    {perfect && <span className="absolute top-0.5 right-1 text-[10px]" aria-hidden="true">🌸</span>}
                    {isFrozen && <span className="absolute bottom-0.5 right-1 text-[10px]" aria-hidden="true">🧊</span>}
                  </button>
                );
              })}
            </div>

            {open && (
              <DayPopover
                key={open.date}
                date={open.date}
                habits={habits}
                position={open}
                frozen={frozen.has(open.date)}
                freezesLeft={freezesLeft}
                onClose={closeDay}
              />
            )}
          </div>

          <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
            {possible > 0 ? Math.round((done / possible) * 100) : 0}% complete
            {!filtered && <> · 🌸 {monthPerfect} perfect {monthPerfect === 1 ? 'day' : 'days'}</>}
          </p>
        </div>

        {/* ── Side cards ── */}
        <div className="space-y-5 min-w-0">
          <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
            <p className="text-[11px] font-bold tracking-wider text-gray-400 uppercase">
              {filtered ? `${filtered.name} streak` : 'Best current streak'}
            </p>
            <p className="mt-1"><span className="text-4xl font-extrabold text-gray-900 dark:text-white">{topStreak}</span> <span className="text-gray-500">days 🔥</span></p>
            <div className="mt-4 p-3 rounded-2xl bg-sky-50 dark:bg-sky-950/40 flex items-center gap-3">
              <span className="text-2xl" aria-hidden="true">{'🧊'.repeat(Math.min(freezesLeft, 3)) || '🫥'}</span>
              <p className="text-xs text-sky-800 dark:text-sky-300 leading-snug">
                <b>{freezesLeft} {freezesLeft === 1 ? 'freeze' : 'freezes'} left</b><br />
                Tap a missed day to protect your streak. Earn 1 per 7 perfect days.
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
            <p className="text-[11px] font-bold tracking-wider text-gray-400 uppercase mb-3">Last 6 months</p>
            <div className="flex gap-[3px]">
              {heatWeeks.map((week) => (
                <div key={week[0].date} className="flex flex-col gap-[3px]">
                  {week.map(({ date, level }) => (
                    <button
                      key={date}
                      title={date}
                      aria-label={`Go to ${date}`}
                      onClick={() => setMonth(monthKey(date))}
                      className={`w-[7px] h-[7px] rounded-[2px] ${HEAT[level]} hover:ring-1 hover:ring-violet-500`}
                    />
                  ))}
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-3">Tap a square to jump to that month</p>
          </div>
        </div>
      </div>
    </div>
  );
}
