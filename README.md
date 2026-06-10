# 🌿 HabitFlow — Habit Tracker

A fully functional **Habit Tracker** web application built with **React + Vite**, **Redux Toolkit**, **Tailwind CSS**, and **Recharts**.

![HabitFlow](https://img.shields.io/badge/React-19-blue?logo=react) ![Redux](https://img.shields.io/badge/Redux_Toolkit-2-purple?logo=redux) ![Tailwind](https://img.shields.io/badge/Tailwind_CSS-4-teal?logo=tailwindcss) ![Vite](https://img.shields.io/badge/Vite-8-yellow?logo=vite)

---

## ✨ Features

- ✅ **Add, delete & toggle habits** — mark habits done/undone each day
- 🔥 **Streak counter** — consecutive days completed, auto-calculated
- ⏱️ **Pomodoro Timer** — 25 min work / 5 min break with an animated SVG ring, audio beep, and session counter
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
│   └── habits/
│       └── habitsSlice.js    # Redux slice (actions, reducers, selectors)
├── components/
│   ├── Navbar.jsx            # Navigation + dark mode toggle
│   └── HabitCard.jsx         # Single habit card (toggle, streak, delete)
├── pages/
│   ├── Dashboard.jsx         # Main page — add & manage habits
│   ├── Stats.jsx             # Weekly bar chart + habit breakdown
│   └── Pomodoro.jsx          # Focus timer with animated ring
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
| Pomodoro | `/pomodoro` | Focus timer with 25/5 min cycles |

---

## 📜 License

MIT — free to use and modify.
