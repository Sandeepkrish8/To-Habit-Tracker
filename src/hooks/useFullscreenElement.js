// src/hooks/useFullscreenElement.js
// The element currently in fullscreen (or null). Overlays like toasts and the
// command bar must render *inside* it — anything outside is hidden while
// something is fullscreen.

import { useSyncExternalStore } from 'react';

const subscribe = (notify) => {
  document.addEventListener('fullscreenchange', notify);
  return () => document.removeEventListener('fullscreenchange', notify);
};

const getElement = () => document.fullscreenElement;

export default function useFullscreenElement() {
  return useSyncExternalStore(subscribe, getElement);
}
