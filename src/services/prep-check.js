// Checks the model's interview prep before anyone sees it. The model is never
// trusted: the answer must have the right shape, and every quote must appear
// word for word in the document it claims to come from.

export const MIN_QUESTIONS = 3;
export const MAX_QUESTIONS = 8;
export const MIN_QUOTE = 3;
export const MAX_QUOTE = 300;

/** Ignores case and runs of spaces or line breaks, as criterion 3 says. */
export function normalise(text) {
  return text.normalize("NFC").replace(/\s+/g, " ").trim().toLowerCase();
}

const isText = (v) => typeof v === "string" && v.trim() !== "";
const hasQuote = (v) => v !== null && typeof v === "object" && isText(v.quote);

/**
 * Parses the model's reply. Returns the questions, each
 * { question, why: { quote }, talk_about: { quote } }, or null when the reply
 * isn't JSON in that shape.
 */
export function parseAnswer(text) {
  let answer;
  try {
    answer = JSON.parse(text);
  } catch {
    return null;
  }
  if (answer === null || typeof answer !== "object" || !Array.isArray(answer.questions)) return null;
  const ok = answer.questions.every((q) => q !== null && typeof q === "object" && isText(q.question) && hasQuote(q.why) && hasQuote(q.talk_about));
  if (!ok) return null;
  return answer.questions.map((q) => ({
    question: q.question.trim(),
    why: { quote: q.why.quote.trim() },
    talk_about: { quote: q.talk_about.quote.trim() },
  }));
}

/** A quote is 3 to 300 characters and appears in the source, ignoring case and spacing. */
export function quoteFound(quote, source) {
  const length = quote.trim().length;
  if (length < MIN_QUOTE || length > MAX_QUOTE) return false;
  return normalise(source).includes(normalise(quote));
}

/**
 * Keeps the questions whose quotes check out, drops repeats, and keeps at most 8.
 * The caller decides what to do when fewer than MIN_QUESTIONS are left.
 */
export function checkQuestions(questions, jobPost, cv) {
  const seen = new Set();
  const kept = [];
  for (const q of questions) {
    if (!quoteFound(q.why.quote, jobPost) || !quoteFound(q.talk_about.quote, cv)) continue;
    const key = normalise(q.question);
    if (seen.has(key)) continue;
    seen.add(key);
    kept.push(q);
  }
  return kept.slice(0, MAX_QUESTIONS);
}
