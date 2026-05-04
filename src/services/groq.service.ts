// ─── AI CHAT SERVICE ────────────────────────────────────────────────
// Chat completion (JSON mode) + audio transcription
// Replaces fragile regex-based [EXTRACT:] parsing with typed JSON output

import { GoogleGenAI } from '@google/genai';
import Groq from 'groq-sdk';
import { SYSTEM_PROMPT } from '../config/prompts';
import { FRAMEWORK, type AgentResponse, type Extraction } from '../config/framework';
import { state, getTrimmedHistory } from '../store/brandscript.store';
import { generateOllamaJson, type OllamaChatMessage } from './ollama.service';

const API_KEY = import.meta.env.VITE_GROQ_API_KEY;
export const groq = new Groq({ 
  apiKey: API_KEY || 'missing_key_error_handled_later', 
  dangerouslyAllowBrowser: true,
  timeout: 5 * 60 * 1000, // 5 minute timeout per request
  maxRetries: 2
});

const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY || import.meta.env.VITE_GEMINI_API_KEY || '';
const GOOGLE_MODELS = (import.meta.env.VITE_GOOGLE_MODELS || import.meta.env.VITE_GOOGLE_MODEL || 'gemini-2.5-flash,gemini-2.5-flash-lite,gemini-2.0-flash')
  .split(',')
  .map((model: string) => model.trim())
  .filter(Boolean);
const gemini = GOOGLE_API_KEY ? new GoogleGenAI({ apiKey: GOOGLE_API_KEY }) : null;
const OLLAMA_RETRIES = 1;

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

function isGeminiQuotaError(err: unknown): boolean {
  const message = String((err as Error)?.message || err).toLowerCase();
  return (
    message.includes('quota') ||
    message.includes('resource_exhausted') ||
    message.includes('rate_limit_exceeded') ||
    message.includes('too many requests') ||
    message.includes('limit: 0') ||
    message.includes('429')
  );
}

// ─── BUILD CONTEXT ──────────────────────────────────────────────────

function buildBrandscriptContext(): string {
  return FRAMEWORK.map(section => {
    const fields = section.fields.map(field => {
      const val = state.brandscript[section.id][field.id];
      return `  ${field.label} (${field.id}): ${val ? `"${val}"` : 'NOT YET FILLED'}`;
    }).join('\n');
    return `### ${section.label} (${section.id})\n${fields}`;
  }).join('\n\n');
}

// ─── CHAT COMPLETION (JSON MODE) ────────────────────────────────────

