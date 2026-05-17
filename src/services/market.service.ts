// ─── MARKET INTELLIGENCE SERVICE (MARK AGENT) ────────────────────────
// Generates structured, quantitative market intelligence via:
// 1. Firecrawl /search for REAL country-specific market data
// 2. Groq AI to synthesize and structure the research
// Includes hard numbers, benchmarks & KPIs.
// AMA Framework: Data → Analysis → Action

import Groq from 'groq-sdk';
import {
  searchMarketResearch,
  buildResearchBrief,
  extractAllMetrics,
  isFirecrawlConfigured,
  type FirecrawlMarketResult,
  type MarketResearchParams,
} from './firecrawl.service';
// Strictly using Groq - no Ollama fallback

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
    targetPersona?: {
      name: string;
      role: string;
      painPoint: string;
      motivation: string;
    };
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
  // Track data sources
  dataSources?: { url: string; title: string }[];
  // Raw extracted metrics from web sources
  extractedMetrics?: BoxMetric[];
}

// ─── GROQ INITIALIZATION ──────────────────────────────────────────────

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY || '';
const GROQ_MODELS = (import.meta.env.VITE_GROQ_MODELS || import.meta.env.VITE_GROQ_MODEL || 'llama-3.1-8b-instant,llama-3.3-70b-versatile')
  .split(',')
  .map((model: string) => model.trim())
  .filter(Boolean);
const groq = GROQ_API_KEY ? new Groq({ apiKey: GROQ_API_KEY, dangerouslyAllowBrowser: true }) : null;

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));
const MAX_BRAND_CONTEXT_CHARS = 1200;
const MAX_RESEARCH_BRIEF_CHARS = 2500;

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

// ─── LOCAL CURRENCY MAP ─────────────────────────────────────────────

const CURRENCY_MAP: Record<string, string> = {
  'United States': 'USD',
  'Australia': 'AUD',
  'Canada': 'CAD',
  'France': 'EUR',
  'Germany': 'EUR',
  'Ghana': 'GHS',
  'India': 'INR',
  'Indonesia': 'IDR',
  'Ireland': 'EUR',
  'Italy': 'EUR',
  'Kenya': 'KES',
  'Malaysia': 'MYR',
  'Netherlands': 'EUR',
  'New Zealand': 'NZD',
  'Nigeria': 'NGN',
  'Philippines': 'PHP',
  'Portugal': 'EUR',
  'Saudi Arabia': 'SAR',
  'Singapore': 'SGD',
  'South Africa': 'ZAR',
  'Spain': 'EUR',
  'Sweden': 'SEK',
  'Switzerland': 'CHF',
  'United Arab Emirates': 'AED',
  'United Kingdom': 'GBP',
  'Zimbabwe': 'ZWL',
};

function getCurrency(country: string): string {
  return CURRENCY_MAP[country] || 'USD';
}

// ─── FALLBACK MARKET DATA ───────────────────────────────────────────

