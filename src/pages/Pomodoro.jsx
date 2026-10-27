// src/pages/Pomodoro.jsx
// Focus timer that grows a tree. Finish a focus session → the tree is planted
// in your forest. Give up halfway → the tree withers.
//
// The timer stores the timestamp it ends at (`endAt`) instead of counting down
// with setInterval ticks, so it stays accurate when the tab is in the background
// and keeps running if you switch pages or reload.

import { useState, useEffect, useRef, useCallback, useEffectEvent } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Tree from '../components/Tree';
import PlantCelebration from '../components/PlantCelebration';
import { plantTree, witherTree, selectTrees, selectHealthyCount } from '../features/forest/forestSlice';
import { SPECIES, SPECIES_IDS, isUnlocked } from '../features/forest/species';
import { todayStr } from '../utils/date';

const MODES = {
  work:  { label: 'Focus',       duration: null,    color: '#059669', emoji: '🌱' },
  break: { label: 'Short Break', duration:  5 * 60, color: '#0891b2', emoji: '☕' },
  long:  { label: 'Long Break',  duration: 15 * 60, color: '#2563eb', emoji: '🧘' },
};

// Longer sessions grow bigger trees in the forest
const FOCUS_OPTIONS = [25, 45, 60];

// SVG ring constants
const RING_SIZE = 260;
const RADIUS = 118;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const TIMER_KEY = 'habitTracker_timer';

function pad(n) { return String(n).padStart(2, '0'); }

const durationOf = (mode, focusMinutes) =>
  mode === 'work' ? focusMinutes * 60 : MODES[mode].duration;

// Timer shape: { mode, focusMinutes, species, endAt: number|null, remaining: seconds }
const DEFAULT_TIMER = { mode: 'work', focusMinutes: 25, species: 'oak', endAt: null, remaining: 25 * 60 };

const loadTimer = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(TIMER_KEY));
    if (saved && MODES[saved.mode] && SPECIES[saved.species]) return saved;
  } catch {
    // Corrupted or unavailable storage — start fresh
  }
  return DEFAULT_TIMER;
};