export async function callGroq(userText: string, retries = 2, referenceContext = ''): Promise<AgentResponse> {
  // Truncate reference context to prevent exceeding token limits (e.g., 6000 TPM limit on Groq free tier)
  // We keep the last 3000 characters to stay within tight token budgets.
  const MAX_REF_LENGTH = 3000;
  let trimmedReference = referenceContext.trim();
  if (trimmedReference.length > MAX_REF_LENGTH) {
    trimmedReference = '...[earlier context truncated]...\\n' + trimmedReference.slice(-MAX_REF_LENGTH);
  }

  const referenceInjection = trimmedReference
    ? `\\n\\n## COLLECTED BUSINESS CONTEXT (REFERENCE ONLY):\\n${trimmedReference}\\n\\nUse this only as supporting context for responses. Do not proactively fill framework fields unless the user explicitly asks to extract or refine section answers in their current message.`
    : '';

  const contextInjection = `\n\n---\n## CURRENT B.I.G DOC STATUS:\n${buildBrandscriptContext()}${referenceInjection}\n---\n`;

  // Trim history to last 5 messages to save tokens significantly
  const trimmedHistory = getTrimmedHistory().slice(-5).map(m => ({
    ...m,
    content: m.content.length > 2000 ? m.content.slice(0, 2000) + '...[message truncated]...' : m.content
  }));

  // Truncate user input if it's excessively large (e.g. huge transcript paste)
  // Reduced to 4000 chars (~1000 tokens) to ensure we stay under the 6000 token TPM limit.
  const MAX_USER_TEXT = 4000;
  const processedUserText = userText.length > MAX_USER_TEXT
    ? userText.slice(0, MAX_USER_TEXT) + '...[input truncated for performance]...'
    : userText;

  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: SYSTEM_PROMPT + contextInjection },
    ...trimmedHistory.map(m => ({
      role: (m.role === 'agent' ? 'assistant' : 'user') as 'user' | 'assistant',
      content: m.content,
    })),
    { role: 'user', content: processedUserText }
  ];

  const ollamaMessages: OllamaChatMessage[] = messages;

  const promptText = messages
    .map(message => {
      const prefix = message.role === 'system'
        ? 'SYSTEM'
        : message.role === 'assistant'
          ? 'ASSISTANT'
          : 'USER';
      return `${prefix}: ${message.content}`;
    })
    .join('\n\n');

  async function generateWithGroqJson(): Promise<string> {
    if (!API_KEY || API_KEY === 'missing_key_error_handled_later') {
      throw new Error('API_KEY is missing');
    }

    try {
      const response = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: ollamaMessages,
        temperature: 0.2,
        response_format: { type: 'json_object' }
      });
      return response.choices[0]?.message?.content || '{}';
    } catch (err) {
      throw err;
    }
  }

  try {
    const raw = await generateWithGroqJson();
    return parseAgentResponse(raw);

  } catch (err: unknown) {
    try {
      const raw = await generateOllamaJson(ollamaMessages, OLLAMA_RETRIES);
      return parseAgentResponse(raw);
    } catch (ollamaError) {
      console.warn('Ollama fallback failed for chat completion:', ollamaError);

      if (isGeminiQuotaError(err)) {
        console.warn('Gemini quota exhausted; returning a safe fallback chat response.', err);
        return {
          message: 'The AI service is temporarily rate-limited. Please try again in a few minutes.',
          extractions: [],
        };
      }

      throw err;
    }
  }
}

// ─── PARSE JSON RESPONSE ────────────────────────────────────────────

function parseAgentResponse(raw: string): AgentResponse {
  try {
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned);

    // Validate message field
    const message = typeof parsed.message === 'string' ? parsed.message : '';

    // Validate extractions array
    const extractions: Extraction[] = [];
    if (Array.isArray(parsed.extractions)) {
      for (const ext of parsed.extractions) {
        if (
          typeof ext.section === 'string' &&
          typeof ext.field === 'string' &&
          typeof ext.value === 'string' &&
          state.brandscript[ext.section as keyof typeof state.brandscript] !== undefined &&
          state.brandscript[ext.section as keyof typeof state.brandscript][ext.field] !== undefined
        ) {
          extractions.push({
            section: ext.section,
            field: ext.field,
            value: ext.value.trim(),
          });
        }
      }
    }

    return { message, extractions };

  } catch (e) {
    // Fallback: if JSON parsing fails, treat entire response as message
    console.warn('JSON parse failed, falling back to raw text:', e);
    return {
      message: raw.trim(),
      extractions: [],
    };
  }
}

// ─── AUDIO TRANSCRIPTION ────────────────────────────────────────────

export async function transcribeAudio(file: File): Promise<string> {
  const transcription = await groq.audio.transcriptions.create({
    file,
    model: 'whisper-large-v3',
    temperature: 0,
    response_format: 'json',
  });
  return (transcription.text || '').trim();
}

// ─── PROMPT GUARD ───────────────────────────────────────────────────
// Uses the specialized safety model to filter harmful content
// We call this separately to keep the main chat context clean

export async function checkPromptSafety(text: string): Promise<boolean> {
  try {
    // Only check the first 2000 characters for safety to avoid rate limits
    const checkText = text.slice(0, 2000);

    const completion = await groq.chat.completions.create({
      model: 'meta-llama/llama-prompt-guard-2-86m',
      messages: [{ role: 'user', content: checkText }],
      temperature: 1,
      max_tokens: 1,
      top_p: 1,
    });

    const result = completion.choices[0]?.message?.content || 'safe';
    return result.toLowerCase().includes('unsafe') ? false : true;
  } catch (error) {
    console.error('Error in Prompt Guard:', error);
    // Fail safe: if safety check fails due to rate limits, we allow the message
    // but log it. This prevents the whole app from breaking if the safety model is down.
    return true;
  }
}
