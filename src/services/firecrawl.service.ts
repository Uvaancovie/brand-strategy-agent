// ─── FIRECRAWL SERVICE ──────────────────────────────────────────────
// Handles web scraping via /scrape and country-specific market research via /search
// Optimized for quantitative market data extraction (TAM, CAGR, market share, etc.)

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

// ─── SOURCE QUALITY SCORING ─────────────────────────────────────────

// High-priority domains: government, official statistics, major research firms
const HIGH_PRIORITY_DOMAINS = [
  '.gov', '.gov.uk', '.gov.au', '.gov.za', '.gov.in', '.gov.sg',
  '.stats', '.int', '.org', '.edu', '.eu', '.oecd',
  'statista', 'ibisworld', 'emarketer', 'gartner', 'forrester',
  'mckinsey', 'deloitte', 'pwc', 'ey', 'kpmg', 'accenture',
  'bloomberg', 'reuters', 'ft.com', 'economist',
  'worldbank', 'imf', 'weforum',
];

const MEDIUM_PRIORITY_DOMAINS = [
  'businessinsider', 'cnbc', 'bloomberg', 'techcrunch',
  'venturebeat', 'zdnet', 'computerweekly',
];

function scoreSource(url: string): number {
  const urlLower = url.toLowerCase();
  for (const domain of HIGH_PRIORITY_DOMAINS) {
    if (urlLower.includes(domain)) return 3;
  }
  for (const domain of MEDIUM_PRIORITY_DOMAINS) {
    if (urlLower.includes(domain)) return 2;
  }
  return 1;
}

