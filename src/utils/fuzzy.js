// src/utils/fuzzy.js
// Tiny fuzzy matcher for the command bar: "stfoc" matches "Start focus".
//
// Every query character must appear in the text in order (a "subsequence").
// Matches score higher when characters are consecutive or start a word,
// so "focus" ranks "Start focus" above "Forest of Cherry trees".

/**
 * @returns {{ score: number, indices: number[] } | null} null when it doesn't match
 */
export function fuzzyMatch(query, text) {
  const q = query.toLowerCase().replace(/\s+/g, '');
  if (!q) return { score: 0, indices: [] };
  const t = text.toLowerCase();

  const indices = [];
  let score = 0;
  let prev = -2;
  let ti = 0;

  for (const ch of q) {
    const found = t.indexOf(ch, ti);
    if (found === -1) return null;
    indices.push(found);
    score += 1;
    if (found === prev + 1) score += 3;                                  // consecutive letters
    if (found === 0 || /[\s\-'"(]/.test(t[found - 1])) score += 2;        // start of a word
    prev = found;
    ti = found + 1;
  }

  score -= (indices[indices.length - 1] - indices[0]) * 0.05;            // tighter matches win
  return { score, indices };
}
