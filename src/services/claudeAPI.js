// src/services/claudeAPI.js
// Wrapper around the Anthropic Claude API for the AI Coach feature.
// All calls go directly from the browser using the special direct-browser header.

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL          = 'claude-sonnet-4-20250514';
const MAX_TOKENS     = 1024;

// ── Core fetch helper ─────────────────────────────────────────────────────────

/**
 * Makes a raw POST request to the Claude messages API.
 * @param {string}   systemPrompt  — sets the AI persona/context
 * @param {Array}    messages      — array of { role: 'user'|'assistant', content: string }
 * @param {number}   maxTokens     — max response length
 * @returns {Promise<string>}      — the AI's text response
 */
async function callClaude(systemPrompt, messages, maxTokens = MAX_TOKENS) {
  const apiKey = import.meta.env.VITE_CLAUDE_API_KEY;

  if (!apiKey) {
    throw new Error(
      'Missing API key. Add VITE_CLAUDE_API_KEY to your .env file and restart the dev server.'
    );
  }

  const response = await fetch(CLAUDE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type':                          'application/json',
      'x-api-key':                             apiKey,
      'anthropic-version':                     '2023-06-01',
      // Required for direct browser → Anthropic API calls
      'anthropic-dangerous-direct-browser-calls': 'true',
    },
    body: JSON.stringify({
      model:      MODEL,
      max_tokens: maxTokens,
      system:     systemPrompt,
      messages,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    const msg = err?.error?.message || `API error ${response.status}`;
    throw new Error(msg);
  }

  const data = await response.json();
  // Claude returns content as an array of blocks; we only need the text block
  return data.content?.[0]?.text ?? '';
}

// ── Helper: build a concise habit summary string ──────────────────────────────

/**
 * Converts the habits array into a readable bullet-point summary
 * that can be injected into any system prompt.
 */
function buildHabitSummary(habits) {
  if (!habits || habits.length === 0) {
    return 'The user has no habits tracked yet.';
  }

  const today = new Date().toISOString().split('T')[0];

  return habits
    .map((h) => {
      const doneToday  = h.completedDates?.includes(today) ? '✅ done today' : '⬜ not done today';
      const totalDone  = h.completedDates?.length ?? 0;
      const streak     = h.streak     ?? 0;
      const bestStreak = h.bestStreak ?? 0;
      return `• ${h.icon} ${h.name}: ${doneToday}, ${streak}-day streak (best: ${bestStreak}), ${totalDone} total completions`;
    })
    .join('\n');
}

// ── Exported API functions ────────────────────────────────────────────────────

/**
 * getDailyQuote
 * Returns a short motivational quote tailored to today's completion progress.
 *
 * @param {number} completedCount — habits done today
 * @param {number} totalCount     — total habits
 * @returns {Promise<string>}
 */
export async function getDailyQuote(completedCount, totalCount) {
  const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const system = `You are an uplifting habit coach. Give exactly ONE short motivational quote 
(1–2 sentences, max 30 words). No preamble, no attribution, no quotation marks. 
Tailor it to the user's current completion level.`;

  const prompt =
    totalCount === 0
      ? 'The user has no habits yet. Encourage them to add their first habit.'
      : `The user has completed ${completedCount} of ${totalCount} habits today (${pct}%). ` +
        `${pct === 100 ? 'They finished everything!' : pct >= 50 ? 'They are over halfway.' : 'They are just getting started.'}`;

  return callClaude(system, [{ role: 'user', content: prompt }], 128);
}

/**
 * getHabitAdvice
 * Returns personalized advice for a single habit based on its stats.
 *
 * @param {string} habitName  — the habit's name
 * @param {number} streak     — current streak in days
 * @param {number} totalDone  — all-time completions
 * @returns {Promise<string>}
 */
export async function getHabitAdvice(habitName, streak, totalDone) {
  const system = `You are an expert habit coach. Give concise, actionable advice (2–3 sentences) 
for the specific habit. Be encouraging but realistic. No bullet points, just a paragraph.`;

  const prompt =
    `Habit: "${habitName}" — Current streak: ${streak} days, Total completions: ${totalDone}. ` +
    `Give advice to help them improve or maintain this habit.`;

  return callClaude(system, [{ role: 'user', content: prompt }], 256);
}

/**
 * chatWithCoach
 * Full conversational chat. Sends the user's message along with full habit context
 * and conversation history so the AI maintains coherent multi-turn conversations.
 *
 * @param {string} userMessage         — the user's latest message
 * @param {Array}  habits              — all habits from Redux store
 * @param {Array}  conversationHistory — previous messages [{ role, content }]
 * @returns {Promise<string>}
 */
export async function chatWithCoach(userMessage, habits, conversationHistory = []) {
  const habitSummary = buildHabitSummary(habits);
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });

  const system = `You are HabitFlow AI Coach — a friendly, insightful, and motivating personal habit coach. 
Today is ${today}.

Here is the user's current habit data:
${habitSummary}

Your role:
- Give personalized advice based on their ACTUAL habits and streaks shown above
- Be encouraging, concise, and actionable (keep responses under 150 words unless asked for a plan)
- Use the user's habit names and stats naturally in conversation
- If they ask about a specific habit, reference its real streak and completion count
- Never make up data — only use what is shown above
- Use a warm, coach-like tone with occasional emojis`;

  // Keep conversation history to last 20 messages to avoid token overflow
  const history = conversationHistory.slice(-20).map(({ role, content }) => ({ role, content }));

  const messages = [
    ...history,
    { role: 'user', content: userMessage },
  ];

  return callClaude(system, messages, 512);
}

/**
 * getWeeklyPlan
 * Generates a structured 7-day improvement plan based on the user's habits.
 *
 * @param {Array} habits — all habits from Redux store
 * @returns {Promise<string>}
 */
export async function getWeeklyPlan(habits) {
  const habitSummary = buildHabitSummary(habits);

  const system = `You are HabitFlow AI Coach. Generate a focused, realistic 7-day habit improvement plan. 
Format it clearly with Day 1–7 sections. Be specific, actionable, and reference the user's actual habits.
Keep the total response under 400 words.`;

  const prompt =
    `Based on these habits, create a personalized 7-day plan to improve consistency:\n\n${habitSummary}\n\n` +
    `Focus on habits with low streaks or that weren't done today. Include specific tips, timing suggestions, and small wins.`;

  return callClaude(system, [{ role: 'user', content: prompt }], 1024);
}
