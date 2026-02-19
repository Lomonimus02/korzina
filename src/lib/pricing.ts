/**
 * LLM pricing per 1 million tokens (USD).
 * Update values as OpenRouter / provider pricing changes.
 */
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  // Google Gemini 2.0 Flash — currently free / near-zero on OpenRouter
  "google/gemini-2.0-flash-exp": {
    input: 0.0,
    output: 0.0,
  },
  // Google Gemini 2.0 Flash 001
  "google/gemini-2.0-flash-001": {
    input: 0.1,
    output: 0.4,
  },
  // Google Gemini 3 Flash Preview — production model
  "google/gemini-3-flash-preview": {
    input: 0.5,
    output: 3.0,
  },
  // Google Gemini 3 Pro Preview — placeholder pricing (update when available)
  "google/gemini-3-pro-preview": {
    input: 1.25,
    output: 10.0,
  },
};

// Fallback — use Gemini Flash pricing as a reasonable default
const DEFAULT_PRICING = { input: 0.1, output: 0.4 };

/**
 * Calculate the cost of an LLM call in USD.
 *
 * @param model - The model identifier (e.g. "google/gemini-2.0-flash-exp")
 * @param inputTokens - Number of prompt / input tokens
 * @param outputTokens - Number of completion / output tokens
 * @returns Cost in USD (rounded to 8 decimal places)
 */
export function calculateCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const pricing = MODEL_PRICING[model] ?? DEFAULT_PRICING;

  const inputCost = (inputTokens / 1_000_000) * pricing.input;
  const outputCost = (outputTokens / 1_000_000) * pricing.output;

  // Round to 8 decimal places to avoid floating-point noise
  return Math.round((inputCost + outputCost) * 1e8) / 1e8;
}
