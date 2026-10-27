// src/pages/Pomodoro.jsx
// Focus timer that grows a tree. Finish a focus session → the tree is planted
// in your forest. Give up halfway → the tree withers.
//
// The timer itself runs in Redux + <FocusEngine>, so this page is only the
// controls: label, sounds, fullscreen "focus room", strict mode and mini timer.

import { useEffect, useEffectEvent, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Tree from '../components/Tree';
import useNow from '../hooks/useNow';
import useFullscreenElement from '../hooks/useFullscreenElement';
import { useFocusUI } from '../context/focusUI';
import { witherTree, selectTrees, selectHealthyCount } from '../features/forest/forestSlice';
import { SPECIES, SPECIES_IDS, isUnlocked } from '../features/forest/species';
import {
  MODES, FOCUS_OPTIONS, durationOf, timeLeftAt, selectFocus,
  setMode, setFocusMinutes, setSpecies, setLabel, setStrict, setSound, setVolume,
  start, pause, reset,
} from '../features/focus/focusSlice';
import { SOUNDS } from '../services/ambientAudio';
import { todayStr } from '../utils/date';

// SVG ring constants
const RING_SIZE = 260;
const RADIUS = 118;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function pad(n) { return String(n).padStart(2, '0'); }

/** Is the user typing somewhere? Then keyboard shortcuts must stay quiet. */
const isTyping = (el) => el?.closest?.('input, textarea, select, [contenteditable="true"], [role="dialog"]');

export default function Pomodoro() {
  const dispatch = useDispatch();
  const timer = useSelector(selectFocus);
  const trees = useSelector(selectTrees);
  const healthyCount = useSelector(selectHealthyCount);
  const { pipSupported, pipOpen, openMiniTimer, closeMiniTimer, previewSound } = useFocusUI();

  const roomRef = useRef(null);
  const fullscreen = useFullscreenElement()?.id === 'focus-room';

  const { mode, focusMinutes, species, label, endAt, strict, sound, volume } = timer;
  const running = endAt !== null;
  const now = useNow(running, 250);
  const duration = durationOf(mode, focusMinutes);
  const timeLeft = timeLeftAt(timer, now);
  const { color, emoji, label: modeLabel } = MODES[mode];
  const progress = timeLeft / duration;
  const strokeDash = CIRCUMFERENCE * progress;
  // A focus session is "in progress" from the moment it starts until it ends or is reset
  const inProgress = mode === 'work' && (running || timeLeft < duration);

  const today = todayStr();
  const todayTrees = trees.filter((t) => t.date === today);
  const todayHealthy = todayTrees.filter((t) => !t.withered);
  const todayMinutes = todayHealthy.reduce((sum, t) => sum + t.minutes, 0);

  /**
   * Leaving a focus session early withers its tree. Returns false if the user
   * changes their mind and wants to keep focusing.
   */
  const confirmGiveUp = () => {
    if (!inProgress) return true;
    const ok = window.confirm('Give up this focus session? Your growing tree will wither 🥀');
    if (ok) {
      const minutesSpent = Math.floor((duration - timeLeft) / 60);
      dispatch(witherTree({ species, minutes: minutesSpent, label }));
    }
    return ok;
  };

  const togglePlay = () => dispatch(running ? pause() : start());

  const switchMode = (newMode) => {
    if (newMode === mode || !confirmGiveUp()) return;
    dispatch(setMode(newMode));
  };

  const handleReset = () => {
    if (confirmGiveUp()) dispatch(reset());
  };

  const chooseSound = (id) => {
    const next = sound === id ? null : id;
    dispatch(setSound(next));
    if (next && !running) previewSound(); // hear it before you start
  };

  // ── Fullscreen focus room (Fullscreen API) ─────────────────────────────────
  const toggleFullscreen = () => {
    // Both return promises that reject if the browser refuses (e.g. inside some iframes)
    const request = document.fullscreenElement
      ? document.exitFullscreen()
      : roomRef.current?.requestFullscreen?.();
    request?.catch(() => {});
  };

  // ── Keyboard shortcuts: Space = start/pause, F = fullscreen ────────────────
  const onKeyDown = useEffectEvent((e) => {
    if (e.ctrlKey || e.metaKey || e.altKey || isTyping(e.target)) return;
    if (e.key === ' ' && !e.target.closest?.('button')) {
      e.preventDefault();
      togglePlay();
    } else if (e.key === 'f' || e.key === 'F') {
      toggleFullscreen();
    }
  });

  useEffect(() => {
    const handler = (e) => onKeyDown(e);
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  const chip = (active) =>
    `inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-200
     ${active
       ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30'
       : fullscreen
         ? 'bg-white/10 text-slate-200 hover:bg-white/20'
         : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'}`;

  return (
    <div className="max-w-md mx-auto px-4 sm:px-6 py-8 space-y-6">

      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Focus Forest</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
          Stay focused and your tree grows. Give up and it withers.
        </p>
      </div>

      {/* ── The focus room: this block goes fullscreen ── */}
      <div
        ref={roomRef}
        id="focus-room"
        className={fullscreen
          ? 'flex flex-col items-center justify-center gap-6 p-6 overflow-auto text-white bg-[radial-gradient(ellipse_at_50%_40%,#064e3b,#022c22_55%,#020617)]'
          : 'space-y-6'}
      >
        {/* Mode selector */}
        <div className={`flex gap-2 rounded-2xl p-1 ${fullscreen ? 'bg-white/5 w-full max-w-md' : 'bg-gray-100 dark:bg-gray-800'}`}>
          {Object.entries(MODES).map(([key, m]) => (
            <button
              key={key}
              onClick={() => switchMode(key)}
              className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all duration-200
                ${mode === key
                  ? fullscreen ? 'bg-white/15 text-white' : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : fullscreen ? 'text-slate-400 hover:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
            >
              {m.emoji} {m.label}
            </button>
          ))}
        </div>

        {/* What are you focusing on? — saved with the tree */}
        {mode === 'work' && (
          <label className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl border w-full max-w-md mx-auto
            ${fullscreen ? 'bg-white/5 border-white/10' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'}`}>
            <span aria-hidden="true">📖</span>
            <span className="sr-only">What are you focusing on?</span>
            <input
              value={label}
              onChange={(e) => dispatch(setLabel(e.target.value))}
              placeholder="What are you focusing on?"
              maxLength={60}
              className={`flex-1 bg-transparent text-sm focus:outline-none ${fullscreen ? 'text-white placeholder-slate-500' : 'text-gray-800 dark:text-gray-100 placeholder-gray-400'}`}
            />
          </label>
        )}

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
                className={fullscreen ? 'text-white/10' : 'text-gray-200 dark:text-gray-700'}
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
              <span className={`text-4xl font-bold tabular-nums tracking-tight ${fullscreen ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                {pad(minutes)}:{pad(seconds)}
              </span>
              <span className={`text-xs mt-0.5 font-medium ${fullscreen ? 'text-emerald-300' : 'text-gray-500 dark:text-gray-400'}`}>
                {mode === 'work' ? `of ${focusMinutes}:00 · ${SPECIES[species].name}` : modeLabel}
              </span>
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
              onClick={togglePlay}
              className="px-8 py-3 rounded-full text-white text-lg font-semibold shadow-lg transition-all duration-200 active:scale-95 hover:-translate-y-0.5"
              style={{
                backgroundColor: color,
                boxShadow: `0 8px 24px ${color}55`,
              }}
            >
              {running ? '❚❚ Pause' : inProgress ? '▶ Resume' : mode === 'work' ? '🌱 Plant' : '▶ Start'}
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

        {/* Ambient sound dock */}
        <div className={`rounded-2xl p-3 space-y-3 w-full max-w-md mx-auto
          ${fullscreen ? 'bg-slate-900/70 border border-white/10' : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm'}`}>
          <div className="flex flex-wrap gap-2 justify-center">
            {SOUNDS.map((s) => {
              const active = sound === s.id;
              return (
                <button key={s.id} onClick={() => chooseSound(s.id)} className={chip(active)} aria-pressed={active}>
                  <span aria-hidden="true">{s.icon}</span> {s.label}
                  {active && (
                    <span className="flex items-end gap-0.5 h-3 ml-0.5" aria-hidden="true">
                      {[0, 0.2, 0.4].map((d) => (
                        <i key={d} className="anim-eq w-0.5 h-full rounded bg-current" style={{ animationDelay: `${d}s`, animationPlayState: running ? 'running' : 'paused' }} />
                      ))}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <label className={`flex items-center gap-3 px-1 text-sm ${fullscreen ? 'text-slate-300' : 'text-gray-500 dark:text-gray-400'}`}>
            <span aria-hidden="true">🔊</span>
            <span className="sr-only">Volume</span>
            <input
              type="range" min="0" max="1" step="0.05"
              value={volume}
              onChange={(e) => dispatch(setVolume(Number(e.target.value)))}
              className="flex-1 accent-emerald-500"
            />
          </label>
          <p className={`text-[11px] text-center ${fullscreen ? 'text-slate-500' : 'text-gray-400 dark:text-gray-500'}`}>
            Sounds play while the timer runs · made live in your browser
          </p>
        </div>

        {/* Focus tools */}
        <div className="flex flex-wrap justify-center gap-2">
          {pipSupported && (
            <button onClick={pipOpen ? closeMiniTimer : openMiniTimer} className={chip(pipOpen)}>
              ⧉ {pipOpen ? 'Close mini timer' : 'Mini timer'}
            </button>
          )}
          <button onClick={toggleFullscreen} className={chip(fullscreen)}>
            ⤢ {fullscreen ? 'Exit focus room' : 'Focus room'}
          </button>
          <button
            onClick={() => dispatch(setStrict(!strict))}
            className={chip(strict)}
            aria-pressed={strict}
            title="Leaving this tab pauses your tree"
          >
            🔒 Strict mode
          </button>
        </div>
        <p className={`text-[11px] text-center ${fullscreen ? 'text-slate-500' : 'text-gray-400 dark:text-gray-500'}`}>
          <kbd className="font-sans">Space</kbd> start/pause · <kbd className="font-sans">F</kbd> focus room
          {strict && ' · strict: leaving the tab pauses your tree'}
        </p>
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
                  onClick={() => dispatch(setFocusMinutes(m))}
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
                    onClick={() => dispatch(setSpecies(id))}
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
    </div>
  );
}
