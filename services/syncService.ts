
import { ClassRoom } from "../types";

// Simula uma API de backend
const MOCK_API_DELAY = 1500;

export const syncDataWithServer = async (data: ClassRoom[]): Promise<boolean> => {
  // Simula o envio dos dados para um servidor central
  return new Promise((resolve) => {
    console.log("Sincronizando com o servidor...", data);
    
    // Simula latência de rede
    setTimeout(() => {
      // Simula sucesso na sincronização
      // Em um cenário real, aqui faríamos um POST para /api/sync
      localStorage.setItem('edugrade_last_sync_timestamp', Date.now().toString());
      resolve(true);
    }, MOCK_API_DELAY);
  });
};

export const checkConnectivity = (): boolean => {
  return navigator.onLine;
};
