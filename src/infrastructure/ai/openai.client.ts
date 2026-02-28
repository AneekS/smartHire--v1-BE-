import OpenAI from 'openai';
import { env } from '../../config/env';

export const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
});

export const PARSE_MODEL = env.OPENAI_PARSE_MODEL;
export const SUGGEST_MODEL = env.OPENAI_SUGGEST_MODEL;