function buildFallbackMarketData(country: string, industry: string): MarketData {
  const currency = getCurrency(country);
  return {
    executiveSummary: `Market intelligence could not be generated live due to an AI quota limit. This fallback report provides a conservative, strategy-first overview for a ${industry} business in ${country}.`,
    industryOverview: {
      narrative: `Live AI synthesis was unavailable, so this section uses a fallback narrative for the ${industry} market in ${country}. Replace with refreshed market research when quota access returns.`,
      metrics: [
        { label: 'REPORT STATUS', value: 'Fallback — AI Quota Exhausted' },
        { label: 'MARKET FOCUS', value: `${industry} in ${country}` },
        { label: 'CURRENCY', value: currency },
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
      metrics: [{ label: 'Currency', value: currency }],
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
        targetPersona: {
          name: 'Decision-Maker Dave',
          role: 'VP of Operations / Director',
          painPoint: 'Struggles with inefficient legacy workflows',
          motivation: 'Seeking scalable, automated solutions'
        },
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
    extractedMetrics: [],
  };
}

// ─── PROMPT BUILDER ─────────────────────────────────────────────────

function buildMarketPrompt(
  brandContext: string,
  researchBrief: string,
  country: string,
  industry: string,
  profession: string,
  services: string | undefined
): string {
  const currency = getCurrency(country);
  const realDataSection = researchBrief
    ? `\n\n## REAL MARKET RESEARCH DATA (scraped from live web sources specific to ${country}):\n${researchBrief}\n\nCRITICAL: Use the above REAL research data to ground your analysis. Reference specific numbers, statistics, and trends from these sources. Do NOT fabricate data when real data is available above. When citing a data point, note which source number it came from (e.g., "According to Source 3...").`
    : '';

  // Currency-specific formatting instruction
  const currencyFormat = currency === 'USD' ? 'in US Dollars (USD)'
    : currency === 'EUR' ? 'in Euros (EUR)'
    : currency === 'GBP' ? 'in British Pounds (GBP)'
    : `in local currency ${currency}`;

  return `You are Mark — Volcanic Marketing's autonomous Market Research Agent. You specialize in quantitative market intelligence for brand strategy development.

COUNTRY: ${country}
INDUSTRY: ${industry}
PROFESSION: ${profession}
SERVICES: ${services || 'Not specified'}
CURRENCY: ${currency}

Following the AMA (American Marketing Association) 7-step market analysis framework, generate a comprehensive market intelligence report:

1. DEFINE PURPOSE: Why is this analysis being conducted? (New market entry, benchmarking, positioning)
2. INDUSTRY STATE: Current market conditions, trends, external factors (PEST)
3. TARGET CUSTOMER: Demographics, psychographics, purchasing patterns
4. COMPETITIVE LANDSCAPE: Market share, positioning, SWOT of key players
5. MARKET TRENDS: Technology, social, economic drivers
6. FORECASTING: TAM/SAM/SOM modeling, growth projections
7. BARRIERS TO ENTRY: Regulatory, economic, competitive barriers

CRITICAL REQUIREMENTS:
1. Include SPECIFIC QUANTITATIVE DATA — percentages, dollar figures (${currencyFormat}), growth rates (CAGR %), market sizes, demographic breakdowns, salary benchmarks, CAC, CLV, and benchmarking scores.
2. All data MUST be specific to ${country} and the ${industry} industry. Use local currency (${currency}), local market conditions, and locally relevant competitors.
3. Use professional consulting language (McKinsey/Bain style).
4. Do NOT use markdown in your text fields. Do not use asterisks or headers inside string values.
5. You MUST return EXACTLY ONE JSON Object matching the strict schema below.
6. When citing real data from the research brief, reference the source (e.g., [Source 1], [Source 3]).
7. For any field where you lack sufficient data, use "N/A" and state why (e.g., "N/A — no reliable source found for this market").
8. Ensure the following metrics are addressed with data where available:
   - Market size (TAM/SAM/SOM) with ${currency} values
   - Growth rate / CAGR as percentage
   - Competitor market share percentages
   - Salary/compensation benchmarks in ${currency}
   - Customer Acquisition Cost (CAC) estimates in ${currency}
   - Customer Lifetime Value (CLV) estimates in ${currency}
   - Industry KPIs (conversion rates, retention/churn rates)
   - Regulatory compliance cost estimates

BRAND CONTEXT:
${brandContext || 'No specific brand context was collected. Generate market intelligence for a business in ' + industry + ' in ' + country + ', operated by a ' + profession + '.'}
${realDataSection}

SCHEMA PROMPT:
Respond ONLY with perfectly valid JSON matching this exact structure layout. Do not include any text before or after the JSON.

{
  "executiveSummary": "150-word executive summary combining qualitative position with 3 key quantitative stats specific to ${country} in ${currency}.",
  "industryOverview": {
    "narrative": "Detailed ${industry} industry landscape analysis for ${country}, covering current state, trends, external factors (PEST), and outlook. Reference specific sources where data was drawn.",
    "metrics": [
      { "label": "EST. TOTAL MARKET VALUE", "value": "${currency} X.XB" },
      { "label": "5-YEAR CAGR", "value": "X.X%" },
      { "label": "PRIMARY GROWTH DRIVER", "value": "e.g., Digital Adoption" },
      { "label": "SECONDARY DRIVER", "value": "e.g., Regulatory Change" },
      { "label": "REGULATORY RISK LEVEL", "value": "Low / Medium / High" },
      { "label": "KEY TREND", "value": "e.g., AI Integration Accelerating" }
    ]
  },
  "marketSizing": {
    "tam": { "value": "${currency} X.XB+", "description": "Total Addressable Market in ${country} — the total revenue opportunity if 100% market share were achieved." },
    "sam": { "value": "${currency} X.XB+", "description": "Serviceable Addressable Market in ${country} — the segment of TAM your services/products can realistically reach." },
    "som": { "value": "${currency} XXXM+", "description": "Serviceable Obtainable Market in ${country} — the share of SAM you can capture in 3-5 years." },
    "growth_cagr": "X.X%",
    "narrative": "Detailed market sizing narrative specific to ${country}, explaining methodology and assumptions behind TAM/SAM/SOM figures."
  },
  "targetMarketSegmentation": {
    "primary": {
      "name": "Primary Buyer Persona Name",
      "description": "Core target customer in ${country} for a ${industry} business.",
      "demographics": "Age range, income bracket in ${currency}/year, education, location, job title",
      "psychographics": "Values, motivations, decision drivers, pain points, buying behavior"
    },
    "secondary": {
      "name": "Secondary Buyer Persona Name",
      "description": "Adjacent or emerging customer segment in ${country}.",
      "demographics": "Age range, income bracket in ${currency}/year, education, location, job title",
      "psychographics": "Values, motivations, decision drivers, buying behavior"
    },
    "metrics": [
      { "label": "EST. CLV (${currency})", "value": "${currency} X,XXX" },
      { "label": "EST. TARGET CAC (${currency})", "value": "${currency} XXX" },
      { "label": "CUSTOMER RETENTION GOAL", "value": "85-95%" },
      { "label": "AVG. CONVERSION RATE", "value": "X.X%" },
      { "label": "EST. ANNUAL SPEND PER CUSTOMER (${currency})", "value": "${currency} X,XXX" }
    ]
  },
  "competitivePositioning": {
    "competitors": [
      {
        "archetype": "The Legacy Giant",
        "market_share": "X%",
        "price_tier": "Premium / Mid / Budget",
        "strength": "e.g., Brand Trust, Scale",
        "weakness": "e.g., Slow Innovation, Bureaucracy"
      },
      {
        "archetype": "The Disruptive Challenger",
        "market_share": "X%",
        "price_tier": "Budget / Value",
        "strength": "e.g., Agility, Tech-First",
        "weakness": "e.g., Limited Capital, Small Brand"
      },
      {
        "archetype": "The Niche Specialist",
        "market_share": "X%",
        "price_tier": "Premium / Luxury",
        "strength": "e.g., Deep Expertise, Loyalty",
        "weakness": "e.g., Narrow Focus, Limited Scale"
      }
    ],
    "narrative": "Competitive positioning analysis in ${country} ${industry} market, including market share dynamics, pricing strategies, and competitive gaps."
  },
  "swotAnalysis": {
    "strengths": [
      { "factor": "e.g., Proprietary Technology", "impact": "e.g., High barrier to entry, reduces competition" },
      { "factor": "e.g., Agile Team Structure", "impact": "e.g., Faster iteration cycles than competitors" }
    ],
    "weaknesses": [
      { "factor": "e.g., Limited Brand Awareness", "impact": "e.g., Higher initial Customer Acquisition Cost" },
      { "factor": "e.g., Small Market Share", "impact": "e.g., Limited pricing power vs. incumbents" }
    ],
    "opportunities": [
      { "factor": "e.g., Untapped Market Segments", "impact": "e.g., Estimated ${currency} XXXM in underserved demand" },
      { "factor": "e.g., Regulatory Tailwinds", "impact": "e.g., New policy opens ${currency} XXB market opportunity" }
    ],
    "threats": [
      { "factor": "e.g., Economic Downturn Risk", "impact": "e.g., Budget constraints reduce B2B purchasing" },
      { "factor": "e.g., Increased Competition from Big Tech", "impact": "e.g., Market consolidation squeezes margins" }
    ]
  },
  "strategicRecommendations": [
    {
      "title": "Establish Thought Leadership & Brand Authority",
      "timeline": "Q1-Q2",
      "investment": "${currency} XXX,XXX",
      "roi": "Medium-Term Brand Equity & Lead Generation",
      "priority": "High",
      "targetPersona": {
        "name": "Decision-Maker Dave",
        "role": "VP of Operations / Director",
        "painPoint": "Struggles with inefficient legacy workflows",
        "motivation": "Seeking scalable, automated solutions"
      },
      "steps": ["Publish 2-3 industry whitepapers with original data", "Speak at 2-3 major ${industry} conferences in ${country}", "Launch a bi-weekly expert content series (podcast/blog)"]
    },
    {
      "title": "Optimize Customer Acquisition Funnel",
      "timeline": "Q1-Q3",
      "investment": "${currency} XX,XXX",
      "roi": "Measurable CAC reduction within 6 months",
      "priority": "High",
      "steps": ["Implement A/B testing on landing pages and CTAs", "Launch targeted LinkedIn/Google campaigns for ${country} market", "Build referral program leveraging existing satisfied clients"]
    },
    {
      "title": "Strengthen Competitive Moat Through Differentiation",
      "timeline": "Q2-Q4",
      "investment": "${currency} X,XXXXX",
      "roi": "Long-term market share growth",
      "priority": "Medium",
      "steps": ["Develop proprietary tool/feature competitors lack", "Secure strategic partnerships with ${industry} leaders in ${country}", "Invest in customer success to improve retention above ${currency} X,XXX CLV"]
    },
    {
      "title": "Monitor Regulatory Landscape & Compliance",
      "timeline": "Ongoing",
      "investment": "${currency} X,XXX annually",
      "roi": "Risk mitigation and operational continuity",
      "priority": "Medium",
      "steps": ["Assign compliance officer for ${country} regulatory requirements", "Conduct quarterly compliance audits", "Subscribe to regulatory update service for ${industry}"]
    }
  ],
  "kpiFramework": [
    { "category": "Growth", "metric": "Monthly Revenue Growth", "baseline": "${currency} 0", "target_6m": "${currency} XX,XXX/mo", "target_12m": "${currency} XXX,XXX/mo", "frequency": "Monthly" },
    { "category": "Growth", "metric": "MRR / ARR", "baseline": "${currency} 0", "target_6m": "${currency} XXX,XXX", "target_12m": "${currency} X,XXX,XXX", "frequency": "Monthly" },
    { "category": "Acquisition", "metric": "Customer Acquisition Cost (CAC)", "baseline": "TBD from market data", "target_6m": "${currency} XXX", "target_12m": "${currency} XX0", "frequency": "Monthly" },
    { "category": "Acquisition", "metric": "Conversion Rate", "baseline": "X.X%", "target_6m": "X.X%", "target_12m": "X.X%", "frequency": "Weekly" },
    { "category": "Retention", "metric": "Customer Retention / Churn Rate", "baseline": "XX%", "target_6m": "XX% retained", "target_12m": "XX% retained", "frequency": "Monthly" },
    { "category": "Revenue", "metric": "Customer Lifetime Value (CLV)", "baseline": "${currency} 0", "target_6m": "${currency} X,XXX", "target_12m": "${currency} XX,XXX", "frequency": "Quarterly" },
    { "category": "Brand", "metric": "Website Visitors / Organic Traffic", "baseline": "0", "target_6m": "X0k/mo", "target_12m": "XXXk/mo", "frequency": "Weekly" },
    { "category": "Brand", "metric": "Brand Awareness (aided recall)", "baseline": "X%", "target_6m": "XX%", "target_12m": "XXX%", "frequency": "Quarterly" }
  ]
}`;
}

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

function cleanJson(raw: string): string {
  const trimmed = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const first = trimmed.indexOf('{');
  const last = trimmed.lastIndexOf('}');
  return first >= 0 && last > first ? trimmed.slice(first, last + 1) : trimmed;
}

function limitText(text: string, maxChars: number): string {
  const compact = (text || '').replace(/\s+/g, ' ').trim();
  return compact.length > maxChars ? `${compact.slice(0, maxChars)}...` : compact;
}

function buildCompactMarketPrompt(
  brandContext: string,
  researchBrief: string,
  country: string,
  industry: string,
  profession: string,
  services?: string
): string {
  const currency = getCurrency(country);
  return `You are Mark, Volcanic Marketing's market research agent. Create a concise, quantified market intelligence JSON report for:
Country: ${country}
Industry: ${industry}
Profession: ${profession}
Services: ${services || 'Not specified'}
Currency: ${currency}

Brand context:
${limitText(brandContext, MAX_BRAND_CONTEXT_CHARS) || 'No brand context provided.'}

Research evidence:
${limitText(researchBrief, MAX_RESEARCH_BRIEF_CHARS) || 'No live source evidence available. Use conservative estimates and mark unknown values as N/A.'}

Return only valid JSON. Keep every narrative under 80 words. Use N/A where source evidence is weak. Match this shape exactly:
{
  "executiveSummary": "short summary with 2-3 useful stats or N/A caveats",
  "industryOverview": { "narrative": "short landscape", "metrics": [{ "label": "MARKET VALUE", "value": "${currency} ..." }, { "label": "GROWTH", "value": "..." }, { "label": "KEY TREND", "value": "..." }] },
  "marketSizing": { "tam": { "value": "...", "description": "..." }, "sam": { "value": "...", "description": "..." }, "som": { "value": "...", "description": "..." }, "growth_cagr": "...", "narrative": "short method" },
  "targetMarketSegmentation": { "primary": { "name": "...", "description": "...", "demographics": "...", "psychographics": "..." }, "secondary": { "name": "...", "description": "...", "demographics": "...", "psychographics": "..." }, "metrics": [{ "label": "CAC", "value": "..." }, { "label": "CLV", "value": "..." }] },
  "competitivePositioning": { "competitors": [{ "archetype": "...", "market_share": "...", "price_tier": "...", "strength": "...", "weakness": "..." }], "narrative": "short competitive read" },
  "swotAnalysis": { "strengths": [{ "factor": "...", "impact": "..." }], "weaknesses": [{ "factor": "...", "impact": "..." }], "opportunities": [{ "factor": "...", "impact": "..." }], "threats": [{ "factor": "...", "impact": "..." }] },
  "strategicRecommendations": [{ "title": "...", "timeline": "...", "investment": "...", "roi": "...", "priority": "High", "targetPersona": { "name": "...", "role": "...", "painPoint": "...", "motivation": "..." }, "steps": ["...", "...", "..."] }],
  "kpiFramework": [{ "category": "Growth", "metric": "...", "baseline": "...", "target_6m": "...", "target_12m": "...", "frequency": "Monthly" }]
}`;
}

function normalizeMarketData(parsed: Partial<MarketData>, fallback: MarketData): MarketData {
  return {
    executiveSummary: parsed.executiveSummary || fallback.executiveSummary,
    industryOverview: {
      narrative: parsed.industryOverview?.narrative || fallback.industryOverview.narrative,
      metrics: Array.isArray(parsed.industryOverview?.metrics) ? parsed.industryOverview!.metrics : fallback.industryOverview.metrics,
    },
    marketSizing: {
      tam: parsed.marketSizing?.tam || fallback.marketSizing.tam,
      sam: parsed.marketSizing?.sam || fallback.marketSizing.sam,
      som: parsed.marketSizing?.som || fallback.marketSizing.som,
      growth_cagr: parsed.marketSizing?.growth_cagr || fallback.marketSizing.growth_cagr,
      narrative: parsed.marketSizing?.narrative || fallback.marketSizing.narrative,
    },
    targetMarketSegmentation: {
      primary: parsed.targetMarketSegmentation?.primary || fallback.targetMarketSegmentation.primary,
      secondary: parsed.targetMarketSegmentation?.secondary || fallback.targetMarketSegmentation.secondary,
      metrics: Array.isArray(parsed.targetMarketSegmentation?.metrics) ? parsed.targetMarketSegmentation!.metrics : fallback.targetMarketSegmentation.metrics,
    },
    competitivePositioning: {
      competitors: Array.isArray(parsed.competitivePositioning?.competitors) ? parsed.competitivePositioning!.competitors : fallback.competitivePositioning.competitors,
      narrative: parsed.competitivePositioning?.narrative || fallback.competitivePositioning.narrative,
    },
    swotAnalysis: {
      strengths: Array.isArray(parsed.swotAnalysis?.strengths) ? parsed.swotAnalysis!.strengths : fallback.swotAnalysis.strengths,
      weaknesses: Array.isArray(parsed.swotAnalysis?.weaknesses) ? parsed.swotAnalysis!.weaknesses : fallback.swotAnalysis.weaknesses,
      opportunities: Array.isArray(parsed.swotAnalysis?.opportunities) ? parsed.swotAnalysis!.opportunities : fallback.swotAnalysis.opportunities,
      threats: Array.isArray(parsed.swotAnalysis?.threats) ? parsed.swotAnalysis!.threats : fallback.swotAnalysis.threats,
    },
    strategicRecommendations: Array.isArray(parsed.strategicRecommendations) ? parsed.strategicRecommendations : fallback.strategicRecommendations,
    kpiFramework: Array.isArray(parsed.kpiFramework) ? parsed.kpiFramework : fallback.kpiFramework,
    dataSources: parsed.dataSources || fallback.dataSources,
    extractedMetrics: parsed.extractedMetrics || fallback.extractedMetrics,
  };
}

async function generateWithGroq(prompt: string): Promise<string> {
  if (!groq) {
    throw new Error('Missing Groq API key. Set VITE_GROQ_API_KEY.');
  }

  let lastError: unknown = null;
  for (const model of GROQ_MODELS) {
    try {
      const response = await groq.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: 'Return only valid JSON for a market intelligence report. No markdown.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.2,
        max_tokens: 2800,
        response_format: { type: 'json_object' },
      });
      return response.choices[0]?.message?.content || '{}';
    } catch (err: any) {
      lastError = err;
      const errorMsg = String(err?.message || err).toLowerCase();
      // Retry on quota/rate limit errors, but not on auth or model errors
      const shouldRetry = !errorMsg.includes('api key') && !errorMsg.includes('not found') && 
                          (errorMsg.includes('quota') || errorMsg.includes('rate') || 
                           errorMsg.includes('429') || errorMsg.includes('limit'));
      if (!shouldRetry) break;
      await delay(1000);
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Groq market research request failed.');
}

export async function generateMarketData(params: GenerateMarketDataParams): Promise<GenerateMarketDataResult> {
  const { brandContext, country, industry, profession, services, onProgress } = params;
  const fallback = buildFallbackMarketData(country, industry);
  let firecrawlResults: FirecrawlMarketResult[] = [];

  onProgress?.('Mark is defining the market research scope...', 5);

  if (isFirecrawlConfigured()) {
    onProgress?.('Mark is searching country-specific market sources...', 15);
    firecrawlResults = await searchMarketResearch({ country, industry, profession, services }, (step, pct) => {
      onProgress?.(step, 15 + Math.round(pct * 0.35));
    });
  } else {
    onProgress?.('Firecrawl is not configured; Mark will synthesize from the available brand context.', 30);
  }

  const researchBrief = buildResearchBrief(firecrawlResults);
  const extracted = extractAllMetrics(firecrawlResults).slice(0, 12).map(m => ({
    label: m.source,
    value: m.value,
  }));
  const dataSources = firecrawlResults.flatMap(result =>
    result.sources.map(source => ({ url: source.url, title: source.title }))
  );

  try {
    onProgress?.('Mark is synthesizing the stats dashboard and recommendations...', 62);
    const prompt = buildCompactMarketPrompt(brandContext, researchBrief, country, industry, profession, services);
    let raw = '';

    raw = await generateWithGroq(prompt);

    const parsed = JSON.parse(cleanJson(raw)) as Partial<MarketData>;
    const marketData = normalizeMarketData(parsed, fallback);
    marketData.dataSources = dataSources;
    marketData.extractedMetrics = extracted.length ? extracted : marketData.extractedMetrics;
    onProgress?.('Mark has completed the market dashboard.', 100);
    return { marketData, firecrawlResults };
  } catch (err) {
    console.warn('Market data synthesis failed; using fallback market data.', err);
    fallback.dataSources = dataSources;
    fallback.extractedMetrics = extracted;
    onProgress?.('Mark created a fallback strategy dashboard.', 100);
    return { marketData: fallback, firecrawlResults };
  }
}
