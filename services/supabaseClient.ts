
import { createClient } from '@supabase/supabase-js';

// Função auxiliar para buscar variáveis de ambiente em diferentes contextos (Vite, Process, ImportMeta)
const getEnv = (key: string): string => {
  const env = (import.meta as any).env || {};
  const proc = (typeof process !== 'undefined' ? (process as any).env : {}) || {};
  return env[key] || proc[key] || '';
};

// Busca pelas chaves padrões do Vite e também pelas chaves fornecidas (NEXT_PUBLIC)
const supabaseUrl = 
  getEnv('VITE_SUPABASE_URL') || 
  getEnv('NEXT_PUBLIC_SUPABASE_URL') || 
  getEnv('SUPABASE_URL');

const supabaseAnonKey = 
  getEnv('VITE_SUPABASE_ANON_KEY') || 
  getEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY') || 
  getEnv('SUPABASE_ANON_KEY');

// O erro "supabaseUrl is required" ocorre se a string for vazia. 
// Usamos um fallback apenas para evitar o crash imediato do script, 
// mas a funcionalidade real depende das chaves estarem corretas no ambiente.
if (!supabaseUrl) {
  console.warn("Supabase URL não encontrada. Verifique as variáveis de ambiente.");
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder-project.supabase.co', 
  supabaseAnonKey || 'placeholder-anon-key'
);
