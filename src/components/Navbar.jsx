// src/components/Navbar.jsx
// Top navigation bar with route links and dark mode toggle.

import { Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';

const NAV_LINKS = [
  { to: '/',         label: 'Dashboard', icon: '🏠' },
  { to: '/stats',    label: 'Stats',     icon: '📊' },
  { to: '/pomodoro', label: 'Pomodoro',  icon: '⏱️' },
];

export default function Navbar() {
  const { pathname } = useLocation();

  // Dark mode — persisted in localStorage
  const [dark, setDark] = useState(() => {
    return localStorage.getItem('habitTracker_dark') === 'true';
  });

  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('habitTracker_dark', dark);
  }, [dark]);

  return (
    <nav className="sticky top-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">

        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 font-bold text-xl text-violet-600 dark:text-violet-400 tracking-tight">
          <span className="text-2xl">✅</span>
          HabitFlow
        </Link>

        {/* Nav links */}
        <div className="flex items-center gap-1 sm:gap-2">
          {NAV_LINKS.map(({ to, label, icon }) => {
            const active = pathname === to;
            return (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200
                  ${active
                    ? 'bg-violet-100 dark:bg-violet-900/50 text-violet-700 dark:text-violet-300'
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-800 dark:hover:text-gray-200'
                  }`}
              >
                <span className="text-base">{icon}</span>
                <span className="hidden sm:inline">{label}</span>
              </Link>
            );
          })}

          {/* Dark mode toggle */}
          <button
            onClick={() => setDark((d) => !d)}
            title="Toggle dark mode"
            className="ml-2 p-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-200 text-lg"
          >
            {dark ? '☀️' : '🌙'}
          </button>
        </div>
      </div>
    </nav>
  );
}
