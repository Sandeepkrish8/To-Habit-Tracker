// src/features/habits/sky.js
// Sky colors for the time of day, shared by the 2D scene and the 3D island.

export const phaseOf = (hour) =>
  hour >= 5 && hour < 7 ? 'dawn' : hour >= 7 && hour < 17 ? 'day' : hour >= 17 && hour < 20 ? 'sunset' : 'night';

export const SKIES = {
  dawn:   'from-indigo-300 via-rose-200 to-amber-100',
  day:    'from-sky-400 via-sky-200 to-sky-100',
  sunset: 'from-indigo-500 via-orange-300 to-amber-200',
  night:  'from-slate-950 via-indigo-950 to-slate-800',
};

export const RAIN_SKIES = {
  dawn:   'from-slate-500 via-slate-400 to-slate-300',
  day:    'from-slate-600 via-slate-500 to-slate-400',
  sunset: 'from-slate-600 via-slate-500 to-stone-400',
  night:  'from-slate-950 via-slate-900 to-slate-800',
};
