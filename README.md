# 🌿 HabitFlow — Habit Tracker

A habit tracker that feels alive: your habits water a forest, focus sessions plant trees, and the sky changes with your consistency. Built with **React + Vite**, **Redux Toolkit**, **Tailwind CSS**, and **Recharts**. Works offline, keeps all data in your browser, and installs as a Chrome new tab.

![HabitFlow](https://img.shields.io/badge/React-19-blue?logo=react) ![Redux](https://img.shields.io/badge/Redux_Toolkit-2-purple?logo=redux) ![Tailwind](https://img.shields.io/badge/Tailwind_CSS-4-teal?logo=tailwindcss) ![Vite](https://img.shields.io/badge/Vite-8-yellow?logo=vite)

---

## ✨ Features

**Habits**
- 🌤️ **Living forest home** — the sky follows your clock (dawn, day, sunset, night with stars) and the weather follows your consistency: ☀️ on track · ⛅ 1–2 missed days · 🌧️ 3+
- 👆 **Hold-to-complete** — press & hold to tick a habit: a ring fills, confetti bursts, +10 XP, your phone vibrates, and a 💧 water drop flies into a tree. Every check-in has an **Undo** toast
- 📅 **Calendar & backfill** — month view with a dot per habit, 🌸 perfect days, tap any past day to fix it, swipe to change month, 6-month heatmap
- 🧊 **Streak freezes** — protect your streaks on a sick day; earn one for every 7 perfect days
- 🔥 **Streaks** — always correct, calculated fresh from your history

**Focus**
- 🌳 **Focus Forest** — every finished focus session (25 / 45 / 60 min) plants a tree; give up halfway and it withers
- 🎧 **Focus room** — fullscreen mode, ambient sounds generated live with the Web Audio API (rain, birds, café, fire), a label for what you're studying
- ⧉ **Mini timer** — a floating Picture-in-Picture timer that stays on top of other apps
- 🔒 **Strict mode** — leaving the tab pauses your tree
- ⌨️ **Shortcuts** — <kbd>Space</kbd> start/pause, <kbd>F</kbd> focus room, <kbd>Ctrl</kbd>+<kbd>K</kbd> command bar

**Progress**
- 🏅 **Levels, XP & badges** — 8 badges (7-Day Flame, Early Bird, Deep Diver…), level-up toasts, and a weekly challenge
- ✨ **Mood check-ins & insights** — a 10-second evening check-in; after 14 days HabitFlow finds patterns like "sleep 7h+ → 34% more habits done" and your best focus hours — all computed on your device
- 🎁 **Monthly Wrapped** — Spotify-Wrapped-style story cards; save as PNG or share
- 📊 **Weekly stats** — stacked bar chart of daily completions + habit leaderboard

**Everywhere**
- ⌘ **Command bar** — <kbd>Ctrl</kbd>+<kbd>K</kbd> anywhere: "focus 45", "done read", "add habit drink water", switch theme
- 🗂️ **Chrome new tab** — install as an extension to see your habits, timer and forest on every new tab
- 🌙 Dark mode · 📱 responsive · ♿ keyboard accessible · respects "reduce motion"

---

## 🛠️ Tech Stack

| Technology | Purpose |
|---|---|
| React 19 + Vite | UI framework & build tool |
| Redux Toolkit | Global state (`createSlice`, `createSelector`, `prepare` callbacks) |
| React Router DOM v7 | Client-side routing (Browser router on the web, Hash router in the extension) |
| Tailwind CSS v4 | Utility-first styling |
| Recharts | Charts & data visualization |
| html-to-image | Exporting Wrapped cards as PNG |
| Web APIs | Web Audio, Fullscreen, Page Visibility, Document Picture-in-Picture, Web Share, Vibration, Web Animations |
| localStorage | Data persistence |

---

## 📁 Project Structure

```
src/
├── app/
│   └── store.js                # Redux store + localStorage middleware
├── features/
│   ├── habits/                 # Habits, backfill, streak freezes, derived streaks, weather
│   ├── forest/                 # Planted / withered trees + species unlocks
│   ├── focus/                  # The focus timer (runs on every page)
│   ├── journal/                # Evening check-ins + on-device insights
│   └── achievements/           # XP, levels, badges, weekly challenge
├── components/
│   ├── ForestScene.jsx         # Living sky/weather scene + flying water drops
│   ├── HabitCard.jsx           # Hold-to-complete habit card
│   ├── FocusEngine.jsx         # Global timer, sounds, strict mode, PiP mini timer
│   ├── CommandPalette.jsx      # Ctrl+K command bar with fuzzy search
│   ├── AchievementWatcher.jsx  # Badge / level-up / challenge toasts
│   ├── ToastProvider.jsx       # Toast queue (Undo, badges, notices)
│   ├── Tree.jsx                # Animated SVG tree (grows, sways, withers)
│   └── …
├── hooks/                      # useHoldToConfirm, useCountUp, useNow, useDarkMode
├── pages/                      # Dashboard, Calendar, Pomodoro, Forest, Progress,
│                               # Insights, Wrapped, NewTab, Stats, AICoach
├── services/
│   ├── ambientAudio.js         # Web Audio sound generator
│   └── claudeAPI.js            # AI Coach
└── utils/                      # date, storage, fuzzy search
extension/
└── manifest.json               # Chrome extension (Manifest V3)
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

### 🗂️ Install as your Chrome new tab

```bash
npm run build:extension
```

1. Open `chrome://extensions` and turn on **Developer mode**
2. Click **Load unpacked** and pick the `dist-extension` folder
3. Open a new tab 🌳

> The extension keeps its own copy of your data (each site/extension gets its own browser storage), so habits you add on the website won't appear in the extension and vice versa.
>
> Keep `.env` out of extension builds you share: `VITE_` variables (like the AI Coach key) are bundled into the JavaScript.

---

## 📸 Pages

| Page | Route | Description |
|---|---|---|
| Home | `/` | Living forest, today's progress, hold-to-complete habits |
| Calendar | `/calendar` | Month view, backfill past days, streak freezes, 6-month heatmap |
| Focus | `/pomodoro` | Timer that grows a tree, focus room, sounds, mini timer |
| Forest | `/forest` | All your trees by day/week/month/year + heatmap |
| Progress | `/progress` | Level, XP, badges, weekly challenge |
| Insights | `/insights` | Evening check-in + patterns in your data |
| Wrapped | `/wrapped` | Monthly story cards to save or share |
| Statistics | `/stats` | Weekly bar chart + per-habit completion |
| New tab | `/newtab` | Clock, habits, focus and forest — the extension's new tab |
| AI Coach | `/coach` | Chat with an AI habit coach |

---

## 📜 License

MIT — free to use and modify.
