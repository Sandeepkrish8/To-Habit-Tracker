// src/components/CommandPalette.jsx
// Ctrl+K / ⌘K command bar, like VS Code: jump to pages, start focus sessions,
// tick off habits, add a habit, or switch theme — all from the keyboard.

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useDispatch, useSelector } from 'react-redux';
import useFullscreenElement from '../hooks/useFullscreenElement';
import { useNavigate } from 'react-router-dom';
import { addHabit, toggleHabit, selectRawHabits } from '../features/habits/habitsSlice';
import { FOCUS_OPTIONS, selectFocus, startFocus, start, pause } from '../features/focus/focusSlice';
import { useToast } from '../context/toast';
import useDarkMode from '../hooks/useDarkMode';
import { fuzzyMatch } from '../utils/fuzzy';
import { todayStr } from '../utils/date';
import { OPEN_PALETTE_EVENT } from '../context/palette';

const PAGES = [
  { to: '/',         icon: '🏠', title: 'Go to Home' },
  { to: '/calendar', icon: '📅', title: 'Go to Calendar' },
  { to: '/pomodoro', icon: '⏱️', title: 'Go to Focus' },
  { to: '/forest',   icon: '🌳', title: 'Go to Forest' },
  { to: '/progress', icon: '🏅', title: 'Go to Progress & badges' },
  { to: '/insights', icon: '✨', title: 'Evening check-in & insights' },
  { to: '/wrapped',  icon: '🎁', title: 'Monthly Wrapped' },
  { to: '/stats',    icon: '📊', title: 'Weekly stats' },
  { to: '/newtab',   icon: '🗂️', title: 'New tab view' },
];

/** Highlights the matched letters in bold */
function Highlight({ text, indices }) {
  const set = new Set(indices);
  return (
    <span>
      {[...text].map((ch, i) => (set.has(i) ? <b key={i} className="text-gray-900 dark:text-white">{ch}</b> : ch))}
    </span>
  );
}

