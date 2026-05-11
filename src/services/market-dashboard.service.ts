// ─── MARKET DASHBOARD SERVICE ────────────────────────────────────────
// Service for fetching and managing market research data for dashboard display

import { generateMarketData, type GenerateMarketDataParams } from './market.service';

export interface MarketResearchDisplayData {
  data: any;
  sourcesCount: number;
  lastUpdated: string;
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
      lastUpdated: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error fetching market research for dashboard:', error);
    throw error;
  }
}

/**
 * Check if we have valid market research data in state
 */
export function hasValidMarketResearch(data: any): boolean {
  return data && 
         data.executiveSummary && 
         data.industryOverview && 
         data.marketSizing;
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