import OpenAI from 'openai';
import { openai, PARSE_MODEL } from '../../infrastructure/ai/openai.client';
import { RESUME_PARSE_SYSTEM_PROMPT, buildParsePrompt } from './prompt.builder';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function parseResumeWithLLM(resumeText: string): Promise<string> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await openai.chat.completions.create({
        model: PARSE_MODEL,
        response_format: { type: 'json_object' },
        temperature: 0,
        max_tokens: 4000,
        messages: [
          { role: 'system', content: RESUME_PARSE_SYSTEM_PROMPT },
          { role: 'user', content: buildParsePrompt(resumeText) },
        ],
      });

      const content = response.choices[0]?.message?.content;
      if (content) return content;
    } catch (err) {
      lastError = err as Error;

      if (err instanceof OpenAI.RateLimitError) {
        const waitMs = attempt * 5000;
        await sleep(waitMs);
        continue;
      }

      if (err instanceof OpenAI.APIError && err.status && err.status >= 500) {
        await sleep(1000 * attempt);
        continue;
      }

      throw err;
    }
  }

  throw lastError ?? new Error('OpenAI parse failed after 3 attempts');
}