// Extract numeric patterns from content for metric detection
function extractMetrics(content: string): { metrics: string[]; score: number } {
  const metrics: string[] = [];

  // Currency patterns: $X.XB, $X.XM, ZAR X billion, INR X crore, etc.
  const currencyRegex = /(?:[\$€£₹¥ZAR]|USD|EUR|GBP|INR)\s*\d[\d,.]*(?:\s*(?:billion|million|trillion|B|M|T|cr|crore|Lakh))?/gi;
  const currencyMatches = content.match(currencyRegex) || [];

  // Percentage patterns: XX%, XX.XX%
  const pctRegex = /\b\d{1,3}(?:\.\d+)?%\b/g;
  const pctMatches = content.match(pctRegex) || [];

  // CAGR / growth rate patterns
  const cagrRegex = /(?:CAGR|growth rate|annual growth|compound)\s*(?:of|:)\s*(?:\d+(?:\.\d+)?\s*%)/gi;
  const cagrMatches = content.match(cagrRegex) || [];

  // Market size patterns
  const marketSizeRegex = /(?:market size|market value|market worth|total addressable|TAM)\s*(?:of|:)\s*(?:[\$€£₹¥]?\d[\d,.]*(?:\s*(?:billion|million|trillion|B|M|T))?)/gi;
  const marketSizeMatches = content.match(marketSizeRegex) || [];

  // Ratio / per-capita patterns
  const ratioRegex = /(?:per capita|per user|per customer|per household)\s*(?:of|:)\s*[\$€£₹¥]\d[\d,.]*/gi;
  const ratioMatches = content.match(ratioRegex) || [];

  // Year-over-year / year patterns
  const yoyRegex = /(?:year-over-year|YoY)\s*(?:growth|increase|change)\s*(?:of|:)\s*(?:\d+(?:\.\d+)?\s*%)/gi;
  const yoyMatches = content.match(yoyRegex) || [];

  metrics.push(...currencyMatches, ...pctMatches, ...cagrMatches, ...marketSizeMatches, ...ratioMatches, ...yoyMatches);

  // Score based on number and diversity of metrics found
  const uniqueMetrics = new Set(metrics.map(m => m.toLowerCase().trim()));
  const score = Math.min(uniqueMetrics.size, 10); // 0-10 score

  return { metrics: Array.from(uniqueMetrics).slice(0, 15), score };
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
  qualityScore: number;       // 1-3 (1=blog, 2=news, 3=gov/official)
  extractedMetrics: string[];  // Numeric data points found in content
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
      .map((r: any) => {
        const text = r.markdown || r.content || '';
        const { metrics, score } = extractMetrics(text);
        return {
          url: r.url || r.sourceUrl || '',
          title: r.title || r.metadata?.title || 'Untitled',
          content: text.slice(0, 3000),
          qualityScore: scoreSource(r.url || ''),
          extractedMetrics: metrics,
        };
      });
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

/**
 * Industry-specific search terms to surface quantitative sources.
 * Maps broad industry categories to keywords that help find reports,
 * statistics, and benchmarks with hard numbers.
 */
const INDUSTRY_KEYWORDS: Record<string, string[]> = {
  'Information Technology': ['SaaS', 'enterprise software', 'IT spending', 'cloud computing', 'digital transformation'],
  'Healthcare': ['patient volume', 'hospital revenue', 'medical devices', 'healthcare expenditure', 'pharmaceutical'],
  'E-commerce': ['online sales', 'conversion rate', 'average order value', 'e-commerce revenue'],
  'Finance & Banking': ['fintech', 'digital payments', 'lending', 'insurance penetration', 'AUM'],
  'Real Estate': ['property prices', 'rental yield', 'construction spending', 'housing market'],
  'Retail': ['retail sales', 'foot traffic', 'omnichannel', 'consumer spending'],
  'Manufacturing': ['production output', 'industrial production', 'supply chain', 'factory automation'],
  'Education': ['edtech', 'enrollment', 'student outcomes', 'education spending'],
  'Energy & Utilities': ['renewable energy', 'electricity generation', 'oil production', 'energy consumption'],
  'Telecommunications': ['5G adoption', 'subscriber growth', 'ARPU', 'network coverage'],
  'Food & Beverage': ['food processing', 'organic food', 'beverage consumption', 'restaurant industry'],
  'Agriculture': ['crop production', 'agritech', 'food security', 'agricultural export'],
  'Government & Public Sector': ['public spending', 'government procurement', 'digital government', 'public sector IT'],
  'Professional Services': ['consulting revenue', 'legal services', 'accounting fees', 'advisory'],
  'Creative & Media': ['media spend', 'advertising revenue', 'content creation', 'streaming'],
  'Entertainment': ['gaming revenue', 'streaming subscriptions', 'live events', 'ticket sales'],
  'Nonprofit & NGO': ['donations', 'grant funding', 'social impact', 'NGO revenue'],
  'Construction': ['construction spending', 'infrastructure investment', 'building permits', 'real estate development'],
  'Logistics & Supply Chain': ['freight', 'last mile', 'warehouse automation', 'supply chain technology'],
  'Beauty & Cosmetics': ['beauty market', 'personal care', 'cosmetics sales', 'skincare'],
  'Cybersecurity': ['cybersecurity spending', 'data breach cost', 'security software', 'threat detection'],
};

export async function searchMarketResearch(
  params: MarketResearchParams,
  onProgress?: (step: string, pct: number) => void
): Promise<FirecrawlMarketResult[]> {
  const { country, industry, profession, services, brandName } = params;

  // Base quantitative queries applicable to all industries
  const baseQueries = [
    `${industry} market size ${country} 2025 2026 billion USD`,
    `${industry} CAGR growth rate ${country} statistics forecast`,
    `${industry} top companies market share ${country} 2025`,
  ];

  // Add industry-specific queries
  const industryKeywords = INDUSTRY_KEYWORDS[industry] || [];
  const industryQueries = industryKeywords.map(kw =>
    `${kw} ${country} market research statistics report`
  );

  // Add profession-specific salary/compensation queries
  const salaryQueries = [
    `${profession} salary ${country} average compensation 2025`,
    `${industry} employee compensation benchmark ${country}`,
  ];

  // Add consumer behavior / KPI queries
  const consumerQueries = [
    `${industry} customer acquisition cost ${country}`,
    `${industry} consumer spending habits ${country} 2025`,
    `${services || industry} churn rate retention ${country}`,
  ];

  // Add regulatory / compliance queries
  const regulatoryQueries = [
    `${industry} regulation compliance cost ${country} 2025`,
    `${industry} government policy impact ${country}`,
  ];

  // Combine all queries, deduplicate, and limit to top 8 for thorough coverage
  const allQueries = [
    ...baseQueries,
    ...industryQueries.slice(0, 3),
    ...salaryQueries,
    ...consumerQueries,
    ...regulatoryQueries,
  ];

  // Remove duplicates and limit to 8 queries
  const uniqueQueries = Array.from(new Set(allQueries)).slice(0, 8);

  const results: FirecrawlMarketResult[] = [];
  const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

  for (let i = 0; i < uniqueQueries.length; i++) {
    const query = uniqueQueries[i];
    onProgress?.(
      `Searching: ${query.slice(0, 50)}...`,
      Math.round(((i + 1) / uniqueQueries.length) * 100)
    );

    const sources = await firecrawlSearch(query, country, 3);

    // Sort sources by quality score before storing
    sources.sort((a, b) => b.qualityScore - a.qualityScore);

    results.push({ query, sources });

    // Small delay between searches to respect rate limits
    if (i < uniqueQueries.length - 1) await delay(600);
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
        .map((s, i) => {
          const qualityTag = s.qualityScore >= 3 ? '[OFFICIAL/REPORT]' : s.qualityScore >= 2 ? '[REPUTABLE SOURCE]' : '[GENERAL]';
          const metricsNote = s.extractedMetrics.length > 0
            ? `\n  Key metrics found: ${s.extractedMetrics.slice(0, 8).join(', ')}`
            : '';
          return `  [Source ${i + 1}: ${s.title}](${s.url}) ${qualityTag}${metricsNote}\n  ${s.content.slice(0, 1500)}`;
        })
        .join('\n\n');
      return `### Research Query: "${r.query}"\n${sourceSummaries}`;
    })
    .join('\n\n---\n\n');

  return `## REAL MARKET RESEARCH DATA (from web sources)\n\n${sections}`;
}

/**
 * Extract all numeric metrics from source content across all results.
 * Used for the Mark Panel metric dashboard display.
 */
export function extractAllMetrics(results: FirecrawlMarketResult[]): { label: string; value: string; source: string }[] {
  const metrics: { label: string; value: string; source: string }[] = [];
  const seen = new Set<string>();

  for (const result of results) {
    for (const source of result.sources) {
      for (const metric of source.extractedMetrics) {
        const key = metric.toLowerCase().trim();
        if (!seen.has(key) && metric.length > 3) {
          seen.add(key);
          metrics.push({
            label: metric.trim(),
            value: metric.trim(),
            source: source.title || source.url,
          });
        }
      }
    }
  }

  // Deduplicate and prioritize
  return metrics.slice(0, 20);
}

// ─── CHECK IF FIRECRAWL IS AVAILABLE ────────────────────────────────

export function isFirecrawlConfigured(): boolean {
  return !!FIRECRAWL_API_KEY;
}
