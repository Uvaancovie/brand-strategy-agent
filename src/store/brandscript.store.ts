// ─── BRANDSCRIPT STORE ──────────────────────────────────────────────
// Central state management with localStorage persistence + Supabase sync

import { FRAMEWORK, type BrandScript, type SectionId, type ChatMessage } from '../config/framework';
import { saveBrandscriptToSupabase, loadBrandscriptFromSupabase } from '../services/brandscript.service';

const STORAGE_KEY = 'vmv8-brand-strategy-session';
const MAX_HISTORY = 20;

// Debounce timer for Supabase saves
let supabaseSaveTimer: ReturnType<typeof setTimeout> | null = null;
const SUPABASE_SAVE_DEBOUNCE = 3000; // 3 seconds

export interface UserContext {
  country: string;
  industry: string;
  profession: string;
  services: string;
}

export interface ContextPanel {
  title: string;
  subtitle: string;
  body: string;
}

export interface Transcript {
  id: string;
  name: string;
  description: string;
  text: string;
  source: 'upload' | 'recording';
  fileName?: string;
  durationSeconds?: number;
  addedToContext: boolean;
  addedToDoc: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AppState {
  activeSection: number;
  messages: ChatMessage[];
  brandscript: BrandScript;
  manualSectionCompletion: Partial<Record<SectionId, boolean>>;
  conversationHistory: ChatMessage[];
  userContext: UserContext;
  contextPayload: string;
  contextOverview: string;
  contextPanels: ContextPanel[];
  transcripts: Transcript[];
  recordingSessionCount: number;
}

function createEmptyBrandscript(): BrandScript {
  const bs = {} as BrandScript;
  FRAMEWORK.forEach(section => {
    bs[section.id] = {};
    section.fields.forEach(field => {
      bs[section.id][field.id] = '';
    });
  });
  return bs;
}

export const state: AppState = {
  activeSection: 0,
  messages: [],
  brandscript: createEmptyBrandscript(),
  manualSectionCompletion: {},
  conversationHistory: [],
  userContext: {
    country: '',
    industry: '',
    profession: '',
    services: '',
  },
  contextPayload: '',
  contextOverview: '',
  contextPanels: [],
  transcripts: [],
  recordingSessionCount: 0,
};

// ─── PERSISTENCE ────────────────────────────────────────────────────

export function saveSession(): void {
  try {
    const data = {
      brandscript: state.brandscript,
      conversationHistory: state.conversationHistory.slice(-MAX_HISTORY),
      manualSectionCompletion: state.manualSectionCompletion,
      activeSection: state.activeSection,
      userContext: state.userContext,
      contextPayload: state.contextPayload,
      contextOverview: state.contextOverview,
      contextPanels: state.contextPanels,
      transcripts: state.transcripts,
      recordingSessionCount: state.recordingSessionCount,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));

    const el = document.getElementById('session-status-text');
    if (el) {
      el.textContent = 'Saved';
      setTimeout(() => { el.textContent = 'Auto-saved'; }, 2000);
    }
  } catch (e) {
    console.warn('Session save failed:', e);
  }
}

/**
 * Debounced save to Supabase. Call this after saveSession() when user is authenticated.
 */
export function scheduleSaveToSupabase(userId: string): void {
  if (supabaseSaveTimer) clearTimeout(supabaseSaveTimer);
  supabaseSaveTimer = setTimeout(async () => {
    try {
      const { pct } = getProgressStats();
      const completedSections = FRAMEWORK
        .filter(s => isSectionCompleted(s.id))
        .map(s => s.id);

      await saveBrandscriptToSupabase({
        user_id: userId,
        country: state.userContext.country,
        industry: state.userContext.industry,
        profession: state.userContext.profession,
        services: state.userContext.services,
        brandscript: state.brandscript,
        completion_pct: pct,
        completed_sections: completedSections,
        context_payload: state.contextPayload,
        context_overview: state.contextOverview,
        context_panels: state.contextPanels,
      });
    } catch (e) {
      console.warn('Supabase save failed:', e);
    }
  }, SUPABASE_SAVE_DEBOUNCE);
}

