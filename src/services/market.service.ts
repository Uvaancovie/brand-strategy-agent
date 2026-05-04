// ─── MARKET INTELLIGENCE SERVICE ────────────────────────────────────
// Generates structured, quantitative market intelligence via:
// 1. Firecrawl /search for REAL country-specific market data
// 2. Gemini AI to synthesize and structure the research
// Includes hard numbers, benchmarks & KPIs.

import { GoogleGenAI } from '@google/genai';
import {
  searchMarketResearch,
  buildResearchBrief,
  isFirecrawlConfigured,
  type FirecrawlMarketResult,
  type MarketResearchParams,
} from './firecrawl.service';
import { generateOllamaJson, type OllamaChatMessage } from './ollama.service';

// ─── OUTPUT TYPES ───────────────────────────────────────────────────

export interface BoxMetric {
  label: string;
  value: string;
}

export interface MarketData {
  executiveSummary: string;
  industryOverview: {
    narrative: string;
    metrics: BoxMetric[];
  };
  marketSizing: {
    tam: { value: string; description: string };
    sam: { value: string; description: string };
    som: { value: string; description: string };
    growth_cagr: string;
    narrative: string;
  };
  targetMarketSegmentation: {
    primary: { name: string; description: string; demographics: string; psychographics: string };
    secondary: { name: string; description: string; demographics: string; psychographics: string };
    metrics: BoxMetric[];
  };
  competitivePositioning: {
    competitors: { archetype: string; market_share: string; price_tier: string; strength: string; weakness: string }[];
    narrative: string;
  };
  swotAnalysis: {
    strengths: { factor: string; impact: string }[];
    weaknesses: { factor: string; impact: string }[];
    opportunities: { factor: string; impact: string }[];
    threats: { factor: string; impact: string }[];
  };
  strategicRecommendations: {
    title: string;
    timeline: string;
    investment: string;
    roi: string;
    priority: string;
    steps: string[];
  }[];
  kpiFramework: {
    category: string;
    metric: string;
    baseline: string;
    target_6m: string;
    target_12m: string;
    frequency: string;
  }[];
  // New: track data sources
  dataSources?: { url: string; title: string }[];
}

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));
const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY || import.meta.env.VITE_GEMINI_API_KEY || '';
const GOOGLE_MODELS = (import.meta.env.VITE_GOOGLE_MODELS || import.meta.env.VITE_GOOGLE_MODEL || 'gemini-2.5-flash,gemini-2.5-flash-lite,gemini-2.0-flash')
  .split(',')
  .map(model => model.trim())
  .filter(Boolean);
const gemini = GOOGLE_API_KEY ? new GoogleGenAI({ apiKey: GOOGLE_API_KEY }) : null;
const OLLAMA_RETRIES = 1;

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

function buildFallbackMarketData(country: string, industry: string): MarketData {
  return {
    executiveSummary: `Market intelligence could not be generated live due to an AI quota limit. This fallback report provides a conservative, strategy-first overview for a ${industry} business in ${country}.`,
    industryOverview: {
      narrative: `Live AI synthesis was unavailable, so this section uses a fallback narrative for the ${industry} market in ${country}. Replace with refreshed market research when quota access returns.`,
      metrics: [
        { label: 'REPORT STATUS', value: 'Fallback' },
        { label: 'MARKET FOCUS', value: `${industry} in ${country}` },
      ],
    },
    marketSizing: {
      tam: { value: 'N/A', description: 'Live sizing unavailable while the AI service is rate-limited.' },
      sam: { value: 'N/A', description: 'Live sizing unavailable while the AI service is rate-limited.' },
      som: { value: 'N/A', description: 'Live sizing unavailable while the AI service is rate-limited.' },
      growth_cagr: 'N/A',
      narrative: `Use the collected web sources to validate market sizing for ${industry} in ${country} once AI access is restored.`,
    },
    targetMarketSegmentation: {
      primary: {
        name: 'Primary buyers',
        description: `Core customers for a ${industry} offer in ${country}.`,
        demographics: 'N/A',
        psychographics: 'N/A',
      },
      secondary: {
        name: 'Secondary buyers',
        description: `Adjacent customers for a ${industry} offer in ${country}.`,
        demographics: 'N/A',
        psychographics: 'N/A',
      },
      metrics: [],
    },
    competitivePositioning: {
      competitors: [],
      narrative: `Competitive positioning for ${industry} in ${country} could not be synthesized live because the AI quota was exceeded.`,
    },
    swotAnalysis: {
      strengths: [{ factor: 'Collected source material', impact: 'Provides a basis for later analysis' }],
      weaknesses: [{ factor: 'AI quota exhaustion', impact: 'Prevents live synthesis' }],
      opportunities: [{ factor: 'Refresh the report later', impact: 'Unlocks a richer, quantified market view' }],
      threats: [{ factor: 'Stale market assumptions', impact: 'May reduce decision quality until rerun' }],
    },
    strategicRecommendations: [
      {
        title: 'Re-run market synthesis',
        timeline: 'Immediately when quota is restored',
        investment: 'Low',
        roi: 'High',
        priority: 'High',
        steps: ['Refresh the AI generation step', 'Validate sourced market numbers', 'Regenerate the PDF'],
      },
    ],
    kpiFramework: [
      {
        category: 'Process',
        metric: 'Report generation success',
        baseline: 'Failing',
        target_6m: 'Successful',
        target_12m: 'Successful',
        frequency: 'Each run',
      },
    ],
  };
}

