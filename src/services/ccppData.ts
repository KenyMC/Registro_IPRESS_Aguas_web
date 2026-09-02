export interface CcppRecord {
  provincia: string;
  distrito: string;
  ubigeo: string;
  centroPoblado: string;
}

const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRG1HXPR7diMfcx8yKjmJ4zCFp41pWpamWO_6a0pyUDPxgnWmjhwKI5VpIt2Mhi5nLL9zdmko1Fgs0E/pub?gid=788495918&single=true&output=csv";
const STORAGE_KEY = "ccpp_list_cache";

export const fetchAndCacheCcppList = async (): Promise<void> => {
  try {
    if (!navigator.onLine) return; // Don't attempt to fetch if offline

    const response = await fetch(CSV_URL);
    if (!response.ok) throw new Error("Failed to fetch CCPP CSV");
    
    const csvText = await response.text();
    const records = parseCsv(csvText);
    
    if (records.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    }
  } catch (error) {
    console.error("Error fetching CCPP list:", error);
  }
};

export const getCachedCcppList = (): CcppRecord[] => {
  const cached = localStorage.getItem(STORAGE_KEY);
  if (cached) {
    try {
      return JSON.parse(cached) as CcppRecord[];
    } catch (e) {
      console.error("Error parsing cached CCPP list:", e);
    }
  }
  return [];
};

// Simple CSV parser
const parseCsv = (csvText: string): CcppRecord[] => {
  const lines = csvText.split('\n');
  if (lines.length < 2) return [];

  const records: CcppRecord[] = [];
  
  // Skip header (line 0)
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const cols = line.split(',');
    
    if (cols.length >= 4) {
      let u = cols[2].trim();
      if (u.length === 9) u = '0' + u;

      records.push({
        provincia: cols[0].trim(),
        distrito: cols[1].trim(),
        ubigeo: u,
        centroPoblado: cols[3].trim()
      });
    }
  }

  return records;
};