function Palette({ onClose }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const toast = useToast();
  const habits = useSelector(selectRawHabits);
  const focus = useSelector(selectFocus);
  const [dark, setDark] = useDarkMode();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const listRef = useRef(null);

  const commands = useMemo(() => {
    const today = todayStr();
    const go = (to) => () => navigate(to);
    const list = [
      ...FOCUS_OPTIONS.map((m) => ({
        id: `focus-${m}`, icon: '⏱️', title: `Start focus · ${m} min`, group: 'Focus',
        run: () => { dispatch(startFocus(m)); navigate('/pomodoro'); },
      })),
      ...(focus.endAt !== null
        ? [{ id: 'pause', icon: '❚❚', title: 'Pause focus', group: 'Focus', run: () => dispatch(pause()) }]
        : focus.mode === 'work' && focus.remaining < focus.focusMinutes * 60
          ? [{ id: 'resume', icon: '▶', title: 'Resume focus', group: 'Focus', run: () => dispatch(start()) }]
          : []),
      ...habits
        .filter((h) => !h.completedDates.includes(today))
        .map((h) => ({
          id: `done-${h.id}`, icon: '✅', title: `Mark done · ${h.name}`, group: 'Habits',
          run: () => {
            dispatch(toggleHabit(h.id));
            toast.show({ icon: '✅', message: `Marked "${h.name}" done` });
          },
        })),
      { id: 'review', icon: '🌙', title: 'Review your day (swipe)', group: 'Habits', run: go('/?review=1') },
      ...PAGES.map((p) => ({ id: p.to, icon: p.icon, title: p.title, group: 'Pages', run: go(p.to) })),
      { id: 'theme', icon: dark ? '☀️' : '🌙', title: dark ? 'Switch to light mode' : 'Switch to dark mode', group: 'Settings', run: () => setDark(!dark) },
    ];
    return list;
  }, [habits, focus, dark, dispatch, navigate, setDark, toast]);

  const results = useMemo(() => {
    const matched = commands
      .map((c) => ({ ...c, match: fuzzyMatch(query, c.title) }))
      .filter((c) => c.match)
      .sort((a, b) => b.match.score - a.match.score);

    // No exact habit with this name? Offer to create it.
    const name = query.trim();
    if (name.length >= 2 && !habits.some((h) => h.name.toLowerCase() === name.toLowerCase())) {
      matched.push({
        id: 'add', icon: '➕', title: `Add habit "${name}"`, group: 'Habits', match: { indices: [] },
        run: () => {
          dispatch(addHabit({ name }));
          toast.show({ icon: '➕', message: `Added "${name}"` });
          navigate('/');
        },
      });
    }
    return matched.slice(0, 8);
  }, [commands, query, habits, dispatch, navigate, toast]);

  const selected = Math.min(active, Math.max(0, results.length - 1));

  const runAt = (i) => {
    const cmd = results[i];
    if (!cmd) return;
    onClose();
    cmd.run();
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((selected + 1) % Math.max(1, results.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((selected - 1 + results.length) % Math.max(1, results.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      runAt(selected);
    } else if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'Tab') {
      e.preventDefault(); // keep focus in the input
    }
  };

  // Keep the highlighted option scrolled into view
  useEffect(() => {
    listRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [selected]);

  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center pt-[12vh] px-4" role="presentation">
      <div className="absolute inset-0 bg-gray-950/40 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command bar"
        className="anim-fade-up relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
      >
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-100 dark:border-gray-800">
          <span className="text-gray-400" aria-hidden="true">⌘</span>
          <input
            autoFocus
            value={query}
            onChange={(e) => { setQuery(e.target.value); setActive(0); }}
            onKeyDown={onKeyDown}
            placeholder='Try "focus 45", "done read", or a new habit name…'
            className="flex-1 bg-transparent text-base text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none"
            role="combobox"
            aria-expanded="true"
            aria-controls="palette-list"
            aria-activedescendant={results[selected] ? `cmd-${results[selected].id}` : undefined}
            aria-autocomplete="list"
          />
          <kbd className="text-[11px] text-gray-400 border border-gray-200 dark:border-gray-700 rounded-md px-1.5 py-0.5">esc</kbd>
        </div>

        <ul id="palette-list" ref={listRef} role="listbox" className="max-h-80 overflow-y-auto p-1.5">
          {results.length === 0 && <li className="px-3 py-6 text-center text-sm text-gray-400">No matches</li>}
          {results.map((c, i) => (
            <li
              key={c.id}
              id={`cmd-${c.id}`}
              role="option"
              aria-selected={i === selected}
              onMouseMove={() => setActive(i)}
              onClick={() => runAt(i)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm cursor-pointer
                ${i === selected ? 'bg-emerald-50 dark:bg-emerald-950/50 text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-300'}`}
            >
              <span className="w-5 text-center" aria-hidden="true">{c.icon}</span>
              <span className="flex-1 truncate"><Highlight text={c.title} indices={c.match.indices} /></span>
              <span className="text-[11px] text-gray-400">{c.group}</span>
              {i === selected && <kbd className="text-[11px] text-gray-400 border border-gray-200 dark:border-gray-700 rounded-md px-1.5">↵</kbd>}
            </li>
          ))}
        </ul>

        <div className="hidden sm:flex gap-4 px-4 py-2 border-t border-gray-100 dark:border-gray-800 text-[11px] text-gray-400">
          <span>↑ ↓ navigate</span><span>↵ select</span><span>esc close</span>
        </div>
      </div>
    </div>
  );
}

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const returnFocus = useRef(null);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault(); // browsers use Ctrl+K for the address bar search
        returnFocus.current = document.activeElement;
        setOpen((o) => !o);
      }
    };
    const onOpen = () => {
      returnFocus.current = document.activeElement;
      setOpen(true);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener(OPEN_PALETTE_EVENT, onOpen);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener(OPEN_PALETTE_EVENT, onOpen);
    };
  }, []);

  const fullscreenEl = useFullscreenElement();

  const close = () => {
    setOpen(false);
    returnFocus.current?.focus?.();
  };

  // Inside the fullscreen focus room only that element is visible, so render there
  return open ? createPortal(<Palette onClose={close} />, fullscreenEl ?? document.body) : null;
}
