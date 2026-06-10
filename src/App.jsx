// src/App.jsx
// Root application component — sets up layout and routing.

import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import Stats from './pages/Stats';
import Pomodoro from './pages/Pomodoro';

export default function App() {
  return (
    // min-h-screen + bg ensures the dark mode background covers the whole page
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-300">
      <Navbar />
      <main>
        <Routes>
          <Route path="/"         element={<Dashboard />} />
          <Route path="/stats"    element={<Stats />} />
          <Route path="/pomodoro" element={<Pomodoro />} />
        </Routes>
      </main>
    </div>
  );
}
