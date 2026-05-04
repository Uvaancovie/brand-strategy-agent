// ─── TRANSCRIPTION SERVICE ──────────────────────────────────────────
// CRUD operations for transcripts + Supabase sync + AI framework extraction

import { supabase } from './supabase.service';
import { state, saveSession, type Transcript } from '../store/brandscript.store';
import { callGroq } from './groq.service';
import { applyExtractions } from './extraction.service';

// ─── HELPERS ────────────────────────────────────────────────────────

function generateId(): string {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

// ─── CRUD OPERATIONS ────────────────────────────────────────────────

export function createTranscript(data: {
  name: string;
  description?: string;
  text: string;
  source: 'upload' | 'recording';
  fileName?: string;
  durationSeconds?: number;
}): Transcript {
  const now = new Date().toISOString();
  const transcript: Transcript = {
    id: generateId(),
    name: data.name || 'Untitled Transcript',
    description: data.description || '',
    text: data.text,
    source: data.source,
    fileName: data.fileName,
    durationSeconds: data.durationSeconds,
    addedToContext: false,
    addedToDoc: false,
    createdAt: now,
    updatedAt: now,
  };
  state.transcripts.unshift(transcript); // newest first
  saveSession();
  return transcript;
}

export function updateTranscript(id: string, patch: Partial<Pick<Transcript, 'name' | 'description' | 'text'>>): Transcript | null {
  const idx = state.transcripts.findIndex(t => t.id === id);
  if (idx === -1) return null;
  const transcript = state.transcripts[idx];
  if (patch.name !== undefined) transcript.name = patch.name;
  if (patch.description !== undefined) transcript.description = patch.description;
  if (patch.text !== undefined) transcript.text = patch.text;
  transcript.updatedAt = new Date().toISOString();
  saveSession();
  return transcript;
}

export function deleteTranscript(id: string): boolean {
  const idx = state.transcripts.findIndex(t => t.id === id);
  if (idx === -1) return false;
  state.transcripts.splice(idx, 1);
  saveSession();
  return true;
}

export function getTranscript(id: string): Transcript | null {
  return state.transcripts.find(t => t.id === id) || null;
}

export function getAllTranscripts(): Transcript[] {
  return state.transcripts;
}

// ─── CONTEXT INTEGRATION ────────────────────────────────────────────

export function saveTranscriptToContext(id: string): boolean {
  const transcript = getTranscript(id);
  if (!transcript) return false;

  // Append to context payload
  state.contextPayload += `\n\n### TRANSCRIPT: ${transcript.name}\n${transcript.text}`;
  state.contextOverview = `Added transcript "${transcript.name}" to context.`;
  state.contextPanels.push({
    title: 'Transcript',
    subtitle: transcript.name,
    body: transcript.text.length > 1800 ? transcript.text.slice(0, 1800) + '...' : transcript.text,
  });

  // Mark as added
  transcript.addedToContext = true;
  transcript.updatedAt = new Date().toISOString();
  saveSession();
  return true;
}

export function toggleTranscriptInDoc(id: string): boolean {
  const transcript = getTranscript(id);
  if (!transcript) return false;
  transcript.addedToDoc = !transcript.addedToDoc;
  transcript.updatedAt = new Date().toISOString();
  saveSession();
  return transcript.addedToDoc;
}

export function getDocTranscripts(): Transcript[] {
  return state.transcripts.filter(t => t.addedToDoc);
}

// ─── AI FRAMEWORK PRE-POPULATION ────────────────────────────────────

export async function prepopulateFrameworkFromTranscript(id: string): Promise<string> {
  const transcript = getTranscript(id);
  if (!transcript) return 'Transcript not found.';

  const prompt = `You are Brandy, the VMV8 Brand Strategy Agent.

The user has a transcription titled "${transcript.name}"${transcript.description ? ` (${transcript.description})` : ''}.
It is from a ${transcript.source === 'recording' ? 'live consultation recording' : 'uploaded audio file'}.

Analyze this transcript as strategic brand context.

What to do:
1. Summarize the most important business, audience, offer, positioning, competitor, and market signals.
2. Extract any confident B.I.G Doc fields you can infer (return as extractions in the JSON).
3. Highlight any concrete market-research clues, metrics, risks, opportunities, or customer segments.
4. Be aggressive — fill as many framework fields as you can confidently infer.

Transcript text:
${transcript.text.slice(0, 6000)}`;

  const response = await callGroq(prompt, 2, state.contextPayload);
  applyExtractions(response.extractions);
  saveSession();
  return response.message;
}

// ─── SUPABASE SYNC ──────────────────────────────────────────────────

export async function syncTranscriptToSupabase(userId: string, transcript: Transcript): Promise<boolean> {
  const { error } = await supabase
    .from('vmv8_transcripts')
    .upsert({
      id: transcript.id,
      user_id: userId,
      name: transcript.name,
      description: transcript.description,
      text: transcript.text,
      source: transcript.source,
      file_name: transcript.fileName || null,
      duration_seconds: transcript.durationSeconds || null,
      added_to_context: transcript.addedToContext,
      added_to_doc: transcript.addedToDoc,
      created_at: transcript.createdAt,
      updated_at: transcript.updatedAt,
    }, { onConflict: 'id' });

  if (error) {
    console.error('syncTranscript error:', error);
    return false;
  }
  return true;
}

export async function deleteTranscriptFromSupabase(transcriptId: string): Promise<boolean> {
  const { error } = await supabase
    .from('vmv8_transcripts')
    .delete()
    .eq('id', transcriptId);

  if (error) {
    console.error('deleteTranscript error:', error);
    return false;
  }
  return true;
}

export async function loadTranscriptsFromSupabase(userId: string): Promise<Transcript[]> {
  const { data, error } = await supabase
    .from('vmv8_transcripts')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('loadTranscripts error:', error);
    return [];
  }
  if (!data) return [];

  return data.map((row: any) => ({
    id: row.id,
    name: row.name,
    description: row.description || '',
    text: row.text,
    source: row.source,
    fileName: row.file_name || undefined,
    durationSeconds: row.duration_seconds || undefined,
    addedToContext: row.added_to_context || false,
    addedToDoc: row.added_to_doc || false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

// ─── RECORDING SESSION COUNTER (SUPABASE) ───────────────────────────

export async function getRecordingSessionCount(userId: string): Promise<number> {
  const { data, error } = await supabase
    .from('profiles')
    .select('recording_session_count')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.warn('getRecordingSessionCount error:', error);
    return state.recordingSessionCount;
  }
  const count = data?.recording_session_count ?? 0;
  state.recordingSessionCount = count;
  return count;
}

export async function incrementRecordingSession(userId: string): Promise<number> {
  state.recordingSessionCount++;
  const newCount = state.recordingSessionCount;

  const { error } = await supabase
    .from('profiles')
    .update({ recording_session_count: newCount })
    .eq('id', userId);

  if (error) {
    console.warn('incrementRecordingSession error:', error);
  }
  saveSession();
  return newCount;
}

export const MAX_RECORDING_SESSIONS = 24;
