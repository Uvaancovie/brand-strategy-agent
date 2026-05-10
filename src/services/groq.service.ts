// ─── AI CHAT SERVICE ────────────────────────────────────────────────
// Chat completion (JSON mode) + audio transcription
// Uses Groq AI exclusively

import Groq from 'groq-sdk';
import { SYSTEM_PROMPT } from '../config/prompts';
import { FRAMEWORK, type AgentResponse, type Extraction } from '../config/framework';
import { state, getTrimmedHistory } from '../store/brandscript.store';

const API_KEY = import.meta.env.VITE_GROQ_API_KEY;
export const groq = new Groq({ 
  apiKey: API_KEY, 
  dangerouslyAllowBrowser: true,
  timeout: 5 * 60 * 1000, // 5 minute timeout per request
  maxRetries: 2
});

const GROQ_MODELS = (import.meta.env.VITE_GROQ_MODELS || import.meta.env.VITE_GROQ_MODEL || 'llama-3.1-8b-instant,llama-3.3-70b-versatile')
  .split(',')
  .map((model: string) => model.trim())
  .filter(Boolean);

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

function isGroqQuotaError(err: unknown): boolean {
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
  if (!API_KEY) {
    throw new Error('Missing Groq API key. Set VITE_GROQ_API_KEY.');
  }

  // Truncate reference context to prevent exceeding token limits (e.g., 6000 TPM limit on Groq free tier)
  // We keep the last 3000 characters to stay within tight token budgets.
  const MAX_REF_LENGTH = 3000;
  let trimmedReference = referenceContext.trim();
  if (trimmedReference.length > MAX_REF_LENGTH) {
    trimmedReference = '...[earlier context truncated]...\n' + trimmedReference.slice(-MAX_REF_LENGTH);
  }

  const referenceInjection = trimmedReference
    ? `\n\n## COLLECTED BUSINESS CONTEXT (REFERENCE ONLY):\n${trimmedReference}\n\nUse this only as supporting context for responses. Do not proactively fill framework fields unless the user explicitly asks to extract or refine section answers in their current message.`
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

  const messages = [
    { role: 'system' as const, content: SYSTEM_PROMPT + contextInjection },
    ...trimmedHistory.map(m => ({
      role: (m.role === 'agent' ? 'assistant' : 'user') as 'user' | 'assistant',
      content: m.content,
    })),
    { role: 'user' as const, content: processedUserText }
  ];

  let lastError: unknown = null;

  for (const model of GROQ_MODELS) {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await groq.chat.completions.create({
          model,
          messages,
          temperature: 0.2,
          max_tokens: 2048,
          response_format: { type: 'json_object' },
        });

        const raw = response.choices[0]?.message?.content || '{}';
        return parseAgentResponse(raw);
      } catch (err: unknown) {
        lastError = err;
        const errorMsg = String((err as Error)?.message || err);
        
        // Check if this is a quota/rate limit error that we should retry
        if (!isGroqQuotaError(err) || attempt >= retries) {
          break;
        }

        // For quota errors, try next model
        console.warn(`Groq ${model} failed (attempt ${attempt + 1}/${retries + 1}):`, errorMsg);
        await delay(1000 * Math.pow(2, attempt));
      }
    }
  }

  // If all Groq models failed due to quota, return a helpful fallback
  if (isGroqQuotaError(lastError)) {
    console.warn('Groq quota exhausted; returning a safe fallback chat response.', lastError);
    return {
      message: 'The AI service is temporarily rate-limited. Please try again in a few minutes.',
      extractions: [],
    };
  }

  throw lastError instanceof Error ? lastError : new Error('Groq request failed.');
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