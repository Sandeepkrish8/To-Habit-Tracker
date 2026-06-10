// src/pages/Pomodoro.jsx
// Focus timer: 25-min work sessions + 5-min breaks, with visual countdown ring.

import { useState, useEffect, useRef, useCallback } from 'react';

const MODES = {
  work:  { label: 'Focus',       duration: 25 * 60, color: '#7c3aed', emoji: '💪' },
  break: { label: 'Short Break', duration:  5 * 60, color: '#059669', emoji: '☕' },
  long:  { label: 'Long Break',  duration: 15 * 60, color: '#2563eb', emoji: '🧘' },
};

// SVG ring constants
const RADIUS = 88;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function pad(n) { return String(n).padStart(2, '0'); }

export default function Pomodoro() {
  const [mode, setMode] = useState('work');
  const [timeLeft, setTimeLeft] = useState(MODES.work.duration);
  const [running, setRunning] = useState(false);
  const [sessions, setSessions] = useState(0);
  const intervalRef = useRef(null);
  const audioCtxRef = useRef(null);

  const { duration, color, label, emoji } = MODES[mode];
  const progress = timeLeft / duration;
  const strokeDash = CIRCUMFERENCE * progress;

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

  // Countdown tick
  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((t) => {
          if (t <= 1) {
            clearInterval(intervalRef.current);
            setRunning(false);
            playBeep();
            if (mode === 'work') setSessions((s) => s + 1);
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    }
    return () => clearInterval(intervalRef.current);
  }, [running, mode, playBeep]);

  // Switch mode
  const switchMode = (newMode) => {
    clearInterval(intervalRef.current);
    setRunning(false);
    setMode(newMode);
    setTimeLeft(MODES[newMode].duration);
  };

  // Reset
  const handleReset = () => {
    clearInterval(intervalRef.current);
    setRunning(false);
    setTimeLeft(duration);
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div className="max-w-md mx-auto px-4 sm:px-6 py-8 space-y-8">

      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Pomodoro Timer</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Stay focused. Take breaks. Build momentum.</p>
      </div>

      {/* Mode selector */}
      <div className="flex gap-2 bg-gray-100 dark:bg-gray-800 rounded-2xl p-1">
        {Object.entries(MODES).map(([key, { label, emoji }]) => (
          <button
            key={key}
            onClick={() => switchMode(key)}
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

      {/* SVG countdown ring */}
      <div className="flex flex-col items-center">
        <div className="relative">
          <svg width="220" height="220" className="rotate-[-90deg]">
            {/* Track */}
            <circle
              cx="110" cy="110" r={RADIUS}
              fill="none"
              stroke="currentColor"
              strokeWidth="10"
              className="text-gray-200 dark:text-gray-700"
            />
            {/* Progress arc */}
            <circle
              cx="110" cy="110" r={RADIUS}
              fill="none"
              stroke={color}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={`${strokeDash} ${CIRCUMFERENCE}`}
              style={{ transition: 'stroke-dasharray 0.5s ease' }}
            />
          </svg>

          {/* Time display inside ring */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-lg mb-1">{emoji}</span>
            <span className="text-5xl font-bold tabular-nums text-gray-900 dark:text-white tracking-tight">
              {pad(minutes)}:{pad(seconds)}
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-400 mt-1 font-medium">{label}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={handleReset}
            className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center justify-center text-xl transition-all duration-200"
            title="Reset"
          >
            ↺
          </button>

          <button
            onClick={() => setRunning((r) => !r)}
            className="px-8 py-3 rounded-full text-white text-lg font-semibold shadow-lg transition-all duration-200 active:scale-95"
            style={{
              backgroundColor: color,
              boxShadow: `0 8px 24px ${color}55`,
            }}
          >
            {running ? '⏸ Pause' : '▶ Start'}
          </button>

          <button
            onClick={() => switchMode(mode === 'work' ? 'break' : 'work')}
            className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center justify-center text-xl transition-all duration-200"
            title="Skip"
          >
            ⏭
          </button>
        </div>
      </div>

      {/* Session counter */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Focus sessions completed today</p>
        <div className="flex justify-center gap-2 flex-wrap">
          {Array.from({ length: Math.max(sessions, 4) }).map((_, i) => (
            <div
              key={i}
              className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg transition-all duration-300
                ${i < sessions ? 'bg-violet-100 dark:bg-violet-950 scale-110' : 'bg-gray-100 dark:bg-gray-700'}`}
            >
              {i < sessions ? '🍅' : '⚪'}
            </div>
          ))}
        </div>
        <p className="text-2xl font-bold text-gray-900 dark:text-white mt-3">{sessions}</p>
        <p className="text-xs text-gray-400 dark:text-gray-500">{sessions === 1 ? 'session' : 'sessions'} · {sessions * 25} min focused</p>
      </div>

      {/* Tips */}
      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-2xl p-4 text-sm text-amber-700 dark:text-amber-400">
        <p className="font-semibold mb-1">💡 Pomodoro Technique</p>
        <p className="text-amber-600 dark:text-amber-500 text-xs leading-relaxed">
          Work for 25 minutes, then take a 5-minute break. After 4 sessions, take a 15-minute long break. Repeat!
        </p>
      </div>
    </div>
  );
}
