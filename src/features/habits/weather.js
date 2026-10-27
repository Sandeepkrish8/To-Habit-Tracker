// src/features/habits/weather.js
// The home screen's weather is a picture of your consistency.

/** ☀️ on track · ⛅ 1–2 missed days in a row · 🌧️ 3+ (an unfinished today doesn't count yet) */
export const weatherOf = ({ missedDays, doneToday }, hasHabits) => {
  if (!hasHabits || doneToday || missedDays === 0) return 'sunny';
  return missedDays >= 3 ? 'rainy' : 'cloudy';
};
