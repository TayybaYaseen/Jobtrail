// The one place JobTrail talks to Claude. The API key comes from
// ANTHROPIC_API_KEY and is never logged or shown: every SDK error is turned
// into an AppError with our own message before it leaves this file.

import Anthropic, {
  APIConnectionError,
  APIConnectionTimeoutError,
  APIError,
  APIUserAbortError,
  AuthenticationError,
  InternalServerError,
  PermissionDeniedError,
  RateLimitError,
} from "@anthropic-ai/sdk";
import { AppError } from "../errors.js";

export const MODEL = "claude-sonnet-5-5";
export const MAX_TOKENS = 2000;

export const NOT_SET_UP = "Interview prep isn't set up on this server.";

export const isConfigured = () => Boolean(process.env.ANTHROPIC_API_KEY);

/**
 * Sends one request and returns { text, stopReason }. No SDK retries: the
 * caller owns the 30-second budget, and `signal` ends the call when it's up.
 */
export async function ask({ system, user, schema, signal, timeoutMs }) {
  if (!isConfigured()) throw new AppError("PREP_NOT_SET_UP", NOT_SET_UP, 503);
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, maxRetries: 0 });
  try {
    const response = await client.messages.create(
      {
        model: MODEL,
        max_tokens: MAX_TOKENS,
        // Thinking off: quoting needs no reasoning, and thinking tokens would
        // eat into the 2,000-token budget the JSON needs.
        thinking: { type: "between_tools" },
        output_config: { format: { type: "json_schema", schema } },
        system,
        messages: [{ role: "user", content: user }],
      },
      { signal, timeout: timeoutMs },
    );
    const text = response.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("");
    return { text, stopReason: response.stop_reason };
  } catch (err) {
    throw toAppError(err);
  }
}

/** What the user sees for each way the call can fail. */
export function toAppError(err) {
  // Our own deadline (abort) or the SDK's timeout. Checked before
  // APIConnectionError, which the timeout error extends.
  if (err instanceof APIUserAbortError || err instanceof APIConnectionTimeoutError) {
    return new AppError("PREP_TIMEOUT", "That took too long. Try again.", 504);
  }
  if (err instanceof RateLimitError || err instanceof InternalServerError || err instanceof APIConnectionError) {
    return new AppError("AI_BUSY", "The AI service is busy. Try again in a minute.", 503);
  }
  if (err instanceof AuthenticationError || err instanceof PermissionDeniedError) {
    console.error("Interview prep: the Anthropic API refused the API key."); // never the key itself
    return new AppError("PREP_NOT_SET_UP", NOT_SET_UP, 503);
  }
  if (err instanceof APIError) {
    return new AppError("PREP_FAILED", "Something went wrong. Try again.", 502);
  }
  return err; // a bug in our code: the error handler logs it
}
