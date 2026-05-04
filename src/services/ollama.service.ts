export interface OllamaChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

const OLLAMA_HOST = (import.meta.env.VITE_OLLAMA_HOST || 'http://localhost:11434').replace(/\/$/, '');
const OLLAMA_MODELS = (import.meta.env.VITE_OLLAMA_MODELS || import.meta.env.VITE_OLLAMA_MODEL || 'deepseek-r1:8b,llama3.1,qwen2.5')
  .split(',')
  .map((model: string) => model.trim())
  .filter(Boolean);

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

function isOllamaRetryableError(err: unknown): boolean {
  const message = String((err as Error)?.message || err).toLowerCase();
  return (
    message.includes('failed to fetch') ||
    message.includes('networkerror') ||
    message.includes('fetch') ||
    message.includes('econnrefused') ||
    message.includes('ehostunreach') ||
    message.includes('ollama') ||
    message.includes('429') ||
    message.includes('503') ||
    message.includes('unavailable')
  );
}

export async function generateOllamaJson(messages: OllamaChatMessage[], retries = 1): Promise<string> {
  let lastError: unknown = null;

  for (const model of OLLAMA_MODELS) {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await fetch(`${OLLAMA_HOST}/api/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
            messages,
            format: 'json',
            stream: false,
            options: {
              temperature: 0.2,
              num_predict: 4096,
            },
          }),
        });

        if (!response.ok) {
          const detail = await response.text();
          throw new Error(`Ollama request failed (${response.status}): ${detail}`);
        }

        const data = await response.json() as { message?: { content?: string }; response?: string };
        const content = data.message?.content || data.response || '{}';
        return typeof content === 'string' ? content : '{}';
      } catch (err) {
        lastError = err;
        if (!isOllamaRetryableError(err) || attempt >= retries) break;

        const backoff = 1000 * Math.pow(2, attempt);
        console.warn(`Ollama ${model} retry ${attempt + 1}/${retries + 1} after ${backoff}ms:`, err);
        await delay(backoff);
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Ollama request failed.');
}