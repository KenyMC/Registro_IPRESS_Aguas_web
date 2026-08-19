const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyNsRr6X3lMVZKFQ7i371hkmvnkLDY1C7T1Yt236JNyz2FHKjQMMrD2bvzqeXNPF4xg/exec";

export interface SyncRequest {
  tipo: "diagnostico" | "monitoreo";
  uuid: string;
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
  cloro?: string;
  temperatura?: string;
  ph?: string;
  turbiedad?: string;
  conductividad?: string;
}

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
