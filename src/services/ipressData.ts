export interface IpressRecord {
  red: string;
  nombre: string;
  codigo: string;
  provincia: string;
  distrito: string;
}

const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRG1HXPR7diMfcx8yKjmJ4zCFp41pWpamWO_6a0pyUDPxgnWmjhwKI5VpIt2Mhi5nLL9zdmko1Fgs0E/pub?gid=750939278&single=true&output=csv";
const STORAGE_KEY = "ipress_list_cache";

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
