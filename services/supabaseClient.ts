
import { createClient } from '@supabase/supabase-js';

/**
 * Configuração do Cliente Supabase
 * 
 * Utilizamos import.meta.env com acesso seguro para evitar erros de runtime
 * caso o ambiente de execução não suporte a extensão de ambiente do Vite.
 */

// Acesso seguro ao objeto env
const env = (import.meta as any).env || (typeof process !== 'undefined' ? process.env : {}) || {};

// Tentativa de obter as credenciais das variáveis de ambiente
const supabaseUrl = env.VITE_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL;
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY || env.SUPABASE_ANON_KEY;

// Credenciais fornecidas pelo usuário como fallback final para garantir funcionamento imediato
const DEFAULT_URL = 'https://ukbatxpiwjqjdexaouna.supabase.co';
const DEFAULT_KEY = 'sb_publishable_l0veVJ8Dj0Sv4HdpPz98oA_isMrVkel';

const finalUrl = supabaseUrl || DEFAULT_URL;
const finalKey = supabaseAnonKey || DEFAULT_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Aviso: Variáveis de ambiente Supabase não detectadas. Usando credenciais de fallback.");
}

// Inicialização do cliente
export const supabase = createClient(finalUrl, finalKey);
