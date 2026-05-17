// ─── MARKET DASHBOARD SERVICE ────────────────────────────────────────
// Service for fetching and managing market research data for dashboard display

import { generateMarketData, type GenerateMarketDataParams, type MarketData } from './market.service';
import { firecrawlScrape } from './firecrawl.service';
import type { FirecrawlMarketResult } from './firecrawl.service';
import { groq } from './groq.service';

export interface MarketResearchDisplayData {
  data: any;
  sourcesCount: number;
  lastUpdated: string;
  firecrawlResults: FirecrawlMarketResult[];
}

const GROQ_MODEL = (import.meta.env.VITE_GROQ_MODELS || import.meta.env.VITE_GROQ_MODEL || 'llama-3.1-8b-instant')
  .split(',')
  .map((model: string) => model.trim())
  .filter(Boolean)[0];

function cleanJson(raw: string): string {
  const trimmed = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const first = trimmed.indexOf('{');
  const last = trimmed.lastIndexOf('}');
  return first >= 0 && last > first ? trimmed.slice(first, last + 1) : trimmed;
}

function ensureUrl(raw: string): string {
  const value = raw.trim();
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value}`;
}

export async function scrapeAndAnalyzeCustomSource(
  rawUrl: string,
  userPrompt: string,
  onProgress?: (step: string, pct: number) => void
): Promise<Record<string, string | number | boolean | null>[]> {
  const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
  if (!GROQ_API_KEY) {
    throw new Error('Missing Groq API key');
  }

  const url = ensureUrl(rawUrl);
  if (!url) {
    throw new Error('Missing URL');
  }

  const prompt = userPrompt.trim();
  if (!prompt) {
    throw new Error('Missing extraction prompt');
  }

  onProgress?.('Scraping page content...', 15);
  const scrapeResult = await firecrawlScrape(url);
  if (!scrapeResult.ok || !scrapeResult.markdown) {
    throw new Error(scrapeResult.error || 'Failed to scrape URL');
  }

  onProgress?.('Analyzing content with AI...', 55);
  const systemPrompt =
    'You are a data extraction engine. Given webpage content and a user goal, extract structured data.' +
    ' Return ONLY valid JSON with a top-level array field named "data_table". ' +
    'Each array item must be an object representing one row. Do not include markdown.';

  const content = scrapeResult.markdown.slice(0, 14000);
  const completion = await groq.chat.completions.create({
    model: GROQ_MODEL,
    response_format: { type: 'json_object' },
    temperature: 0.1,
    max_tokens: 1800,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `WEB CONTENT:\n${content}\n\nUSER REQUEST:\n${prompt}` },
    ],
  });

  onProgress?.('Formatting extracted data...', 85);
  const raw = completion.choices[0]?.message?.content || '{"data_table": []}';
  const parsed = JSON.parse(cleanJson(raw)) as { data_table?: unknown };
  const table = Array.isArray(parsed.data_table) ? parsed.data_table : [];

  const normalized = table.filter(row => row && typeof row === 'object' && !Array.isArray(row)) as Record<string, string | number | boolean | null>[];
  onProgress?.('Complete', 100);
  return normalized;
}

/**
 * Fetch market research data for dashboard display
 * This is similar to generateMarketData but optimized for UI consumption
 */
export async function fetchMarketResearchForDisplay(
  params: Omit<GenerateMarketDataParams, 'onProgress'>,
  onProgress?: (step: string, pct: number) => void
): Promise<MarketResearchDisplayData> {
  try {
    onProgress?.('Initializing market research...', 0);
    
    // Generate market data using existing service
    const result = await generateMarketData({
      ...params,
      onProgress: (step, pct) => {
        // Map progress from market service to our dashboard progress
        onProgress?.(step, pct);
      }
    });
    
    onProgress?.('Finalizing market research data...', 90);
    
    // Return formatted data for dashboard
    return {
      data: result.marketData,
      sourcesCount: result.firecrawlResults.reduce((sum, r) => sum + r.sources.length, 0),
      lastUpdated: new Date().toISOString(),
      firecrawlResults: result.firecrawlResults,
    };
  } catch (error) {
    console.error('Error fetching market research for dashboard:', error);
    throw error;
  }
}

/**
 * Check if we have valid market research data in state
 */
export function hasValidMarketResearch(data: any): data is MarketData {
  return Boolean(
    data &&
    data.executiveSummary &&
    data.industryOverview &&
    data.marketSizing
  );
}

/**
 * Format market data for chart consumption
 */
export function formatMarketDataForCharts(marketData: any) {
  if (!marketData) return {};
  
  return {
    // Industry overview metrics
    industryMetrics: marketData.industryOverview?.metrics || [],
    
    // Market sizing data for funnel chart
    marketSizing: {
      tam: marketData.marketSizing?.tam?.value || '0',
      sam: marketData.marketSizing?.sam?.value || '0', 
      som: marketData.marketSizing?.som?.value || '0'
    },
    
    // Target market metrics
    targetMetrics: marketData.targetMarketSegmentation?.metrics || [],
    
    // SWOT data for radar/spider chart
    swot: {
      strengths: marketData.swotAnalysis?.strengths?.length || 0,
      weaknesses: marketData.swotAnalysis?.weaknesses?.length || 0,
      opportunities: marketData.swotAnalysis?.opportunities?.length || 0,
      threats: marketData.swotAnalysis?.threats?.length || 0
    },
    
    // KPI framework
    kpiFramework: marketData.kpiFramework || []
  };
}