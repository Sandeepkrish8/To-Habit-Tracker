// src/context/focusUI.js
// Focus controls that need the global <FocusEngine>: the floating mini timer
// (Document Picture-in-Picture) and short ambient sound previews.

import { createContext, useContext } from 'react';

export const FocusUIContext = createContext(null);

export const useFocusUI = () => {
  const ctx = useContext(FocusUIContext);
  if (!ctx) throw new Error('useFocusUI must be used inside <FocusEngine>');
  return ctx;
};
