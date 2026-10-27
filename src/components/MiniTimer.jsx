// src/components/MiniTimer.jsx
// Compact timer rendered inside the Picture-in-Picture window, so it floats
// above other apps (like VS Code) while you study.

import { useDispatch, useSelector } from 'react-redux';
import Tree from './Tree';
import useNow from '../hooks/useNow';
import { MODES, durationOf, timeLeftAt, selectFocus, start, pause } from '../features/focus/focusSlice';

const pad = (n) => String(n).padStart(2, '0');

export default function MiniTimer() {
  const dispatch = useDispatch();
  const timer = useSelector(selectFocus);
  const running = timer.endAt !== null;
  const now = useNow(running, 250);
  const timeLeft = timeLeftAt(timer, now);
  const duration = durationOf(timer.mode, timer.focusMinutes);
  const { color, emoji, label } = MODES[timer.mode];

  return (
    <div className="h-screen flex items-center gap-4 px-4 bg-gray-950 text-white select-none">
      {timer.mode === 'work'
        ? <Tree species={timer.species} growth={1 - timeLeft / duration} size={56} sway={running} />
        : <span className="text-4xl">{emoji}</span>}
      <div className="flex-1 min-w-0">
        <p className="text-3xl font-bold tabular-nums">{pad(Math.floor(timeLeft / 60))}:{pad(timeLeft % 60)}</p>
        <p className="text-xs text-gray-400 truncate">{timer.label || label}</p>
      </div>
      <button
        onClick={() => dispatch(running ? pause() : start())}
        className="w-11 h-11 rounded-full text-lg font-bold"
        style={{ backgroundColor: color }}
        aria-label={running ? 'Pause' : 'Start'}
      >
        {running ? '❚❚' : '▶'}
      </button>
    </div>
  );
}
