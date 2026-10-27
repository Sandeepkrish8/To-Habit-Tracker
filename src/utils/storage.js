// src/utils/storage.js
// Safe localStorage helpers — storage can be full, disabled, or contain bad JSON.

/** Reads and parses a JSON value, returning `fallback` when missing or unreadable */
export const loadJSON = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
};

/** Serializes and saves a value; fails silently when storage is unavailable */
export const saveJSON = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage quota exceeded or unavailable — fail silently
  }
};
