// src/App.jsx
// Root application component — sets up layout, global engines and routing.

import { Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import ToastProvider from './components/ToastProvider';
import FocusEngine from './components/FocusEngine';
import AchievementWatcher from './components/AchievementWatcher';
import CommandPalette from './components/CommandPalette';
import Dashboard from './pages/Dashboard';
import Calendar from './pages/Calendar';
import Stats from './pages/Stats';
import Pomodoro from './pages/Pomodoro';
import Forest from './pages/Forest';
import Progress from './pages/Progress';
import Insights from './pages/Insights';
import Wrapped from './pages/Wrapped';
import NewTab from './pages/NewTab';
import AICoach from './pages/AICoach';

export default function App() {
  const { pathname } = useLocation();
  const isNewTab = pathname === '/newtab';

  return (
    <ToastProvider>
      {/* FocusEngine runs the timer on every page; AchievementWatcher announces new badges */}
      <FocusEngine>
        <AchievementWatcher />
        {/* min-h-screen + bg ensures the dark mode background covers the whole page */}
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-300">
          {!isNewTab && <Navbar />}
          <main>
            <Routes>
              <Route path="/"         element={<Dashboard />} />
              <Route path="/calendar" element={<Calendar />} />
              <Route path="/stats"    element={<Stats />} />
              <Route path="/pomodoro" element={<Pomodoro />} />
              <Route path="/forest"   element={<Forest />} />
              <Route path="/progress" element={<Progress />} />
              <Route path="/insights" element={<Insights />} />
              <Route path="/wrapped"  element={<Wrapped />} />
              <Route path="/newtab"   element={<NewTab />} />
              <Route path="/coach"    element={<AICoach />} />
            </Routes>
          </main>
        </div>
        <CommandPalette />
      </FocusEngine>
    </ToastProvider>
  );
}
