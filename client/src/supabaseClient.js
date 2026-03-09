import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isConfigured = !!(supabaseUrl && supabaseAnonKey);

if (!isConfigured) {
    console.warn(
        '⚠️ Supabase not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in client/.env'
    );
}

// Create client even with empty strings — queries will simply fail gracefully
export const supabase = isConfigured
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;