export default function Pomodoro() {
  const dispatch = useDispatch();
  const trees = useSelector(selectTrees);
  const healthyCount = useSelector(selectHealthyCount);

  const [timer, setTimer] = useState(loadTimer);
  const [now, setNow] = useState(() => Date.now());
  const [celebration, setCelebration] = useState(null); // tree just planted
  const audioCtxRef = useRef(null);

  const { mode, focusMinutes, species, endAt, remaining } = timer;
  const running = endAt !== null;
  const duration = durationOf(mode, focusMinutes);
  const timeLeft = running ? Math.max(0, Math.ceil((endAt - now) / 1000)) : remaining;
  const { color, label, emoji } = MODES[mode];
  const progress = timeLeft / duration;
  const strokeDash = CIRCUMFERENCE * progress;
  // A focus session is "in progress" from the moment it starts until it ends or is reset
  const inProgress = mode === 'work' && (running || timeLeft < duration);

  const today = todayStr();
  const todayTrees = trees.filter((t) => t.date === today);
  const todayHealthy = todayTrees.filter((t) => !t.withered);
  const todayMinutes = todayHealthy.reduce((sum, t) => sum + t.minutes, 0);

  // Persist the timer so it survives page switches and reloads
  useEffect(() => {
    try {
      localStorage.setItem(TIMER_KEY, JSON.stringify(timer));
    } catch {
      // Storage unavailable — timer still works for this visit
    }
  }, [timer]);

  // Play a gentle beep using Web Audio API
  const playBeep = useCallback(() => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 1.2);
    } catch {
      // Audio unavailable — silent fallback
    }
  }, []);

  // Runs once when the countdown reaches zero. useEffectEvent always sees the
  // latest timer state without restarting the interval below.
  const onFinish = useEffectEvent(() => {
    playBeep();
    if (mode === 'work') {
      const tree = { species, minutes: focusMinutes, at: endAt };
      dispatch(plantTree(tree));
      setCelebration(tree);
      // Every 4th tree of the day earns a long break
      const next = (todayHealthy.length + 1) % 4 === 0 ? 'long' : 'break';
      setTimer((t) => ({ ...t, mode: next, endAt: null, remaining: durationOf(next, t.focusMinutes) }));
    } else {
      setTimer((t) => ({ ...t, mode: 'work', endAt: null, remaining: t.focusMinutes * 60 }));
    }
  });

  // Countdown tick — re-reads the clock instead of trusting the interval
  useEffect(() => {
    if (endAt === null) return;
    const id = setInterval(() => {
      const t = Date.now();
      if (t >= endAt) {
        clearInterval(id);
        onFinish();
      } else {
        setNow(t);
      }
    }, 250);
    return () => clearInterval(id);
  }, [endAt]);

  /**
   * Leaving a focus session early withers its tree. Returns false if the user
   * changes their mind and wants to keep focusing.
   */
  const confirmGiveUp = () => {
    if (!inProgress) return true;
    const ok = window.confirm('Give up this focus session? Your growing tree will wither 🥀');
    if (ok) {
      const minutesSpent = Math.floor((duration - timeLeft) / 60);
      dispatch(witherTree({ species, minutes: minutesSpent }));
    }
    return ok;
  };

  const handleStartPause = () => {
    const t = Date.now();
    setNow(t);
    setTimer((prev) =>
      prev.endAt === null
        ? { ...prev, endAt: t + prev.remaining * 1000 }                                         // start / resume
        : { ...prev, endAt: null, remaining: Math.max(0, Math.ceil((prev.endAt - t) / 1000)) } // pause
    );
  };

  const switchMode = (newMode) => {
    if (!confirmGiveUp()) return;
    setTimer((t) => ({ ...t, mode: newMode, endAt: null, remaining: durationOf(newMode, t.focusMinutes) }));
  };

  const handleReset = () => {
    if (!confirmGiveUp()) return;
    setTimer((t) => ({ ...t, endAt: null, remaining: durationOf(t.mode, t.focusMinutes) }));
  };

  const chooseFocusLength = (minutes) =>
    setTimer((t) => ({ ...t, focusMinutes: minutes, remaining: minutes * 60 }));

  const chooseSpecies = (id) => setTimer((t) => ({ ...t, species: id }));

  const startBreak = () => {
    setCelebration(null);
    const t = Date.now();
    setNow(t);
    setTimer((prev) => ({ ...prev, endAt: t + prev.remaining * 1000 }));
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div className="max-w-md mx-auto px-4 sm:px-6 py-8 space-y-8">

      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Focus Forest</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
          Stay focused and your tree grows. Give up and it withers.
        </p>
      </div>

      {/* Mode selector */}
      <div className="flex gap-2 bg-gray-100 dark:bg-gray-800 rounded-2xl p-1">
        {Object.entries(MODES).map(([key, { label, emoji }]) => (
          <button
            key={key}
            onClick={() => key !== mode && switchMode(key)}
            className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all duration-200
              ${mode === key
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
          >
            {emoji} {label}
          </button>
        ))}
      </div>

      {/* SVG countdown ring with the growing tree inside */}
      <div className="flex flex-col items-center">
        <div
          className={`relative ${running ? 'anim-glow' : ''}`}
          style={{ '--glow-color': `${color}88` }}
        >
          <svg width={RING_SIZE} height={RING_SIZE} className="rotate-[-90deg]">
            {/* Track */}
            <circle
              cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RADIUS}
              fill="none"
              stroke="currentColor"
              strokeWidth="10"
              className="text-gray-200 dark:text-gray-700"
            />
            {/* Progress arc */}
            <circle
              cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RADIUS}
              fill="none"
              stroke={color}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={`${strokeDash} ${CIRCUMFERENCE}`}
              style={{ transition: 'stroke-dasharray 0.5s ease' }}
            />
          </svg>

          {/* Tree + time display inside ring */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {mode === 'work' ? (
              <Tree species={species} growth={1 - progress} size={96} sway={running} />
            ) : (
              <span className="text-5xl mb-2">{emoji}</span>
            )}
            <span className="text-4xl font-bold tabular-nums text-gray-900 dark:text-white tracking-tight">
              {pad(minutes)}:{pad(seconds)}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 font-medium">{label}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={handleReset}
            className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center justify-center text-xl transition-all duration-200"
            title="Reset"
            aria-label="Reset timer"
          >
            ↺
          </button>

          <button
            onClick={handleStartPause}
            className="px-8 py-3 rounded-full text-white text-lg font-semibold shadow-lg transition-all duration-200 active:scale-95 hover:-translate-y-0.5"
            style={{
              backgroundColor: color,
              boxShadow: `0 8px 24px ${color}55`,
            }}
          >
            {running ? '⏸ Pause' : inProgress ? '▶ Resume' : mode === 'work' ? '🌱 Plant' : '▶ Start'}
          </button>

          <button
            onClick={() => switchMode(mode === 'work' ? 'break' : 'work')}
            className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center justify-center text-xl transition-all duration-200"
            title="Skip"
            aria-label="Skip to next mode"
          >
            ⏭
          </button>
        </div>
      </div>

      {/* Session setup — only before a focus session starts */}
      {mode === 'work' && !inProgress && (
        <div className="anim-fade-up bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm space-y-4">
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Focus length</p>
            <div className="flex gap-2">
              {FOCUS_OPTIONS.map((m) => (
                <button
                  key={m}
                  onClick={() => chooseFocusLength(m)}
                  className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all duration-200
                    ${focusMinutes === m
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                >
                  {m} min
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">Longer sessions grow bigger trees.</p>
          </div>

          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Choose your tree</p>
            <div className="grid grid-cols-5 gap-2">
              {SPECIES_IDS.map((id) => {
                const unlocked = isUnlocked(id, healthyCount);
                const selected = species === id;
                return (
                  <button
                    key={id}
                    disabled={!unlocked}
                    onClick={() => chooseSpecies(id)}
                    title={unlocked ? SPECIES[id].name : `Unlocks at ${SPECIES[id].unlockAt} trees`}
                    className={`relative flex flex-col items-center rounded-xl py-1.5 border-2 transition-all duration-200
                      ${selected ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 scale-105' : 'border-transparent hover:bg-gray-50 dark:hover:bg-gray-700'}
                      ${unlocked ? '' : 'opacity-40 grayscale cursor-not-allowed'}`}
                  >
                    <Tree species={id} size={36} sway={false} />
                    <span className="text-[10px] text-gray-500 dark:text-gray-400 leading-tight">
                      {unlocked ? SPECIES[id].name.split(' ')[0] : `🔒 ${SPECIES[id].unlockAt}`}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Today's grove */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Today's grove</p>
        {todayTrees.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500 py-4">Finish a focus session to plant your first tree today 🌱</p>
        ) : (
          <div className="flex justify-center items-end gap-1 flex-wrap">
            {todayTrees.map((t, i) => (
              <Tree
                key={t.id}
                species={t.species}
                withered={t.withered}
                size={40}
                className="anim-pop"
                style={{ animationDelay: `${i * 60}ms` }}
              />
            ))}
          </div>
        )}
        <p className="text-2xl font-bold text-gray-900 dark:text-white mt-3">{todayHealthy.length}</p>
        <p className="text-xs text-gray-400 dark:text-gray-500">
          {todayHealthy.length === 1 ? 'tree' : 'trees'} · {todayMinutes} min focused
        </p>
      </div>

      {celebration && (
        <PlantCelebration
          tree={celebration}
          totalTrees={healthyCount}
          onClose={() => setCelebration(null)}
          onStartBreak={startBreak}
        />
      )}
    </div>
  );
}
