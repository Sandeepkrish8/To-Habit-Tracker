// src/components/Navbar.jsx
// Top navigation bar with route links, command bar button and dark mode toggle.

import { Link, useLocation } from 'react-router-dom';
import useDarkMode from '../hooks/useDarkMode';
import { openPalette } from '../context/palette';

const NAV_LINKS = [
  { to: '/',         label: 'Home',     icon: '🏠' },
  { to: '/calendar', label: 'Calendar', icon: '📅' },
  { to: '/pomodoro', label: 'Focus',    icon: '⏱️' },
  { to: '/forest',   label: 'Forest',   icon: '🌳' },
  { to: '/progress', label: 'Progress', icon: '🏅' },
  { to: '/insights', label: 'Insights', icon: '✨' },
];

export default function Navbar() {
  const { pathname } = useLocation();
  const [dark, setDark] = useDarkMode();

  return (
    <nav className="sticky top-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="max-w-6xl mx-auto px-2 sm:px-6 flex items-center justify-between h-16 gap-2">

        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 font-bold text-xl text-violet-600 dark:text-violet-400 tracking-tight shrink-0">
          <span className="text-2xl">✅</span>
          <span className="hidden md:inline">HabitFlow</span>
        </Link>

        {/* Nav links */}
        <div className="flex items-center gap-0.5 lg:gap-1 min-w-0">
          {NAV_LINKS.map(({ to, label, icon }) => {
            const active = pathname === to;
            return (
              <Link
                key={to}
                to={to}
                title={label}
                aria-current={active ? 'page' : undefined}
                className={`flex items-center gap-1.5 px-2 lg:px-2.5 py-2 rounded-lg text-sm font-medium transition-all duration-200
                  ${active
                    ? 'bg-violet-100 dark:bg-violet-900/50 text-violet-700 dark:text-violet-300'
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-800 dark:hover:text-gray-200'
                  }`}
              >
                <span className="text-base">{icon}</span>
                <span className="hidden lg:inline">{label}</span>
              </Link>
            );
          })}

          {/* Command bar */}
          <button
            onClick={openPalette}
            title="Command bar (Ctrl K)"
            className="hidden sm:flex items-center gap-1 ml-1 px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-xs text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
          >
            ⌘K
          </button>

          {/* Dark mode toggle */}
          <button
            onClick={() => setDark(!dark)}
            title="Toggle dark mode"
            aria-label="Toggle dark mode"
            className="ml-1 p-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-200 text-lg"
          >
            {dark ? '☀️' : '🌙'}
          </button>
        </div>
      </div>
    </nav>
  );
}
