
import { ClassRoom, School } from "../types";
import { supabase } from "./supabaseClient";

/**
 * Realiza o upload (upsert) de todos os dados locais para a nuvem.
 */
export const syncDataWithServer = async (schools: School[], classes: ClassRoom[]): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.warn("Sincronização abortada: Usuário não autenticado.");
      return false;
    }

    const { error } = await supabase
      .from('user_data')
      .upsert({ 
        user_id: user.id, 
        payload: { schools, classes },
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });

    if (error) throw error;
    
    console.log("Sincronização concluída com sucesso.");
    return true;
  } catch (e) {
    console.error("Erro crítico na sincronização:", e);
    return false;
  }
};

/**
 * Busca os dados remotos para sincronização inicial.
 */
export const fetchRemoteData = async (): Promise<{ schools: School[], classes: ClassRoom[] } | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('user_data')
      .select('payload')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = Sem dados encontrados
    return data?.payload || null;
  } catch (e) {
    console.error("Erro ao buscar dados remotos:", e);
    return null;
  }
};

export const checkConnectivity = (): boolean => {
  return typeof navigator !== 'undefined' && navigator.onLine;
};