// ─── PROMPT ─────────────────────────────────────────────────────────

function buildMarketPrompt(brandContext: string, researchBrief: string, country: string, industry: string): string {
  const realDataSection = researchBrief
    ? `\n\nREAL MARKET RESEARCH DATA (scraped from live web sources specific to ${country}):\n${researchBrief}\n\nCRITICAL: Use the above REAL research data to ground your analysis. Reference specific numbers, statistics, and trends from these sources. Do NOT fabricate data when real data is available above.`
    : '';

  return `You are a senior brand strategist and market research analyst preparing a premium Brand Identity Guiding Document (B.I.G Doc) for a client based in ${country}, operating in the ${industry} industry. Based on the brand context and real market research data below, generate a comprehensive, data-rich market intelligence report.

CRITICAL REQUIREMENTS:
1. Include SPECIFIC QUANTITATIVE DATA — percentages, dollar figures, growth rates, market sizes, demographic breakdowns, and benchmarking scores. Use the real research data provided when available.
2. All data MUST be specific to ${country} and the ${industry} industry. Use local currency, local market conditions, and locally relevant competitors.
3. Use professional consulting language (McKinsey/Bain style).
4. Do NOT use markdown in your text fields. Do not use asterisks or headers inside string values.
5. You MUST return EXACTLY ONE JSON Object matching the strict schema below.
6. When citing real data from the research brief, be specific about the numbers and their context.

BRAND CONTEXT:
${brandContext || 'No specific brand context was collected. Generate market intelligence for a business in ' + industry + ' in ' + country + '.'}
${realDataSection}

SCHEMA PROMPT:
Respond ONLY with perfectly valid JSON matching this exact structure layout. Do not include any text before or after the JSON.

{
  "executiveSummary": "150-word executive summary combining qualitative position with 2-3 key quantitative stats specific to ${country}.",
  "industryOverview": {
    "narrative": "Detailed ${industry} industry landscape analysis for ${country}...",
    "metrics": [
      { "label": "EST. TOTAL VALUE", "value": "$5B" },
      { "label": "5-YEAR CAGR", "value": "12.5%" },
      { "label": "PRIMARY DRIVER", "value": "AI Adoption" },
      { "label": "REGULATORY RISK", "value": "Medium" }
    ]
  },
  "marketSizing": {
    "tam": { "value": "$10B+", "description": "Total Addressable Market in ${country}..." },
    "sam": { "value": "$1B+", "description": "Serviceable Addressable Market..." },
    "som": { "value": "$50M", "description": "Serviceable Obtainable Market..." },
    "growth_cagr": "15%",
    "narrative": "Detailed market sizing narrative specific to ${country}..."
  },
  "targetMarketSegmentation": {
    "primary": { "name": "Early Adopters", "description": "Core target in ${country}...", "demographics": "25-45, income data in local currency", "psychographics": "Tech-forward, values speed over price" },
    "secondary": { "name": "Value Seekers", "description": "Secondary segment...", "demographics": "35-55, income data in local currency", "psychographics": "Practical, needs social proof" },
    "metrics": [
      { "label": "EST. CLV", "value": "local currency value" },
      { "label": "TARGET CAC", "value": "local currency value" },
      { "label": "RETENTION GOAL", "value": "85%" }
    ]
  },
  "competitivePositioning": {
    "competitors": [
      { "archetype": "The Legacy Giant", "market_share": "45%", "price_tier": "Premium", "strength": "Brand Trust", "weakness": "Slow Innovation" },
      { "archetype": "The Scrappy Startup", "market_share": "5%", "price_tier": "Budget", "strength": "Agility", "weakness": "Limited Capital" },
      { "archetype": "The Niche Specialist", "market_share": "15%", "price_tier": "Luxury", "strength": "Deep Expertise", "weakness": "Narrow Focus" }
    ],
    "narrative": "Competitive positioning in ${country} ${industry} market..."
  },
  "swotAnalysis": {
    "strengths": [
      { "factor": "Proprietary Tech", "impact": "High barrier to entry" },
      { "factor": "Agile Team", "impact": "Faster iterations" }
    ],
    "weaknesses": [
      { "factor": "Limited Brand Awareness", "impact": "High CAC initially" }
    ],
    "opportunities": [
      { "factor": "New Market Segments", "impact": "Untapped revenue" }
    ],
    "threats": [
      { "factor": "Economic Downturn", "impact": "Budget constraints" }
    ]
  },
  "strategicRecommendations": [
    { 
      "title": "Establish Thought Leadership", 
      "timeline": "Q1-Q2", 
      "investment": "local currency estimate", 
      "roi": "Medium-Term Brand Equity", 
      "priority": "High", 
      "steps": ["Publish whitepaper", "Speak at 2 major conferences", "Launch podcast"] 
    }
  ],
  "kpiFramework": [
    { "category": "Growth", "metric": "MRR", "baseline": "local currency 0", "target_6m": "local currency value", "target_12m": "local currency value", "frequency": "Monthly" },
    { "category": "Brand", "metric": "Website Visitors", "baseline": "0", "target_6m": "10k/mo", "target_12m": "50k/mo", "frequency": "Weekly" }
  ]
}`;
}

