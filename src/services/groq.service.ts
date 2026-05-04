// ─── GROQ SERVICE ───────────────────────────────────────────────────
// All Groq API calls: chat completion (JSON mode) + audio transcription
// Replaces fragile regex-based [EXTRACT:] parsing with typed JSON output

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

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

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
  const referenceInjection = referenceContext.trim()
    ? `\n\n## COLLECTED BUSINESS CONTEXT (REFERENCE ONLY):\n${referenceContext}\n\nUse this only as supporting context for responses. Do not proactively fill framework fields unless the user explicitly asks to extract or refine section answers in their current message.`
    : '';

  const contextInjection = `\n\n---\n## CURRENT B.I.G DOC STATUS:\n${buildBrandscriptContext()}${referenceInjection}\n---\n`;

  const trimmedHistory = getTrimmedHistory();
  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: SYSTEM_PROMPT + contextInjection },
    ...trimmedHistory.map(m => ({
      role: (m.role === 'agent' ? 'assistant' : 'user') as 'user' | 'assistant',
      content: m.content,
    })),
    { role: 'user', content: userText }
  ];

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages,
      model: 'llama-3.3-70b-versatile',
      response_format: { type: 'json_object' },
    });

    const raw = chatCompletion.choices[0]?.message?.content || '{}';
    return parseAgentResponse(raw);

  } catch (err: unknown) {
    const error = err as Error;
    if (retries > 0 && error.message && (error.message.includes('quota') || error.message.includes('429'))) {
      console.warn(`Rate limit hit. Retrying... (${retries} left)`);
      await delay(2500);
      return callGroq(userText, retries - 1, referenceContext);
    }
    throw err;
  }
}

// ─── PARSE JSON RESPONSE ────────────────────────────────────────────

function parseAgentResponse(raw: string): AgentResponse {
  try {
    const parsed = JSON.parse(raw);

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
      message: raw,
      extractions: [],
    };
  }
}

// ─── AUDIO TRANSCRIPTION ────────────────────────────────────────────

export async function transcribeAudio(file: File): Promise<string> {
  const translation = await groq.audio.translations.create({
    file,
    model: 'whisper-large-v3',
    temperature: 0,
    response_format: 'json',
  });
  return (translation.text || '').trim();
}
