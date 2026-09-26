import { createOpenAI } from '@ai-sdk/openai';

export function createOpenAIProvider() {
  return createOpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: process.env.OPENAI_BASE_URL,
  });
}