/**
 * Load from Supabase and merge with local state
 */
export async function loadFromSupabase(userId: string): Promise<boolean> {
  try {
    const remote = await loadBrandscriptFromSupabase(userId);
    if (!remote) return false;

    // Merge remote brandscript with local (remote wins for non-empty fields)
    if (remote.brandscript) {
      const remoteBs = remote.brandscript as BrandScript;
      FRAMEWORK.forEach(section => {
        section.fields.forEach(field => {
          const remoteVal = remoteBs[section.id]?.[field.id];
          const localVal = state.brandscript[section.id]?.[field.id];
          if (remoteVal && !localVal) {
            state.brandscript[section.id][field.id] = remoteVal;
          }
        });
      });
    }

    // Merge user context
    if (remote.country) state.userContext.country = remote.country;
    if (remote.industry) state.userContext.industry = remote.industry;
    if (remote.profession) state.userContext.profession = remote.profession;
    if (remote.services) state.userContext.services = remote.services;

    // Merge context summary
    if (remote.context_payload) state.contextPayload = remote.context_payload;
    if (remote.context_overview) state.contextOverview = remote.context_overview;
    if (remote.context_panels) state.contextPanels = remote.context_panels;

    return true;
  } catch (e) {
    console.warn('Supabase load failed:', e);
    return false;
  }
}

export function loadSession(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    if (data.brandscript) state.brandscript = data.brandscript;
    if (data.conversationHistory) state.conversationHistory = data.conversationHistory;
    if (data.manualSectionCompletion) state.manualSectionCompletion = data.manualSectionCompletion;
    if (data.activeSection !== undefined) state.activeSection = data.activeSection;
    if (data.userContext) state.userContext = { ...state.userContext, ...data.userContext };
    if (data.contextPayload) state.contextPayload = data.contextPayload;
    if (data.contextOverview) state.contextOverview = data.contextOverview;
    if (data.contextPanels) state.contextPanels = data.contextPanels;
    if (data.transcripts) state.transcripts = data.transcripts;
    if (data.recordingSessionCount !== undefined) state.recordingSessionCount = data.recordingSessionCount;
    return true;
  } catch (e) {
    console.warn('Session load failed:', e);
    return false;
  }
}

export function clearSession(): void {
  state.messages = [];
  state.activeSection = 0;
  state.conversationHistory = [];
  state.manualSectionCompletion = {};
  state.brandscript = createEmptyBrandscript();
  state.userContext = { country: '', industry: '', profession: '', services: '' };
  state.contextPayload = '';
  state.contextOverview = '';
  state.contextPanels = [];
  state.transcripts = [];
  state.recordingSessionCount = 0;
  localStorage.removeItem(STORAGE_KEY);
}

// ─── HELPERS ────────────────────────────────────────────────────────

export function isSectionCompleted(sectionId: SectionId): boolean {
  if (state.manualSectionCompletion[sectionId]) return true;
  const section = FRAMEWORK.find(s => s.id === sectionId);
  if (!section) return false;
  return section.fields.every(f => state.brandscript[sectionId][f.id]);
}

export function getFilledCount(sectionId: SectionId): number {
  const section = FRAMEWORK.find(s => s.id === sectionId);
  if (!section) return 0;
  return section.fields.filter(f => state.brandscript[sectionId][f.id]).length;
}

export function getTrimmedHistory(): ChatMessage[] {
  return state.conversationHistory.slice(-MAX_HISTORY);
}

export function hasExistingData(): boolean {
  return Object.values(state.brandscript).some(s => Object.values(s).some(v => v));
}

export function getProgressStats(): { total: number; filled: number; pct: number } {
  let total = 0, filled = 0;
  FRAMEWORK.forEach(section => {
    if (state.manualSectionCompletion[section.id]) {
      total += section.fields.length;
      filled += section.fields.length;
    } else {
      section.fields.forEach(field => {
        total++;
        if (state.brandscript[section.id][field.id]) filled++;
      });
    }
  });
  const pct = Math.round((filled / total) * 100);
  return { total, filled, pct };
}
