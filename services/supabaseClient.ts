
import { createClient } from '@supabase/supabase-js';

// Fix: Use type assertion for import.meta to avoid TypeScript errors when accessing env variables in Vite environments
const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