// ─── PUBLIC API ──────────────────────────────────────────────────────

const FALLBACK_MARKET_DATA: MarketData = {
  executiveSummary: "Data generation encountered an issue. Please try regenerating the PDF.",
  industryOverview: { narrative: "N/A", metrics: [] },
  marketSizing: {
    tam: { value: "N/A", description: "N/A" },
    sam: { value: "N/A", description: "N/A" },
    som: { value: "N/A", description: "N/A" },
    growth_cagr: "N/A",
    narrative: "N/A"
  },
  targetMarketSegmentation: {
    primary: { name: "N/A", description: "N/A", demographics: "N/A", psychographics: "N/A" },
    secondary: { name: "N/A", description: "N/A", demographics: "N/A", psychographics: "N/A" },
    metrics: []
  },
  competitivePositioning: { competitors: [], narrative: "N/A" },
  swotAnalysis: { strengths: [], weaknesses: [], opportunities: [], threats: [] },
  strategicRecommendations: [],
  kpiFramework: []
};

export interface GenerateMarketDataParams {
  brandContext: string;
  country: string;
  industry: string;
  profession: string;
  services?: string;
  onProgress?: (step: string, pct: number) => void;
}

export interface GenerateMarketDataResult {
  marketData: MarketData;
  firecrawlResults: FirecrawlMarketResult[];
}

