// ─── FIRECRAWL SERVICE ──────────────────────────────────────────────
// Handles web scraping via /scrape and country-specific market research via /search

const FIRECRAWL_API_KEY = import.meta.env.VITE_FIRECRAWL_API_KEY || '';
const FIRECRAWL_BASE = 'https://api.firecrawl.dev/v1';

// ─── COUNTRY → ISO CODE MAP ─────────────────────────────────────────

const COUNTRY_ISO: Record<string, string> = {
  'Australia':             'AU',
  'Canada':                'CA',
  'France':                'FR',
  'Germany':               'DE',
  'Ghana':                 'GH',
  'India':                 'IN',
  'Indonesia':             'ID',
  'Ireland':               'IE',
  'Italy':                 'IT',
  'Kenya':                 'KE',
  'Malaysia':              'MY',
  'Netherlands':           'NL',
  'New Zealand':           'NZ',
  'Nigeria':               'NG',
  'Philippines':           'PH',
  'Portugal':              'PT',
  'Saudi Arabia':          'SA',
  'Singapore':             'SG',
  'South Africa':          'ZA',
  'Spain':                 'ES',
  'Sweden':                'SE',
  'Switzerland':           'CH',
  'United Arab Emirates':  'AE',
  'United Kingdom':        'GB',
  'United States':         'US',
  'Zimbabwe':              'ZW',
};

function getIsoCode(country: string): string {
  return COUNTRY_ISO[country] || 'US';
}

// ─── TYPES ──────────────────────────────────────────────────────────

export interface FirecrawlScrapeResult {
  ok: boolean;
  markdown?: string;
  error?: string;
}

export interface FirecrawlSearchSource {
  url: string;
  title: string;
  content: string;
}

export interface FirecrawlMarketResult {
  query: string;
  sources: FirecrawlSearchSource[];
}

// ─── SCRAPE (replaces Jina Reader) ──────────────────────────────────

export async function firecrawlScrape(url: string): Promise<FirecrawlScrapeResult> {
  if (!FIRECRAWL_API_KEY) {
    return { ok: false, error: 'No Firecrawl API key configured' };
  }

  try {
    const res = await fetch(`${FIRECRAWL_BASE}/scrape`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
      },
      body: JSON.stringify({
        url,
        formats: ['markdown'],
        onlyMainContent: true,
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error('Firecrawl scrape error:', res.status, errBody);
      return { ok: false, error: `HTTP ${res.status}: ${errBody.slice(0, 200)}` };
    }

    const data = await res.json();
    const markdown = data?.data?.markdown || '';

    if (!markdown.trim()) {
      return { ok: false, error: 'No readable content found' };
    }

    return { ok: true, markdown: markdown.slice(0, 15000) };
  } catch (err) {
    console.error('Firecrawl scrape exception:', err);
    return { ok: false, error: (err as Error).message };
  }
}

// ─── SEARCH (country-specific market research) ──────────────────────

async function firecrawlSearch(
  query: string,
  country: string,
  limit = 5
): Promise<FirecrawlSearchSource[]> {
  if (!FIRECRAWL_API_KEY) return [];

  try {
    const isoCode = getIsoCode(country);

    const res = await fetch(`${FIRECRAWL_BASE}/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
      },
      body: JSON.stringify({
        query,
        limit,
        scrapeOptions: {
          formats: ['markdown'],
          onlyMainContent: true,
        },
        searchOptions: {
          country: isoCode,
          location: country,
        },
      }),
    });

    if (!res.ok) {
      console.warn(`Firecrawl search failed for "${query}":`, res.status);
      return [];
    }

    const data = await res.json();
    const results = data?.data || [];

    return results
      .filter((r: any) => r?.markdown || r?.content)
      .map((r: any) => ({
        url: r.url || r.sourceUrl || '',
        title: r.title || r.metadata?.title || 'Untitled',
        content: (r.markdown || r.content || '').slice(0, 3000),
      }));
  } catch (err) {
    console.warn(`Firecrawl search exception for "${query}":`, err);
    return [];
  }
}

// ─── PUBLIC: MARKET RESEARCH SEARCH ─────────────────────────────────

export interface MarketResearchParams {
  country: string;
  industry: string;
  profession: string;
  services?: string;
  brandName?: string;
}

export async function searchMarketResearch(
  params: MarketResearchParams,
  onProgress?: (step: string, pct: number) => void
): Promise<FirecrawlMarketResult[]> {
  const { country, industry, profession, services, brandName } = params;

  // Build targeted search queries
  const queries = [
    `${industry} market size ${country} 2025 2026 statistics`,
    `${industry} market trends growth rate ${country}`,
    `${industry} competitive landscape top companies ${country}`,
    `${profession} ${industry} salary benchmarks demand ${country}`,
    `${services || industry} consumer behavior spending ${country}`,
  ];

  const results: FirecrawlMarketResult[] = [];
  const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

  for (let i = 0; i < queries.length; i++) {
    const query = queries[i];
    onProgress?.(
      `Searching: ${query.slice(0, 50)}...`,
      Math.round(((i + 1) / queries.length) * 100)
    );

    const sources = await firecrawlSearch(query, country, 3);
    results.push({ query, sources });

    // Small delay between searches to respect rate limits
    if (i < queries.length - 1) await delay(800);
  }

  return results;
}

// ─── HELPER: Aggregate search results into a research brief ─────────

export function buildResearchBrief(results: FirecrawlMarketResult[]): string {
  if (!results.length) return '';

  const sections = results
    .filter(r => r.sources.length > 0)
    .map(r => {
      const sourceSummaries = r.sources
        .map((s, i) => `  [Source ${i + 1}: ${s.title}](${s.url})\n  ${s.content.slice(0, 1500)}`)
        .join('\n\n');
      return `### Research Query: "${r.query}"\n${sourceSummaries}`;
    })
    .join('\n\n---\n\n');

  return `## REAL MARKET RESEARCH DATA (from web sources)\n\n${sections}`;
}

// ─── CHECK IF FIRECRAWL IS AVAILABLE ────────────────────────────────

export function isFirecrawlConfigured(): boolean {
  return !!FIRECRAWL_API_KEY;
}
