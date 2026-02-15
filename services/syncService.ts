
import { ClassRoom, School } from "../types";
import { supabase } from "./supabaseClient";

export const syncDataWithServer = async (schools: School[], classes: ClassRoom[]): Promise<boolean> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  try {
    const { error } = await supabase
      .from('user_data')
      .upsert({ 
        user_id: user.id, 
        payload: { schools, classes },
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });

    if (error) throw error;
    return true;
  } catch (e) {
    console.error("Sync Error:", e);
    return false;
  }
};

export const fetchRemoteData = async (): Promise<{ schools: School[], classes: ClassRoom[] } | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  try {
    const { data, error } = await supabase
      .from('user_data')
      .select('payload')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "no rows found"
    return data?.payload || null;
  } catch (e) {
    console.error("Fetch Error:", e);
    return null;
  }
};

export const checkConnectivity = (): boolean => {
  return typeof navigator !== 'undefined' && navigator.onLine;
};