export async function generateMarketData(
  params: GenerateMarketDataParams,
  retries = 2
): Promise<GenerateMarketDataResult> {
  const { brandContext, country, industry, profession, services, onProgress } = params;
  let firecrawlResults: FirecrawlMarketResult[] = [];
  let researchBrief = '';

  // Step 1: Firecrawl search for real market data
  if (isFirecrawlConfigured()) {
    onProgress?.('Searching real market data...', 10);
    try {
      const searchParams: MarketResearchParams = {
        country,
        industry,
        profession,
        services,
      };
      firecrawlResults = await searchMarketResearch(searchParams, (step, pct) => {
        onProgress?.(step, Math.round(10 + pct * 0.4)); // 10-50%
      });
      researchBrief = buildResearchBrief(firecrawlResults);
      
      // TRUNCATION: Keep the prompt within token limits (approx 6000 TPM on free tier)
      // 8000 characters is roughly 2000 tokens, leaving room for output and other instructions.
      if (researchBrief.length > 8000) {
        researchBrief = researchBrief.substring(0, 8000) + '\\n...[TRUNCATED to fit limits]';
      }

      const totalSources = firecrawlResults.reduce((sum, r) => sum + r.sources.length, 0);
      onProgress?.(`Found ${totalSources} sources. Analyzing with AI...`, 55);
    } catch (err) {
      console.warn('Firecrawl search failed, proceeding with AI-only:', err);
      onProgress?.('Search unavailable. Using AI analysis...', 50);
    }
  } else {
    onProgress?.('Generating market intelligence with AI...', 30);
  }

  // Step 2: Groq AI to synthesize
  const prompt = buildMarketPrompt(brandContext, researchBrief, country, industry);
  let raw = '';
  const ollamaMessages: OllamaChatMessage[] = [
    {
      role: 'system',
      content: `You are a world-class brand strategy consultant specializing in ${country} markets. You always respond with perfectly formatted JSON matching the requested schema exactly. Never output conversational text. All monetary values should use the local currency of ${country}.`,
    },
    { role: 'user', content: prompt },
  ];

  try {
    onProgress?.('AI synthesizing market report...', 65);

    if (!gemini) {
      throw new Error('Missing Gemini API key. Set VITE_GOOGLE_API_KEY or VITE_GEMINI_API_KEY.');
    }

    const synthesisPrompt = `You are a world-class brand strategy consultant specializing in ${country} markets. You always respond with perfectly formatted JSON matching the requested schema exactly. Never output conversational text. All monetary values should use the local currency of ${country}.\n\n${prompt}`;

    let lastError: unknown = null;
    let success = false;

    for (const model of GOOGLE_MODELS) {
      for (let attempt = 0; attempt <= retries; attempt++) {
        try {
          const response = await gemini.models.generateContent({
            model,
            contents: synthesisPrompt,
            config: {
              responseMimeType: 'application/json',
              maxOutputTokens: 4096,
              temperature: 0.2,
            },
          });

          raw = response.text || '{}';
          success = true;
          break;
        } catch (err) {
          lastError = err;
          const message = String((err as Error)?.message || err);
          const isRetryable = message.includes('503') || message.includes('UNAVAILABLE') || message.includes('429') || message.includes('rate_limit_exceeded');
          if (!isRetryable || attempt >= retries) break;

          const backoff = 1000 * Math.pow(2, attempt);
          console.warn(`Market Gemini ${model} retry ${attempt + 1}/${retries + 1} after ${backoff}ms:`, message);
          await delay(backoff);
        }
      }

      if (success) break;
    }

    if (!success) {
      try {
        onProgress?.('Trying Ollama fallback for market analysis...', 75);
        raw = await generateOllamaJson(ollamaMessages, OLLAMA_RETRIES);
        success = true;
      } catch (ollamaError) {
        const fallback = buildFallbackMarketData(country, industry);
        if (lastError) {
          console.warn('Market AI unavailable, using fallback market data:', lastError);
        }
        console.warn('Ollama fallback failed for market analysis:', ollamaError);
        onProgress?.('AI quota limit reached. Using fallback market analysis...', 90);
        onProgress?.('Market data ready!', 100);
        return { marketData: fallback, firecrawlResults };
      }
    }

    onProgress?.('Finalizing market data...', 90);
  } catch (err: unknown) {
    const error = err as Error;
    if (retries > 0 && isGeminiQuotaError(error)) {
      console.warn(`Market data: rate limit or quota hit. Retrying... (${retries} left)`);
      await delay(2500);
      return generateMarketData(params, retries - 1);
    }

    if (isGeminiQuotaError(error)) {
      console.warn('Market data: quota exhausted, returning fallback market report.');
      onProgress?.('AI quota limit reached. Using fallback market analysis...', 90);
      onProgress?.('Market data ready!', 100);
      return { marketData: buildFallbackMarketData(country, industry), firecrawlResults };
    }
    throw err;
  }

  try {
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned) as MarketData;

    // Track data sources
    const dataSources = firecrawlResults
      .flatMap(r => r.sources.map(s => ({ url: s.url, title: s.title })))
      .filter(s => s.url);

    const marketData: MarketData = {
      executiveSummary: parsed.executiveSummary || FALLBACK_MARKET_DATA.executiveSummary,
      industryOverview: parsed.industryOverview || FALLBACK_MARKET_DATA.industryOverview,
      marketSizing: parsed.marketSizing || FALLBACK_MARKET_DATA.marketSizing,
      targetMarketSegmentation: parsed.targetMarketSegmentation || FALLBACK_MARKET_DATA.targetMarketSegmentation,
      competitivePositioning: parsed.competitivePositioning || FALLBACK_MARKET_DATA.competitivePositioning,
      swotAnalysis: parsed.swotAnalysis || FALLBACK_MARKET_DATA.swotAnalysis,
      strategicRecommendations: parsed.strategicRecommendations || FALLBACK_MARKET_DATA.strategicRecommendations,
      kpiFramework: parsed.kpiFramework || FALLBACK_MARKET_DATA.kpiFramework,
      dataSources,
    };

    onProgress?.('Market data ready!', 100);
    return { marketData, firecrawlResults };
  } catch (err) {
    console.error('Market data parse error:', err, 'Raw:', raw);
    return { marketData: FALLBACK_MARKET_DATA, firecrawlResults };
  }
}
