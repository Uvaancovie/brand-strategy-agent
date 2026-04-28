// ─── BRANDSCRIPT SUPABASE SERVICE ───────────────────────────────────
// Persists brandscript, market research, and document exports to Supabase

import { supabase } from './supabase.service';
import type { MarketData } from './market.service';
import type { FirecrawlMarketResult } from './firecrawl.service';
import type { BrandScript } from '../config/framework';

// ─── TYPES ──────────────────────────────────────────────────────────

export interface BrandscriptRow {
  id?: string;
  user_id: string;
  country: string;
  industry: string;
  profession: string;
  services?: string;
  brandscript: BrandScript;
  context_payload?: string;
  context_overview?: string;
  context_panels?: any[];
  website_url?: string;
  linkedin_url?: string;
  completion_pct?: number;
  completed_sections?: string[];
  created_at?: string;
  updated_at?: string;
}

export interface MarketResearchRow {
  id?: string;
  user_id: string;
  brandscript_id?: string;
  country: string;
  industry: string;
  profession?: string;
  firecrawl_results?: FirecrawlMarketResult[];
  firecrawl_sources?: string[];
  market_data?: MarketData;
  generated_at?: string;
}

export interface DocumentRow {
  id?: string;
  user_id: string;
  brandscript_id?: string;
  market_research_id?: string;
  brand_name?: string;
  document_type?: string;
  brandscript_snapshot?: BrandScript;
  market_data_snapshot?: MarketData;
  context_snapshot?: string;
  file_name?: string;
  exported_at?: string;
}

// ─── BRANDSCRIPT CRUD ───────────────────────────────────────────────

export async function saveBrandscriptToSupabase(data: BrandscriptRow): Promise<BrandscriptRow | null> {
  const { data: result, error } = await supabase
    .from('vmv8_brandscripts')
    .upsert(
      { ...data, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    )
    .select()
    .single();

  if (error) {
    console.error('saveBrandscript error:', error);
    return null;
  }
  return result;
}

export async function loadBrandscriptFromSupabase(userId: string): Promise<BrandscriptRow | null> {
  const { data, error } = await supabase
    .from('vmv8_brandscripts')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('loadBrandscript error:', error);
    return null;
  }
  return data;
}

// ─── MARKET RESEARCH CRUD ───────────────────────────────────────────

export async function saveMarketResearch(data: MarketResearchRow): Promise<MarketResearchRow | null> {
  // Extract source URLs from firecrawl results
  const sourceUrls = (data.firecrawl_results || [])
    .flatMap(r => r.sources.map(s => s.url))
    .filter(Boolean);

  const { data: result, error } = await supabase
    .from('vmv8_market_research')
    .insert({ ...data, firecrawl_sources: sourceUrls })
    .select()
    .single();

  if (error) {
    console.error('saveMarketResearch error:', error);
    return null;
  }
  return result;
}

export async function getLatestMarketResearch(userId: string): Promise<MarketResearchRow | null> {
  const { data, error } = await supabase
    .from('vmv8_market_research')
    .select('*')
    .eq('user_id', userId)
    .order('generated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('getLatestMarketResearch error:', error);
    return null;
  }
  return data;
}

// ─── DOCUMENT EXPORT CRUD ───────────────────────────────────────────

export async function saveDocumentExport(data: DocumentRow): Promise<DocumentRow | null> {
  const { data: result, error } = await supabase
    .from('vmv8_documents')
    .insert(data)
    .select()
    .single();

  if (error) {
    console.error('saveDocumentExport error:', error);
    return null;
  }
  return result;
}

export async function getDocumentHistory(userId: string, limit = 20): Promise<Partial<DocumentRow>[]> {
  const { data, error } = await supabase
    .from('vmv8_documents')
    .select('id, brand_name, document_type, file_name, exported_at')
    .eq('user_id', userId)
    .order('exported_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('getDocumentHistory error:', error);
    return [];
  }
  return data || [];
}
