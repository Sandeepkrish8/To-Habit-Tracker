// src/hooks/useDarkMode.js
// Dark mode as a tiny external store, so the navbar, command bar and new tab page
// all share one source of truth. useSyncExternalStore is React's built-in way to
// read a value that lives outside React (here: localStorage + the <html> class).

import { useSyncExternalStore } from 'react';

const KEY = 'habitTracker_dark';
const listeners = new Set();

const read = () => {
  try {
    return localStorage.getItem(KEY) === 'true';
  } catch {
    return false;
  }
};

const apply = (dark) => document.documentElement.classList.toggle('dark', dark);

export function setDarkMode(dark) {
  try {
    localStorage.setItem(KEY, String(dark));
  } catch {
    // Storage unavailable — the theme still applies for this visit
  }
  apply(dark);
  listeners.forEach((notify) => notify());
}

const subscribe = (notify) => {
  listeners.add(notify);
  return () => listeners.delete(notify);
};

// Apply the saved theme as soon as the app loads
apply(read());

export default function useDarkMode() {
  const dark = useSyncExternalStore(subscribe, read);
  return [dark, setDarkMode];
}
