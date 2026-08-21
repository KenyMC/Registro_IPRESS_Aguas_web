const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzuc3MWqcQL76TAUS_gHKW0qV23uGGVSnrwMlFfqL8XEKfBYDXkE2kbZcsB_sn_plKt/exec";

export interface SyncRequest {
  tipo: "diagnostico" | "monitoreo";
  uuid: string;
  estado?: "Activo" | "Inactivo";
  fechaRegistro: string;
  nombreIpress: string;
  codigoRenipress: string;
  unidadEjecutora: string;

  // Diagnóstico
  provincia?: string;
  distrito?: string;
  centroPoblado?: string;
  ubigeo?: string;
  latitud?: string;
  longitud?: string;
  altitud?: string;
  precision?: string;
  aguaPropio?: string;
  fuenteAgua?: string;
  bombasAgua?: string;
  bombasOperativas?: string;
  reservorio?: string;
  reservorioElevado?: string;
  reservorioOperativo?: string;
  volumenReservorio?: string;
  cisterna?: string;
  volumenCisterna?: string;
  cisternaOperativa?: string;
  tratamientoAgua?: string;
  observaciones?: string;
  responsable?: string;
  dni?: string;
  firma?: string;

  // Monitoreo
  puntosMonitoreo?: string;
  cloro?: string;
  temperatura?: string;
  ph?: string;
  turbiedad?: string;
  conductividad?: string;
}

export interface User {
  usuario: string;
  contrasena: string;
  codigoRenipress: string;
  red: string;
  rol: string;
  estado: string;
}

export const syncUser = async (userPayload: Partial<User>): Promise<boolean> => {
  if (import.meta.env.VITE_APP_OFFLINE_MODE === 'true') {
    return true;
  }
  
  try {
    const response = await fetch(SCRIPT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify({
        tipo: 'usuario',
        ...userPayload
      }),
    });

    if (response.ok || response.type === 'opaque') {
      return true;
    }
    return false;
  } catch (error) {
    console.error('Network error during user sync:', error);
    return false;
  }
};

export const syncEntry = async (data: SyncRequest): Promise<boolean> => {
  try {
    // Note: We use mode 'no-cors' to avoid CORS issues from the browser to Apps Script.
    // This means we won't be able to read the JSON response, but the data will be sent.
    // If the Apps Script allows CORS, we could use cors mode. Standard for simple GAS is plain text.
    await fetch(SCRIPT_URL, {
      method: "POST",
      mode: "no-cors",
      headers: {
        "Content-Type": "text/plain", // often required for GAS to avoid preflight
      },
      body: JSON.stringify(data),
    });

    // no-cors mode returns an opaque response with status 0, so we just return true.
    return true;
  } catch (error) {
    console.error("Error syncing entry:", error);
    return false;
  }
};

export const fetchRecordsFromServer = async (): Promise<any[]> => {
  try {
    const response = await fetch(SCRIPT_URL);
    if (!response.ok) {
      throw new Error("Network response was not ok");
    }
    const data = await response.json();
    if (data.error) {
      console.error("Error from Apps Script:", data.error);
      return [];
    }
    return data;
  } catch (error) {
    console.error("Error fetching records:", error);
    return [];
  }
};
