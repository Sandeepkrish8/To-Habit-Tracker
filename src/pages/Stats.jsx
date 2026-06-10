// src/pages/Stats.jsx
// Weekly stats page — bar chart of completions per day using Recharts.

import { useSelector } from 'react-redux';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, Legend
} from 'recharts';
import { selectWeeklyData, selectHabits } from '../features/habits/habitsSlice';

// Custom Recharts tooltip
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 shadow-lg text-sm">
        <p className="font-semibold text-gray-700 dark:text-gray-200 mb-1">{label}</p>
        <p className="text-violet-600 dark:text-violet-400">
          ✅ {payload[0].value} completed
        </p>
        {payload[1] && (
          <p className="text-gray-400 dark:text-gray-500">
            ⬜ {payload[1].value} remaining
          </p>
        )}
      </div>
    );
  }
  return null;
};

export default function Stats() {
  const habits = useSelector(selectHabits);
  const weeklyData = useSelector(selectWeeklyData);

  // Per-habit all-time completion rate
  const habitStats = habits.map((h) => ({
    ...h,
    rate: h.completedDates.length,
  })).sort((a, b) => b.rate - a.rate);

  // Overall completion this week
  const totalPossible = weeklyData.length * habits.length;
  const totalDone = weeklyData.reduce((sum, d) => sum + d.count, 0);
  const weekPct = totalPossible > 0 ? Math.round((totalDone / totalPossible) * 100) : 0;

  // Remaining per day for stacked bar
  const chartData = weeklyData.map((d) => ({
    ...d,
    remaining: Math.max(0, d.total - d.count),
  }));

  if (habits.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16 text-center space-y-3">
        <div className="text-6xl">📊</div>
        <p className="text-gray-500 dark:text-gray-400 font-medium">No data yet.</p>
        <p className="text-gray-400 dark:text-gray-500 text-sm">Add habits and start tracking to see your stats!</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-8">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Statistics</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Your habit performance over the last 7 days</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'This Week', value: `${weekPct}%`, emoji: '📅', sub: 'completion rate' },
          { label: 'Best Streak', value: `${Math.max(...habits.map(h => h.streak), 0)}`, emoji: '🔥', sub: 'days' },
          { label: 'Total Habits', value: habits.length, emoji: '📋', sub: 'tracked' },
        ].map(({ label, value, emoji, sub }) => (
          <div key={label} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 text-center shadow-sm">
            <div className="text-2xl mb-1">{emoji}</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{value}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{sub}</div>
          </div>
        ))}
      </div>

      {/* Weekly bar chart */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
        <h2 className="font-semibold text-gray-800 dark:text-gray-100 mb-4">Weekly Completions</h2>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} barSize={28} barCategoryGap="30%">
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.5} vertical={false} />
            <XAxis
              dataKey="day"
              tick={{ fontSize: 12, fill: '#9ca3af' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 12, fill: '#9ca3af' }}
              axisLine={false}
              tickLine={false}
              width={24}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(124,58,237,0.06)' }} />
            <Bar dataKey="count" stackId="a" fill="#7c3aed" radius={[0, 0, 0, 0]} name="Completed">
              {chartData.map((entry, index) => (
                <Cell
                  key={index}
                  fill={entry.count === entry.total && entry.total > 0 ? '#059669' : '#7c3aed'}
                />
              ))}
            </Bar>
            <Bar dataKey="remaining" stackId="a" fill="#e5e7eb" radius={[6, 6, 0, 0]} name="Remaining" />
          </BarChart>
        </ResponsiveContainer>
        <div className="flex gap-4 mt-3 text-xs text-gray-500 dark:text-gray-400">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-violet-600 inline-block" /> Completed</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-emerald-500 inline-block" /> All done!</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-gray-200 dark:bg-gray-600 inline-block" /> Remaining</span>
        </div>
      </div>

      {/* Per-habit leaderboard */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
        <h2 className="font-semibold text-gray-800 dark:text-gray-100 mb-4">Habit Leaderboard</h2>
        <div className="space-y-3">
          {habitStats.map((h, i) => (
            <div key={h.id} className="flex items-center gap-3">
              <span className="text-sm font-bold text-gray-400 dark:text-gray-500 w-5 text-right">{i + 1}</span>
              <span className="text-xl">{h.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-1">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">{h.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 ml-2 flex-shrink-0">
                    🔥 {h.streak} streak · {h.rate} total
                  </p>
                </div>
                {/* Mini progress bar */}
                <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5">
                  <div
                    className="h-1.5 rounded-full transition-all duration-500"
                    style={{
                      width: habitStats[0].rate > 0 ? `${Math.round((h.rate / habitStats[0].rate) * 100)}%` : '0%',
                      backgroundColor: h.color,
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
