# 🌿 HabitFlow — Habit Tracker

A fully functional **Habit Tracker** web application built with **React + Vite**, **Redux Toolkit**, **Tailwind CSS**, and **Recharts**.

![HabitFlow](https://img.shields.io/badge/React-19-blue?logo=react) ![Redux](https://img.shields.io/badge/Redux_Toolkit-2-purple?logo=redux) ![Tailwind](https://img.shields.io/badge/Tailwind_CSS-4-teal?logo=tailwindcss) ![Vite](https://img.shields.io/badge/Vite-8-yellow?logo=vite)

---

## ✨ Features

- ✅ **Add, delete & toggle habits** — mark habits done/undone each day
- 🔥 **Streak counter** — consecutive days completed, auto-calculated
- 🌳 **Focus Forest** — every finished focus session (25 / 45 / 60 min) plants a tree; give up halfway and it withers
- 🌱 **Growing tree timer** — watch your tree grow inside the countdown ring; the timer survives page switches and reloads
- 🔓 **Unlockable species** — Oak → Pine → Cherry Blossom → Maple → Golden Tree as your forest grows
- 🗓️ **Forest views** — browse trees by day, week, month, year, or all time, plus a year-at-a-glance heatmap
- 📊 **Weekly Stats** — stacked bar chart (Recharts) of daily completions + habit leaderboard
- 🌙 **Dark mode toggle** — persisted in localStorage
- 💾 **localStorage persistence** — all data survives page refreshes
- 📱 **Responsive design** — works on mobile & desktop

---

## 🛠️ Tech Stack

| Technology | Purpose |
|---|---|
| React 19 + Vite | UI framework & build tool |
| Redux Toolkit | Global state management |
| React Router DOM v7 | Client-side routing |
| Tailwind CSS v4 | Utility-first styling |
| Recharts | Charts & data visualization |
| uuid | Unique habit IDs |
| localStorage | Data persistence |

---

## 📁 Project Structure

```
src/
├── app/
│   └── store.js              # Redux store + localStorage middleware
├── features/
│   ├── habits/
│   │   └── habitsSlice.js    # Redux slice (actions, reducers, selectors)
│   └── forest/
│       ├── forestSlice.js    # Planted / withered trees from focus sessions
│       └── species.js        # Tree species + unlock thresholds
├── components/
│   ├── Navbar.jsx            # Navigation + dark mode toggle
│   ├── HabitCard.jsx         # Single habit card (toggle, streak, delete)
│   ├── Tree.jsx              # Animated SVG tree (grows, sways, withers)
│   └── PlantCelebration.jsx  # "Tree planted!" celebration overlay
├── pages/
│   ├── Dashboard.jsx         # Main page — add & manage habits
│   ├── Stats.jsx             # Weekly bar chart + habit breakdown
│   ├── Pomodoro.jsx          # Focus timer that grows a tree
│   └── Forest.jsx            # Your forest by day/week/month/year + heatmap
├── utils/
│   └── date.js               # Local-time "YYYY-MM-DD" helpers
├── App.jsx                   # Root layout + React Router routes
├── main.jsx                  # Entry point (Provider + BrowserRouter)
└── index.css                 # Tailwind imports + dark mode variant
```

---

## 🚀 Getting Started

```bash
# Clone the repo
git clone https://github.com/Sandeepkrish8/To-Habit-Tracker.git
cd To-Habit-Tracker

# Install dependencies
npm install

# Start the dev server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 📸 Pages

| Page | Route | Description |
|---|---|---|
| Dashboard | `/` | Add habits, mark done, view daily progress |
| Statistics | `/stats` | Weekly bar chart + per-habit completion |
| Focus | `/pomodoro` | Focus timer that grows a tree (25/45/60 min) |
| Forest | `/forest` | All your trees by day/week/month/year + heatmap |

---

## 📜 License

MIT — free to use and modify.
