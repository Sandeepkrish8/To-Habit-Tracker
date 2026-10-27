// src/context/toast.js
// Toast context + hook. Kept apart from the <ToastProvider> component so
// React Fast Refresh can hot-reload the component file cleanly.

import { createContext, useContext } from 'react';

export const ToastContext = createContext(null);

/**
 * const toast = useToast();
 * toast.show({ message, icon?, action?: { label, onClick }, duration?, variant?: 'default' | 'badge' | 'level' })
 */
export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
};
