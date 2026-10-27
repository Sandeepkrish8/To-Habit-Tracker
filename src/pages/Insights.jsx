// src/pages/Insights.jsx
// Evening check-in (mood, energy, sleep, note) + insights found in your own data.

import { useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { selectRawHabits } from '../features/habits/habitsSlice';
import { selectTrees } from '../features/forest/forestSlice';
import { MOODS, ENERGY, saveCheckIn, selectJournal } from '../features/journal/journalSlice';
import {
  MIN_CHECKINS, sleepInsight, bestFocusWindow, moodBoostHabit, hourLabel,
} from '../features/journal/insights';
import { XP } from '../features/achievements/progress';
import { useToast } from '../context/toast';
import { todayStr, daysAgoStr, parseDateStr } from '../utils/date';

// The check-in card takes on the color of your mood
const MOOD_TINTS = {
  1: 'from-slate-100 to-white dark:from-slate-800/60',
  2: 'from-gray-100 to-white dark:from-gray-800/60',
  3: 'from-violet-50 to-white dark:from-violet-950/40',
  4: 'from-emerald-50 to-white dark:from-emerald-950/40',
  5: 'from-amber-50 to-white dark:from-amber-950/40',
};
const MOONS = ['🌑', '🌒', '🌓', '🌔', '🌕'];

function CheckIn({ existing }) {
  const dispatch = useDispatch();
  const toast = useToast();
  const [mood, setMood] = useState(existing?.mood ?? null);
  const [energy, setEnergy] = useState(existing?.energy ?? 'medium');
  const [sleep, setSleep] = useState(existing?.sleep ?? 7);
  const [note, setNote] = useState(existing?.note ?? '');

  const save = () => {
    dispatch(saveCheckIn({ date: todayStr(), mood, energy, sleep, note }));
    toast.show({ icon: '🌙', message: existing ? 'Check-in updated' : `Check-in saved · +${XP.checkIn} XP` });
  };

  // Moon fills from 🌑 (3h) to 🌕 (9h+)
  const moon = MOONS[Math.min(4, Math.max(0, Math.round((sleep - 3) / 1.5)))];

  return (
    <div className={`rounded-3xl border border-gray-200 dark:border-gray-700 p-5 sm:p-6 shadow-sm bg-gradient-to-b transition-colors duration-500 dark:to-gray-800 ${MOOD_TINTS[mood] ?? 'from-white to-white dark:from-gray-800'}`}>
      <h2 className="text-lg font-bold text-gray-900 dark:text-white">Evening check-in 🌙</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400">How did today feel?</p>

      <div className="flex justify-between my-5" role="radiogroup" aria-label="Mood">
        {MOODS.map((m) => {
          const picked = mood === m.value;
          return (
            <button
              key={m.value}
              role="radio"
              aria-checked={picked}
              aria-label={m.label}
              onClick={() => setMood(m.value)}
              className={`w-12 h-12 rounded-full grid place-items-center text-2xl transition-all duration-200
                ${picked
                  ? 'anim-pick bg-violet-100 dark:bg-violet-900/60 ring-4 ring-violet-200 dark:ring-violet-800'
                  : 'bg-gray-100 dark:bg-gray-700/60 grayscale-[60%] opacity-70 hover:opacity-100 hover:grayscale-0'}`}
            >
              {m.emoji}
            </button>
          );
        })}
      </div>

      <p className="text-[11px] font-bold tracking-wider text-gray-400 uppercase mb-2">Energy</p>
      <div className="flex gap-1 p-1 rounded-xl bg-gray-100 dark:bg-gray-900/60" role="radiogroup" aria-label="Energy">
        {ENERGY.map((e) => (
          <button
            key={e}
            role="radio"
            aria-checked={energy === e}
            onClick={() => setEnergy(e)}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold capitalize transition-all
              ${energy === e ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}
          >
            {e}
          </button>
        ))}
      </div>

      <label className="block mt-5">
        <span className="flex justify-between items-center mb-2">
          <span className="text-[11px] font-bold tracking-wider text-gray-400 uppercase">Sleep last night</span>
          <span className="text-sm font-bold text-gray-800 dark:text-gray-100 tabular-nums">{sleep} h <span className="text-lg">{moon}</span></span>
        </span>
        <input
          type="range" min="3" max="12" step="0.5"
          value={sleep}
          onChange={(e) => setSleep(Number(e.target.value))}
          className="w-full accent-violet-600"
        />
      </label>

      <label className="block mt-4">
        <span className="sr-only">Note</span>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={280}
          rows={2}
          placeholder="Anything worth remembering? (optional)"
          className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none"
        />
      </label>

      <button
        onClick={save}
        disabled={mood === null}
        className="mt-3 w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors"
      >
        {existing ? 'Update check-in' : 'Save check-in'}
      </button>
    </div>
  );
}

function InsightCard({ icon, title, children, delay = 0 }) {
  return (
    <div className="anim-fade-up rounded-3xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-5 shadow-sm" style={{ animationDelay: `${delay}ms` }}>
      <p className="font-bold text-gray-900 dark:text-white">{icon} {title}</p>
      {children}
    </div>
  );
}

export default function Insights() {
  const habits = useSelector(selectRawHabits);
  const trees = useSelector(selectTrees);
  const journal = useSelector(selectJournal);

  const entries = useMemo(() => Object.values(journal), [journal]);
  const unlocked = entries.length >= MIN_CHECKINS;
  const sleep = useMemo(() => sleepInsight(habits, entries), [habits, entries]);
  const focus = useMemo(() => bestFocusWindow(trees), [trees]);
  const boost = useMemo(() => moodBoostHabit(habits, entries), [habits, entries]);

  const today = todayStr();
  const recent = Array.from({ length: 14 }, (_, i) => daysAgoStr(13 - i));
  const moodEmoji = (v) => MOODS.find((m) => m.value === Math.round(v))?.emoji;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-5">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Insights ✨</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">A 10-second check-in each evening. Patterns appear over time.</p>
      </div>

      <div className="grid lg:grid-cols-[380px_1fr] gap-5 items-start">
        <div className="space-y-5">
          {/* key: a saved check-in re-seeds the form */}
          <CheckIn key={journal[today] ? 'edit' : 'new'} existing={journal[today]} />

          {/* Last 14 days of moods */}
          <div className="rounded-3xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
            <p className="text-[11px] font-bold tracking-wider text-gray-400 uppercase mb-3">Last 14 days</p>
            <div className="grid grid-cols-7 gap-1.5">
              {recent.map((d) => (
                <div
                  key={d}
                  title={d}
                  className={`aspect-square rounded-lg grid place-items-center text-lg ${journal[d] ? 'bg-violet-50 dark:bg-violet-950/40' : 'bg-gray-50 dark:bg-gray-900/60'} ${d === today ? 'ring-2 ring-violet-400' : ''}`}
                >
                  {journal[d] ? moodEmoji(journal[d].mood) : <span className="text-[10px] text-gray-300 dark:text-gray-600">{Number(d.slice(8))}</span>}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4 min-w-0">
          <p className="text-[11px] font-bold tracking-wider text-gray-400 uppercase">
            Insights · based on your own data · computed on your device
          </p>

          {!unlocked && (
            <div className="rounded-3xl p-5 bg-gradient-to-br from-violet-600 to-indigo-600 text-white">
              <p className="font-bold">🔒 Mood insights unlock after {MIN_CHECKINS} check-ins</p>
              <p className="text-sm text-violet-100 mt-1">{entries.length} of {MIN_CHECKINS} done. Keep checking in each evening.</p>
              <div className="mt-3 h-2 rounded-full bg-white/20 overflow-hidden">
                <div className="h-full bg-white rounded-full transition-all duration-700" style={{ width: `${(entries.length / MIN_CHECKINS) * 100}%` }} />
              </div>
            </div>
          )}

          {unlocked && sleep && (
            <InsightCard icon="😴" title={sleep.lift !== null && sleep.lift > 0 ? `Sleep 7h+ → ${sleep.lift}% more habits done` : 'Sleep vs. habits'}>
              <div className="mt-3 space-y-2 text-xs text-gray-500 dark:text-gray-400">
                {[['7h+ sleep', sleep.goodPct, 'bg-violet-600'], ['Under 7h', sleep.poorPct, 'bg-violet-300']].map(([label, pct, color]) => (
                  <div key={label} className="flex items-center gap-2">
                    <span className="w-16 shrink-0">{label}</span>
                    <div className="flex-1 h-3.5 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                      <div className={`h-full rounded-full ${color} transition-all duration-1000`} style={{ width: `${pct}%` }} />
                    </div>
                    <b className="w-9 text-right text-gray-800 dark:text-gray-100">{pct}%</b>
                  </div>
                ))}
              </div>
            </InsightCard>
          )}

          {focus ? (
            <InsightCard icon="⏰" title={`Your best focus window: ${hourLabel(focus.start)}–${hourLabel(focus.end)}`} delay={80}>
              <div className="h-28 mt-3">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={focus.hours.map((m, h) => ({ hour: hourLabel(h), minutes: m, h }))} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                    <XAxis dataKey="hour" interval={5} tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: 'rgba(124,58,237,0.08)' }} formatter={(v) => [`${v} min`, 'Focus']} />
                    <Bar dataKey="minutes" radius={[3, 3, 0, 0]}>
                      {focus.hours.map((_, h) => (
                        <Cell key={h} fill={h >= focus.start && h < focus.end ? '#7c3aed' : '#ddd6fe'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Try scheduling your hardest work in this window.</p>
            </InsightCard>
          ) : (
            <InsightCard icon="⏰" title="Best focus window" delay={80}>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Finish 5 focus sessions to find the hours you focus best.</p>
            </InsightCard>
          )}

          {unlocked && boost && (
            <InsightCard icon={boost.habit.icon} title={`${boost.habit.name} days = better mood`} delay={160}>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Average mood {moodEmoji(boost.withoutMood)} → {moodEmoji(boost.withMood)} on days you do it
                ({boost.withoutMood.toFixed(1)} → {boost.withMood.toFixed(1)} out of 5).
              </p>
            </InsightCard>
          )}

          {unlocked && !sleep && !boost && (
            <InsightCard icon="🔎" title="Still looking for patterns" delay={160}>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Your days are quite similar so far. Insights appear when there's enough variety, like some short-sleep nights and some long ones.
              </p>
            </InsightCard>
          )}

          <p className="text-[11px] text-gray-400 dark:text-gray-500">
            🔒 Everything here is computed in your browser from your own check-ins, habits and focus sessions. Nothing is uploaded.
            {entries.length > 0 && ` First check-in: ${parseDateStr(entries.map((e) => e.date).sort()[0]).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}.`}
          </p>
        </div>
      </div>
    </div>
  );
}
