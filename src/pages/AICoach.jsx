// src/pages/AICoach.jsx
// AI Coach chat page — full conversation UI powered by the Claude API.

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSelector } from 'react-redux';
import {
  selectHabits,
  selectTodayCount,
  selectTotalCompletions,
  selectTopStreak,
} from '../features/habits/habitsSlice';
import { chatWithCoach, getWeeklyPlan } from '../services/claudeAPI';

// ── Constants ─────────────────────────────────────────────────────────────────

const SUGGESTIONS = [
  'How am I doing overall this week?',
  'Which habit should I focus on improving?',
  'Give me tips to build a better morning routine.',
  'Why do I keep missing habits and how do I fix it?',
  'What is the best time of day to build new habits?',
];

// ── Sub-components ────────────────────────────────────────────────────────────

/** Animated 3-dot typing indicator */
function TypingIndicator() {
  return (
    <div className="flex items-end gap-3 mb-4">
      {/* AI Avatar */}
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-900/50
        flex items-center justify-center text-base shadow-sm">
        🤖
      </div>
      {/* Bouncing dots */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700
        rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm flex items-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-2 h-2 rounded-full bg-violet-400 dark:bg-violet-500 inline-block"
            style={{
              animation: 'bounce 1.2s infinite',
              animationDelay: `${i * 0.2}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

/** A single chat message bubble */
function MessageBubble({ message }) {
  const isUser = message.role === 'user';
  const isPlan = message.isPlan;

  // Format timestamp
  const time = new Date(message.timestamp).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });

  if (isUser) {
    return (
      <div className="flex justify-end mb-4">
        <div className="max-w-[80%] sm:max-w-[65%]">
          <div className="bg-violet-600 dark:bg-violet-700 text-white rounded-2xl
            rounded-br-sm px-4 py-3 shadow-sm">
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 text-right pr-1">{time}</p>
        </div>
      </div>
    );
  }

  // AI message (left-aligned)
  return (
    <div className="flex items-end gap-3 mb-4">
      {/* AI Avatar */}
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-900/50
        flex items-center justify-center text-base shadow-sm self-start mt-1">
        🤖
      </div>

      <div className="max-w-[80%] sm:max-w-[70%]">
        {/* Plan badge */}
        {isPlan && (
          <div className="flex items-center gap-1.5 mb-2">
            <span className="text-xs font-semibold text-violet-600 dark:text-violet-400
              bg-violet-50 dark:bg-violet-900/40 px-2.5 py-0.5 rounded-full border
              border-violet-200 dark:border-violet-700">
              📅 7-Day Plan
            </span>
          </div>
        )}

        <div className={`rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm border
          ${isPlan
            ? 'bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/40 dark:to-purple-950/40 border-violet-200 dark:border-violet-700'
            : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
          }`}>
          <p className="text-sm leading-relaxed whitespace-pre-wrap text-gray-800 dark:text-gray-100">
            {message.content}
          </p>
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 pl-1">{time}</p>
      </div>
    </div>
  );
}

/** Horizontal scrollable habit context bar */
function HabitContextBar({ habits }) {
  const today = new Date().toISOString().split('T')[0];

  if (habits.length === 0) return null;

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
      {habits.map((h) => {
        const doneToday = h.completedDates?.includes(today);
        return (
          <div
            key={h.id}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full
              text-xs font-medium border transition-colors
              ${doneToday
                ? 'bg-violet-50 dark:bg-violet-900/40 border-violet-200 dark:border-violet-700 text-violet-700 dark:text-violet-300'
                : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'
              }`}
          >
            <span>{h.icon}</span>
            <span className="max-w-[80px] truncate">{h.name}</span>
            {(h.streak ?? 0) > 0 && (
              <span className="text-orange-500 dark:text-orange-400">
                🔥{h.streak}
              </span>
            )}
            {doneToday && <span className="text-violet-500">✓</span>}
          </div>
        );
      })}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AICoach() {
  const habits          = useSelector(selectHabits);
  const todayCount      = useSelector(selectTodayCount);
  const totalCompletions = useSelector(selectTotalCompletions);
  const topStreak       = useSelector(selectTopStreak);

  // ── Local state ──────────────────────────────────────────────────────────
  const [messages, setMessages]       = useState([]);
  const [input, setInput]             = useState('');
  const [loading, setLoading]         = useState(false);
  const [planLoading, setPlanLoading] = useState(false);
  const [error, setError]             = useState(null);

  // Refs
  const messagesEndRef = useRef(null);   // for auto-scroll
  const textareaRef    = useRef(null);   // for focus

  // ── Auto-scroll to bottom whenever messages change ───────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // ── Welcome message on first load ────────────────────────────────────────
  useEffect(() => {
    const today = new Date().toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric',
    });

    const welcomeText =
      habits.length === 0
        ? `👋 Welcome to HabitFlow AI Coach!\n\nI'm here to help you build better habits and stay consistent. It looks like you haven't added any habits yet — head to the Dashboard to get started!\n\nOnce you have some habits, I can give you personalized advice, track your progress, and help you crush your goals. 💪`
        : `👋 Welcome back! Happy ${today}.\n\n` +
          `Here's your snapshot:\n` +
          `• 📋 ${habits.length} habit${habits.length !== 1 ? 's' : ''} tracked\n` +
          `• ✅ ${todayCount} / ${habits.length} done today\n` +
          `• 🔥 Top streak: ${topStreak} day${topStreak !== 1 ? 's' : ''}\n` +
          `• 🏆 ${totalCompletions} total completions\n\n` +
          `What would you like to work on today? You can ask me anything about your habits, or use the suggestion chips below!`;

    setMessages([
      {
        role:      'assistant',
        content:   welcomeText,
        timestamp: Date.now(),
      },
    ]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once on mount

  // ── Send a chat message ──────────────────────────────────────────────────
  const handleSend = useCallback(async (text) => {
    const trimmed = (text ?? input).trim();
    if (!trimmed || loading) return;

    setError(null);
    setInput('');

    // Add user message immediately
    const userMsg = { role: 'user', content: trimmed, timestamp: Date.now() };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      // Build conversation history (exclude the welcome message for cleaner context)
      const history = messages
        .filter((m) => !m.isWelcome)
        .map(({ role, content }) => ({ role, content }));

      const reply = await chatWithCoach(trimmed, habits, history);

      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: reply, timestamp: Date.now() },
      ]);
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
      // Re-focus the textarea after sending
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [input, loading, messages, habits]);

  // ── Generate weekly plan ─────────────────────────────────────────────────
  const handleWeeklyPlan = useCallback(async () => {
    if (planLoading || loading) return;
    setError(null);
    setPlanLoading(true);

    // Add a user-side prompt so the conversation makes sense
    const planPrompt = '📅 Generate my personalized 7-day habit improvement plan.';
    setMessages((prev) => [
      ...prev,
      { role: 'user', content: planPrompt, timestamp: Date.now() },
    ]);

    try {
      const plan = await getWeeklyPlan(habits);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: plan, timestamp: Date.now(), isPlan: true },
      ]);
    } catch (err) {
      setError(err.message || 'Could not generate plan. Please try again.');
    } finally {
      setPlanLoading(false);
    }
  }, [planLoading, loading, habits]);

  // ── Keyboard handler for textarea ────────────────────────────────────────
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ── Suggestion chip click ────────────────────────────────────────────────
  const handleSuggestion = (text) => {
    setInput(text);
    handleSend(text);
  };

  // ── Derived ──────────────────────────────────────────────────────────────
  const canSend  = input.trim().length > 0 && !loading;
  const today    = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      {/* Bounce animation keyframes — injected inline to avoid external CSS */}
      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30%            { transform: translateY(-6px); }
        }
      `}</style>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 flex flex-col h-[calc(100vh-4rem)]">

        {/* ── Page Header ─────────────────────────────────────────── */}
        <div className="flex-shrink-0 mb-4">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                🤖 AI Coach
              </h1>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">{today}</p>
            </div>

            {/* Stats pills */}
            <div className="flex flex-wrap gap-2">
              <span className="text-xs font-medium px-3 py-1.5 rounded-full bg-violet-100
                dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 border
                border-violet-200 dark:border-violet-700">
                ✅ {todayCount}/{habits.length} today
              </span>
              <span className="text-xs font-medium px-3 py-1.5 rounded-full bg-orange-50
                dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 border
                border-orange-200 dark:border-orange-800/50">
                🔥 {topStreak} day streak
              </span>
            </div>
          </div>

          {/* Habit context bar */}
          {habits.length > 0 && (
            <div className="mt-3">
              <HabitContextBar habits={habits} />
            </div>
          )}
        </div>

        {/* ── Weekly Plan Button ───────────────────────────────────── */}
        <div className="flex-shrink-0 mb-4">
          <button
            onClick={handleWeeklyPlan}
            disabled={planLoading || loading || habits.length === 0}
            className="w-full py-2.5 px-4 rounded-xl border-2 border-dashed border-violet-300
              dark:border-violet-700 text-violet-600 dark:text-violet-400 text-sm font-semibold
              hover:bg-violet-50 dark:hover:bg-violet-900/20 hover:border-violet-400
              dark:hover:border-violet-600 transition-all duration-200 flex items-center
              justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {planLoading ? (
              <>
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Generating your plan…
              </>
            ) : (
              <>📅 Generate My 7-Day Improvement Plan</>
            )}
          </button>
        </div>

        {/* ── Chat Messages Area ───────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto rounded-2xl border border-gray-200
          dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/30 p-4 mb-4 min-h-0">

          {messages.map((msg, idx) => (
            <MessageBubble key={idx} message={msg} />
          ))}

          {/* Typing indicator */}
          {(loading || planLoading) && <TypingIndicator />}

          {/* Error banner */}
          {error && (
            <div className="flex items-start gap-3 mb-4 p-4 rounded-xl bg-red-50
              dark:bg-red-950/30 border border-red-200 dark:border-red-800/50">
              <span className="text-lg flex-shrink-0">⚠️</span>
              <div>
                <p className="text-sm font-semibold text-red-700 dark:text-red-400">
                  Error
                </p>
                <p className="text-sm text-red-600 dark:text-red-500 mt-0.5">{error}</p>
                <button
                  onClick={() => setError(null)}
                  className="text-xs text-red-500 dark:text-red-400 underline mt-1
                    hover:no-underline"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {/* Auto-scroll anchor */}
          <div ref={messagesEndRef} />
        </div>

        {/* ── Suggestion Chips ─────────────────────────────────────── */}
        <div className="flex-shrink-0 mb-3">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => handleSuggestion(s)}
                disabled={loading || planLoading}
                className="flex-shrink-0 text-xs px-3 py-1.5 rounded-full border
                  border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800
                  text-gray-600 dark:text-gray-300 hover:border-violet-400
                  dark:hover:border-violet-600 hover:text-violet-600
                  dark:hover:text-violet-400 transition-all duration-150
                  disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* ── Input Area ───────────────────────────────────────────── */}
        <div className="flex-shrink-0">
          <div className="flex gap-3 items-end bg-white dark:bg-gray-800 rounded-2xl border
            border-gray-200 dark:border-gray-700 p-3 shadow-sm focus-within:ring-2
            focus-within:ring-violet-400 focus-within:border-violet-400 transition-all duration-200">

            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask your AI coach anything… (Enter to send, Shift+Enter for new line)"
              rows={1}
              disabled={loading || planLoading}
              className="flex-1 resize-none bg-transparent text-sm text-gray-800
                dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500
                outline-none leading-relaxed max-h-32 disabled:opacity-60"
              style={{
                // Auto-grow textarea up to 4 lines
                height: 'auto',
                overflowY: input.split('\n').length > 4 ? 'auto' : 'hidden',
              }}
              onInput={(e) => {
                e.target.style.height = 'auto';
                e.target.style.height = `${Math.min(e.target.scrollHeight, 128)}px`;
              }}
            />

            {/* Send button */}
            <button
              onClick={() => handleSend()}
              disabled={!canSend}
              title="Send message"
              className="flex-shrink-0 w-9 h-9 rounded-xl bg-violet-600 dark:bg-violet-700
                hover:bg-violet-700 dark:hover:bg-violet-600 text-white flex items-center
                justify-center transition-all duration-200 disabled:opacity-40
                disabled:cursor-not-allowed active:scale-95 shadow-sm"
            >
              {loading ? (
                /* Spinner */
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10"
                    stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
              ) : (
                /* Send arrow */
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"/>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              )}
            </button>
          </div>

          <p className="text-center text-xs text-gray-400 dark:text-gray-600 mt-2">
            AI responses may not always be accurate. Use as guidance, not medical advice.
          </p>
        </div>
      </div>
    </>
  );
}
