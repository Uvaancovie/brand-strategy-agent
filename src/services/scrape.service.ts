// ─── SCRAPE SERVICE ─────────────────────────────────────────────────
// Fetches readable text from website and public LinkedIn URLs

export interface ScrapeResult {
  source: 'website' | 'linkedin';
  url: string;
  ok: boolean;
  text?: string;
  error?: string;
}

const MAX_TEXT = 12000;

function ensureUrl(raw: string): string {
  const value = raw.trim();
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value}`;
}

function toJinaProxyUrl(url: string): string {
  const normalized = ensureUrl(url);
  const withoutProto = normalized.replace(/^https?:\/\//i, '');
  return `https://r.jina.ai/http://${withoutProto}`;
}

function cleanText(text: string): string {
  return text
    .replace(/\s{3,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, MAX_TEXT);
}

async function fetchReadable(url: string): Promise<string> {
  const proxyUrl = toJinaProxyUrl(url);
  const res = await fetch(proxyUrl);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = await res.text();
  if (!text.trim()) throw new Error('No readable content found');
  return cleanText(text);
}

export async function scrapeContextSources(params: {
  websiteUrl?: string;
  linkedinUrl?: string;
}): Promise<ScrapeResult[]> {
  const tasks: Array<Promise<ScrapeResult>> = [];

  const website = ensureUrl(params.websiteUrl || '');
  if (website) {
    tasks.push(
      fetchReadable(website)
        .then(text => ({ source: 'website' as const, url: website, ok: true, text }))
        .catch((e: Error) => ({ source: 'website' as const, url: website, ok: false, error: e.message || 'Failed to scrape website' }))
    );
  }

  const linkedin = ensureUrl(params.linkedinUrl || '');
  if (linkedin) {
    tasks.push(
      fetchReadable(linkedin)
        .then(text => ({ source: 'linkedin' as const, url: linkedin, ok: true, text }))
        .catch((e: Error) => ({ source: 'linkedin' as const, url: linkedin, ok: false, error: e.message || 'Failed to scrape LinkedIn' }))
    );
  }

  return Promise.all(tasks);
}
