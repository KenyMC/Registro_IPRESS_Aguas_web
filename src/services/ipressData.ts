export interface IpressRecord {
  red: string;
  nombre: string;
  codigo: string;
  provincia: string;
  distrito: string;
}

const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRG1HXPR7diMfcx8yKjmJ4zCFp41pWpamWO_6a0pyUDPxgnWmjhwKI5VpIt2Mhi5nLL9zdmko1Fgs0E/pub?gid=750939278&single=true&output=csv";
const STORAGE_KEY = "ipress_list_cache";

/**
 * Normaliza un código RENIPRESS al estándar de 8 dígitos con ceros iniciales.
 * Ejemplos: "2314" -> "00002314", "00002314" -> "00002314", 2314 -> "00002314"
 */
export const normalizeRenipress = (code?: any): string => {
  if (code === undefined || code === null || code === '' || code === 'S/N') return '';
  const str = String(code).trim();
  if (!str || str === 'S/N') return '';
  // Si contiene solo dígitos, completar con ceros a la izquierda hasta 8 dígitos
  if (/^\d+$/.test(str)) {
    return str.padStart(8, '0');
  }
  return str;
};

/**
 * Compara dos códigos RENIPRESS de forma segura, ignorando si tienen ceros iniciales o son numéricos.
 * Retorna true si representan la misma IPRESS.
 */
export const matchRenipress = (codeA?: any, codeB?: any): boolean => {
  if (!codeA || !codeB || codeA === 'S/N' || codeB === 'S/N') return false;
  const strA = String(codeA).trim();
  const strB = String(codeB).trim();
  if (!strA || !strB) return false;
  
  if (strA === strB) return true;
  
  const normA = normalizeRenipress(strA);
  const normB = normalizeRenipress(strB);
  if (normA && normB && normA === normB) return true;
  
  const numA = Number(strA);
  const numB = Number(strB);
  if (!isNaN(numA) && !isNaN(numB) && numA === numB) return true;
  
  return false;
};

export const fetchAndCacheIpressList = async (): Promise<void> => {
  try {
    if (!navigator.onLine) return; // Don't attempt to fetch if offline

    const response = await fetch(CSV_URL);
    if (!response.ok) throw new Error("Failed to fetch CSV");
    
    const csvText = await response.text();
    const records = parseCsv(csvText);
    
    if (records.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    }
  } catch (error) {
    console.error("Error fetching IPRESS list:", error);
  }
};

export const getCachedIpressList = (): IpressRecord[] => {
  const cached = localStorage.getItem(STORAGE_KEY);
  if (cached) {
    try {
      return JSON.parse(cached) as IpressRecord[];
    } catch (e) {
      console.error("Error parsing cached IPRESS list:", e);
    }
  }
  return [];
};

// Simple CSV parser
const parseCsv = (csvText: string): IpressRecord[] => {
  const lines = csvText.split('\n');
  if (lines.length < 2) return [];

  const records: IpressRecord[] = [];
  
  // Skip header (line 0)
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Handle possible quotes in CSV (though the provided one is simple comma separated)
    // A simple split by comma is enough for the provided data structure
    const cols = line.split(',');
    
    if (cols.length >= 5) {
      records.push({
        red: cols[0].trim(),
        nombre: cols[1].trim(),
        codigo: cols[2].trim(),
        provincia: cols[3].trim(),
        distrito: cols[4].trim()
      });
    }
  }

  return records;
};
