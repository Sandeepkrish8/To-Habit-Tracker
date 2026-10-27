// src/components/ToastProvider.jsx
// Renders a queue of toasts: regular ones at the bottom (with an optional
// action like "Undo"), achievements at the top right.

import { useCallback, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ToastContext } from '../context/toast';
import useFullscreenElement from '../hooks/useFullscreenElement';

let nextId = 1;

function Toast({ toast, onDismiss }) {
  const { message, icon, title, action, duration, variant } = toast;

  if (variant === 'badge' || variant === 'level') {
    const level = variant === 'level';
    return (
      <div
        role="status"
        className={`anim-slide-in pointer-events-auto relative overflow-hidden flex items-center gap-3 w-80 max-w-[calc(100vw-2rem)] p-3.5 rounded-2xl shadow-2xl border
          ${level
            ? 'bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white border-violet-400'
            : 'bg-white dark:bg-gray-900 border-amber-300 dark:border-amber-600'}`}
        onClick={() => onDismiss(toast.id)}
      >
        <span className="anim-shine absolute inset-y-0 -left-1/2 w-1/3 bg-white/40 skew-x-[-20deg]" aria-hidden="true" />
        <div className={`shrink-0 w-12 h-12 rounded-full grid place-items-center text-2xl
          ${level ? 'bg-white/20' : 'bg-gradient-to-br from-yellow-200 to-amber-500'}`}>
          {icon}
        </div>
        <div className="min-w-0">
          <p className={`text-[11px] font-bold tracking-wider ${level ? 'text-violet-100' : 'text-amber-600 dark:text-amber-400'}`}>
            {level ? 'LEVEL UP!' : 'BADGE UNLOCKED!'}
          </p>
          <p className={`font-bold truncate ${level ? '' : 'text-gray-900 dark:text-white'}`}>{title}</p>
          <p className={`text-xs truncate ${level ? 'text-violet-100' : 'text-gray-500 dark:text-gray-400'}`}>{message}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      role="status"
      className="anim-fade-up pointer-events-auto relative overflow-hidden flex items-center gap-3 max-w-[calc(100vw-2rem)] pl-4 pr-2 py-2.5 rounded-xl bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 shadow-xl"
    >
      {icon && <span aria-hidden="true">{icon}</span>}
      <span className="text-sm">{message}</span>
      {action && (
        <button
          onClick={() => { action.onClick(); onDismiss(toast.id); }}
          className="text-sm font-bold text-emerald-300 dark:text-emerald-700 hover:underline px-2 py-1"
        >
          {action.label}
        </button>
      )}
      <button
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss"
        className="text-gray-400 hover:text-white dark:hover:text-gray-900 px-1.5"
      >
        ✕
      </button>
      {/* Shrinking bar shows how long until the toast disappears */}
      <span
        className="anim-countdown absolute bottom-0 left-0 h-0.5 w-full bg-emerald-400 origin-left"
        style={{ animationDuration: `${duration}ms` }}
        aria-hidden="true"
      />
    </div>
  );
}

export default function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());

  const dismiss = useCallback((id) => {
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const show = useCallback((options) => {
    const id = nextId++;
    const toast = { duration: 5000, variant: 'default', ...options, id };
    // Only one regular toast at a time — a new "Undo" replaces the old one
    setToasts((list) => [
      ...list.filter((t) => toast.variant !== 'default' || t.variant !== 'default'),
      toast,
    ]);
    timers.current.set(id, setTimeout(() => dismiss(id), toast.duration));
    return id;
  }, [dismiss]);

  const value = useMemo(() => ({ show, dismiss }), [show, dismiss]);
  const regular = toasts.filter((t) => t.variant === 'default');
  const achievements = toasts.filter((t) => t.variant !== 'default');
  const fullscreenEl = useFullscreenElement();

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Portal into the fullscreen focus room when it's open, otherwise the page */}
      {createPortal(
        <>
          <div aria-live="polite" className="fixed z-[70] bottom-4 inset-x-0 flex flex-col items-center gap-2 pointer-events-none px-4">
            {regular.map((t) => <Toast key={t.id} toast={t} onDismiss={dismiss} />)}
          </div>
          <div aria-live="polite" className="fixed z-[70] top-20 right-4 flex flex-col items-end gap-2 pointer-events-none">
            {achievements.map((t) => <Toast key={t.id} toast={t} onDismiss={dismiss} />)}
          </div>
        </>,
        fullscreenEl ?? document.body
      )}
    </ToastContext.Provider>
  );
}
