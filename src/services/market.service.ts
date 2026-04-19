// ─── MARKET INTELLIGENCE SERVICE ────────────────────────────────────
// Generates structured, quantitative market intelligence via Groq AI
// for the B.I.G Doc PDF. Includes hard numbers, benchmarks & KPIs.

import { groq } from './groq.service';

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
}

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

// ─── PROMPT ─────────────────────────────────────────────────────────

function buildMarketPrompt(brandContext: string): string {
  return `You are a senior brand strategist and market research analyst preparing a premium Brand Identity Guiding Document (B.I.G Doc) for a client. Based on the brand context below, generate a comprehensive, data-rich market intelligence report.

CRITICAL REQUIREMENTS:
1. Include SPECIFIC QUANTITATIVE DATA — percentages, dollar figures, growth rates, market sizes, demographic breakdowns, and benchmarking scores. Provide well-reasoned estimates if exact data is unavailable.
2. Use professional consulting language (McKinsey/Bain style).
3. Do NOT use markdown in your text fields. Do not use asterisks or headers inside string values.
4. You MUST return EXACTLY ONE JSON Object matching the strict schema below.

BRAND CONTEXT:
${brandContext || 'No specific brand context was collected. Generate a robust general market intelligence framework with realistic placeholder ranges.'}

SCHEMA PROMPT:
Respond ONLY with perfectly valid JSON matching this exact structure layout. Do not include any text before or after the JSON.

{
  "executiveSummary": "150-word executive summary combining qualitative position with 2-3 key quantitative stats.",
  "industryOverview": {
    "narrative": "Detailed industry landscape analysis...",
    "metrics": [
      { "label": "EST. TOTAL VALUE", "value": "$5B" },
      { "label": "5-YEAR CAGR", "value": "12.5%" },
      { "label": "PRIMARY DRIVER", "value": "AI Adoption" },
      { "label": "REGULATORY RISK", "value": "Medium" }
    ]
  },
  "marketSizing": {
    "tam": { "value": "$10B+", "description": "Total Addressable Market definition..." },
    "sam": { "value": "$1B+", "description": "Serviceable Addressable Market definition..." },
    "som": { "value": "$50M", "description": "Serviceable Obtainable Market definition..." },
    "growth_cagr": "15%",
    "narrative": "Detailed market sizing narrative and penetration timeline..."
  },
  "targetMarketSegmentation": {
    "primary": { "name": "Early Adopters", "description": "Core target...", "demographics": "25-45, $100k+ income", "psychographics": "Tech-forward, values speed over price" },
    "secondary": { "name": "Value Seekers", "description": "Secondary segment...", "demographics": "35-55, $60k+ income", "psychographics": "Practical, needs social proof" },
    "metrics": [
      { "label": "EST. CLV", "value": "$2,500" },
      { "label": "TARGET CAC", "value": "$250" },
      { "label": "RETENTION GOAL", "value": "85%" }
    ]
  },
  "competitivePositioning": {
    "competitors": [
      { "archetype": "The Legacy Giant", "market_share": "45%", "price_tier": "Premium", "strength": "Brand Trust", "weakness": "Slow Innovation" },
      { "archetype": "The Scrappy Startup", "market_share": "5%", "price_tier": "Budget", "strength": "Agility", "weakness": "Limited Capital" },
      { "archetype": "The Niche Specialist", "market_share": "15%", "price_tier": "Luxury", "strength": "Deep Expertise", "weakness": "Narrow Focus" }
    ],
    "narrative": "Competitive positioning and defensive moat narrative..."
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
      "investment": "$10k - $25k", 
      "roi": "Medium-Term Brand Equity", 
      "priority": "High", 
      "steps": ["Publish whitepaper", "Speak at 2 major conferences", "Launch podcast"] 
    }
  ],
  "kpiFramework": [
    { "category": "Growth", "metric": "MRR", "baseline": "$0", "target_6m": "$50k", "target_12m": "$150k", "frequency": "Monthly" },
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

export async function generateMarketData(brandContext: string, retries = 2): Promise<MarketData> {
  const prompt = buildMarketPrompt(brandContext);
  let raw = '';

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: 'You are a world-class brand strategy consultant. You always respond with perfectly formatted JSON matching the requested schema exactly. Never output conversational text.' },
        { role: 'user', content: prompt },
      ],
      model: 'llama-3.3-70b-versatile',
      response_format: { type: 'json_object' },
    });

    raw = chatCompletion.choices[0]?.message?.content || '{}';
  } catch (err: unknown) {
    const error = err as Error;
    if (retries > 0 && error.message && (error.message.includes('quota') || error.message.includes('429'))) {
      console.warn(`Market data: Rate limit hit. Retrying... (${retries} left)`);
      await delay(2500);
      return generateMarketData(brandContext, retries - 1);
    }
    throw err;
  }

  try {
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned) as MarketData;
    
    // Provide safe fallbacks if the AI missed anything
    return {
      executiveSummary: parsed.executiveSummary || FALLBACK_MARKET_DATA.executiveSummary,
      industryOverview: parsed.industryOverview || FALLBACK_MARKET_DATA.industryOverview,
      marketSizing: parsed.marketSizing || FALLBACK_MARKET_DATA.marketSizing,
      targetMarketSegmentation: parsed.targetMarketSegmentation || FALLBACK_MARKET_DATA.targetMarketSegmentation,
      competitivePositioning: parsed.competitivePositioning || FALLBACK_MARKET_DATA.competitivePositioning,
      swotAnalysis: parsed.swotAnalysis || FALLBACK_MARKET_DATA.swotAnalysis,
      strategicRecommendations: parsed.strategicRecommendations || FALLBACK_MARKET_DATA.strategicRecommendations,
      kpiFramework: parsed.kpiFramework || FALLBACK_MARKET_DATA.kpiFramework,
    };
  } catch (err) {
    console.error('Market data parse error:', err, 'Raw:', raw);
    return FALLBACK_MARKET_DATA;
  }
}
