// ─── PROFILE SERVICE ────────────────────────────────────────────────
// Manages user profiles, avatars, and activity logging in Supabase

import { supabase } from './supabase.service';

export interface UserProfile {
  id: string;
  username: string | null;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
  storage_limit_bytes: number;
  transcriptions_limit: number;
}

export interface ActivityEntry {
  id: string;
  user_id: string;
  type: 'prompt' | 'transcription' | 'file_upload' | 'pdf_upload' | 'login';
  label: string | null;
  detail: string | null;
  file_size_bytes: number | null;
  created_at: string;
}

// ─── PROFILE CRUD ────────────────────────────────────────────────────

export async function getProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('vmv8_profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error) console.error('getProfile error:', error);
  return data;
}

export async function upsertProfile(profile: Partial<UserProfile> & { id: string }): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('vmv8_profiles')
    .upsert({ ...profile, updated_at: new Date().toISOString() }, { onConflict: 'id' })
    .select()
    .single();
  if (error) console.error('upsertProfile error:', error);
  return data;
}

export async function uploadAvatar(userId: string, file: File): Promise<string | null> {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const path = `${userId}/avatar.${ext}`;

  // Remove existing file first to avoid upsert collisions
  await supabase.storage.from('vmv8-avatars').remove([path]);

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('vmv8-avatars')
    .upload(path, file, { cacheControl: '3600', upsert: true, contentType: file.type });

  if (uploadError) {
    console.error('uploadAvatar storage error:', JSON.stringify(uploadError));
    return null;
  }

  const { data } = supabase.storage.from('vmv8-avatars').getPublicUrl(uploadData.path);
  const publicUrl = data.publicUrl + `?t=${Date.now()}`;

  // Persist to profile table
  const { error: profileError } = await supabase
    .from('vmv8_profiles')
    .upsert({ id: userId, avatar_url: publicUrl, updated_at: new Date().toISOString() }, { onConflict: 'id' });

  if (profileError) console.error('uploadAvatar profile upsert error:', profileError);

  return publicUrl;
}

// ─── ACTIVITY LOGGING ────────────────────────────────────────────────

export async function logActivity(
  userId: string,
  type: ActivityEntry['type'],
  label?: string,
  detail?: string,
  fileSizeBytes?: number
): Promise<void> {
  const { error } = await supabase.from('vmv8_activity').insert({
    user_id: userId,
    type,
    label: label || null,
    detail: detail || null,
    file_size_bytes: fileSizeBytes || null,
  });
  if (error) console.error('logActivity error:', error);
}

export async function getActivity(userId: string, limit = 50): Promise<ActivityEntry[]> {
  const { data, error } = await supabase
    .from('vmv8_activity')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) console.error('getActivity error:', error);
  return data || [];
}

export async function getActivityStats(userId: string): Promise<{
  prompts: number;
  transcriptions: number;
  fileUploads: number;
  pdfUploads: number;
  logins: number;
  totalActivity: number;
  storageUsedBytes: number;
}> {
  const { data, error } = await supabase
    .from('vmv8_activity')
    .select('type, file_size_bytes')
    .eq('user_id', userId);
  if (error || !data) return { prompts: 0, transcriptions: 0, fileUploads: 0, pdfUploads: 0, logins: 0, totalActivity: 0, storageUsedBytes: 0 };
  
  let storageSum = 0;
  data.forEach(r => {
    if (r.file_size_bytes) storageSum += r.file_size_bytes;
  });

  return {
    prompts: data.filter(r => r.type === 'prompt').length,
    transcriptions: data.filter(r => r.type === 'transcription').length,
    fileUploads: data.filter(r => r.type === 'file_upload').length,
    pdfUploads: data.filter(r => r.type === 'pdf_upload').length,
    logins: data.filter(r => r.type === 'login').length,
    totalActivity: data.length,
  };
}
