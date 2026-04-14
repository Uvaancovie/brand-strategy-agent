// ─── MARKET INTELLIGENCE SERVICE ────────────────────────────────────
// Generates structured, quantitative market intelligence via Groq AI
// for the B.I.G Doc PDF. Includes hard numbers, benchmarks & KPIs.

import { groq } from './groq.service';

// ─── OUTPUT TYPES ───────────────────────────────────────────────────

export interface MarketData {
  executiveSummary: string;
  industryOverview: string;
  marketSizing: string;
  targetMarketSegmentation: string;
  competitivePositioning: string;
  swotAnalysis: string;
  strategicRecommendations: string;
  kpiFramework: string;
}

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

// ─── PROMPT ─────────────────────────────────────────────────────────

function buildMarketPrompt(brandContext: string): string {
  return `You are a senior brand strategist and market research analyst preparing a premium Brand Identity Guiding Document (B.I.G Doc) for a client. Based on the brand context below, generate a comprehensive, data-rich market intelligence report.

CRITICAL REQUIREMENTS:
1. Include SPECIFIC QUANTITATIVE DATA — percentages, dollar figures, growth rates, market sizes, demographic breakdowns, and benchmarking scores. Use realistic projected figures based on the industry/niche described. If exact data is unavailable, provide well-reasoned estimates with ranges and cite the basis for the estimate.
2. Use professional consulting language (McKinsey/Bain style).
3. Every section must contain at least 3 data points with numbers.
4. Format lists with bullet points (•) for clean PDF rendering.
5. Do NOT use markdown headers (no # symbols) — they will be added by the PDF generator.

BRAND CONTEXT:
${brandContext || 'No specific brand context was collected. Generate a general market intelligence framework with placeholder ranges that the client can refine.'}

Generate the following sections. Respond ONLY with valid JSON matching this exact structure:

{
  "executiveSummary": "A 150-word executive summary of the brand's strategic position, market opportunity, and key competitive advantages. Include 2-3 key statistics that frame the opportunity.",

  "industryOverview": "Industry landscape analysis including: total addressable market (TAM) in dollars, compound annual growth rate (CAGR) over 5 years, key industry trends (at least 4), regulatory environment, technology disruption factors, and macro-economic drivers. Provide at least 5 quantitative data points.",

  "marketSizing": "Detailed market sizing with: Total Addressable Market (TAM), Serviceable Addressable Market (SAM), Serviceable Obtainable Market (SOM) — each with dollar values. Include market penetration rates, revenue growth projections for years 1-3, and break-even analysis timeline. Use a table-like format with bullet points.",

  "targetMarketSegmentation": "Detailed target market segmentation including: Primary segment (demographics: age range, income bracket, education level, geographic concentration, digital behavior). Secondary segment with same detail. Include psychographic profiles, buying behavior patterns, customer lifetime value (CLV) estimates, customer acquisition cost (CAC) benchmarks, and media consumption habits. Provide at least 8 quantitative data points.",

  "competitivePositioning": "Competitive positioning matrix covering: top 3-5 competitor archetypes (by type, not name), their estimated market share percentages, strengths/weaknesses relative to this brand, pricing tier comparison (budget/mid/premium/luxury), brand equity score estimates (1-10 scale), and differentiation opportunities. Include a competitive advantage scoring framework.",

  "swotAnalysis": "Complete SWOT analysis formatted as: Strengths (4-5 internal advantages with quantified impact), Weaknesses (3-4 internal challenges with risk ratings: High/Medium/Low), Opportunities (4-5 external opportunities with estimated revenue impact), Threats (3-4 external threats with probability percentages and mitigation strategies).",

  "strategicRecommendations": "5 specific strategic recommendations, each with: recommendation title, implementation timeline (Q1-Q4 or Year 1/2/3), estimated investment required (dollar range), expected ROI percentage, priority level (Critical/High/Medium), and specific action steps (3-4 per recommendation).",

  "kpiFramework": "Key Performance Indicator framework with 8-10 KPIs organized by category: Brand Awareness (3 KPIs with target benchmarks), Customer Acquisition (3 KPIs with monthly/quarterly targets), Revenue & Growth (2-3 KPIs with percentage targets), Brand Health (2 KPIs with measurement methodology). Each KPI must include: metric name, current baseline estimate, 6-month target, 12-month target, and measurement frequency."
}`;
}

// ─── PUBLIC API ──────────────────────────────────────────────────────

export async function generateMarketData(brandContext: string, retries = 2): Promise<MarketData> {
  const prompt = buildMarketPrompt(brandContext);

  let raw = '';

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: 'You are a world-class brand strategy consultant. You always respond with valid JSON only. No markdown, no code fences, no explanation — just the JSON object.' },
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

    // Validate all fields exist
    const requiredFields: (keyof MarketData)[] = [
      'executiveSummary',
      'industryOverview',
      'marketSizing',
      'targetMarketSegmentation',
      'competitivePositioning',
      'swotAnalysis',
      'strategicRecommendations',
      'kpiFramework',
    ];

    for (const field of requiredFields) {
      if (!parsed[field] || typeof parsed[field] !== 'string') {
        parsed[field] = `[Data generation incomplete for ${field}. Please regenerate.]`;
      }
    }

    return parsed;
  } catch (err) {
    console.error('Market data parse error:', err, 'Raw:', raw);
    return {
      executiveSummary: 'Market intelligence generation encountered an issue. Please try again.',
      industryOverview: raw || 'No data generated.',
      marketSizing: 'Data unavailable — please regenerate.',
      targetMarketSegmentation: 'Data unavailable — please regenerate.',
      competitivePositioning: 'Data unavailable — please regenerate.',
      swotAnalysis: 'Data unavailable — please regenerate.',
      strategicRecommendations: 'Data unavailable — please regenerate.',
      kpiFramework: 'Data unavailable — please regenerate.',
    };
  }
}
