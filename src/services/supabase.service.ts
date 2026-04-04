import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseKey);

export async function getCurrentSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) console.error("Error getting session:", error);
  return data?.session;
}

export function setupAuthListener(onAuthChange: (session: any) => void) {
  supabase.auth.onAuthStateChange((event, session) => {
    onAuthChange(session);
  });
}
