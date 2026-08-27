import { SyncRequest } from './api';

export interface LocalRecord extends SyncRequest {
  id: string; // Internal ID for local operations
  isSynced: boolean; // Tells us if it was successfully sent to Google Apps Script
}

const STORAGE_KEY = 'aguas_ipress_records';

export const getRecords = (): LocalRecord[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Error reading from local storage", error);
    return [];
  }
};

export const saveRecord = (record: LocalRecord): void => {
  const records = getRecords();
  
  // Find matching local record by UUID (backend assigns UUIDs to new records)
  const existingIndex = records.findIndex(r => {
    if (r.uuid === record.uuid && r.uuid !== '') return true;
    if (r.id && r.id === record.id) return true;
    if (!r.uuid && r.fechaRegistro && record.fechaRegistro) {
      try {
        const localDate = new Date(r.fechaRegistro);
        const recordDate = new Date(record.fechaRegistro);
        if (!isNaN(localDate.getTime()) && !isNaN(recordDate.getTime())) {
          const timeDiff = Math.abs(localDate.getTime() - recordDate.getTime());
          if (timeDiff < 120000) { // within 2 minutes
            return r.nombreIpress === record.nombreIpress;
          }
        }
      } catch (e) {
        // ignore
      }
      return r.fechaRegistro === record.fechaRegistro && r.nombreIpress === record.nombreIpress;
    }
    return false;
  });
  
  if (existingIndex >= 0) {
    records[existingIndex] = record;
  } else {
    records.push(record);
  }
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  window.dispatchEvent(new Event('recordsUpdated'));
};

export const deleteRecord = (id: string): void => {
  const records = getRecords();
  const updatedRecords = records.filter(r => r.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedRecords));
  window.dispatchEvent(new Event('recordsUpdated'));
};

export const getRecordById = (id: string): LocalRecord | undefined => {
  return getRecords().find(r => r.id === id);
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const mergeRecords = (serverRecords: any[]): void => {
  const localRecords = getRecords();
  
  // We use UUID to match server records with local records.
  // We assume server records are already formatted as LocalRecord, but with id = uuid
  
  serverRecords.forEach(serverRecord => {
    // Check if it already exists locally by UUID or by timestamp (ignoring milliseconds) and name
    const existingIndex = localRecords.findIndex(r => {
      if (r.uuid === serverRecord.uuid && r.uuid !== '') return true;
      if (r.fechaRegistro && serverRecord.fechaRegistro) {
        try {
          const localDate = new Date(r.fechaRegistro);
          const serverDate = new Date(serverRecord.fechaRegistro);
          if (!isNaN(localDate.getTime()) && !isNaN(serverDate.getTime())) {
            const timeDiff = Math.abs(localDate.getTime() - serverDate.getTime());
            if (timeDiff < 120000) { // within 2 minutes
              return r.nombreIpress === serverRecord.nombreIpress && r.tipo === serverRecord.tipo;
            }
          }
        } catch (e) {
          // ignore Invalid time value
        }
        // Fallback to exact string match
        return r.fechaRegistro === serverRecord.fechaRegistro && r.nombreIpress === serverRecord.nombreIpress && r.tipo === serverRecord.tipo;
      }
      return false;
    });
    
    // Server record is synced by definition
    const formattedRecord: LocalRecord = {
      ...serverRecord,
      id: serverRecord.uuid, // Use uuid as internal id for downloaded records
      isSynced: true
    };

    if (existingIndex >= 0) {
      // For conflicts, typically we could check a timestamp, but for simplicity we assume the server state might be updated by other devices. 
      // If local record is NOT synced, we might want to keep local, but since it's an offline-first, if it exists locally, it might be pending.
      // Actually, if it exists on server, it means it's synced. Let's just update local with server data (especially state).
      localRecords[existingIndex] = { ...localRecords[existingIndex], ...formattedRecord, isSynced: true };
    } else {
      localRecords.push(formattedRecord);
    }
  });
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(localRecords));
  window.dispatchEvent(new Event('recordsUpdated'));
};

export const syncPendingRecords = async (): Promise<void> => {
  if (!navigator.onLine) return;
  const records = getRecords();
  const pendingRecords = records.filter(r => !r.isSynced);
  
  if (pendingRecords.length === 0) return;
  console.log(`Intentando sincronizar ${pendingRecords.length} registros pendientes...`);
  
  // Dynamic import to avoid circular dependencies if we need api functions
  const { syncEntry } = await import('./api');
  
  let updated = false;
  for (const record of pendingRecords) {
    const success = await syncEntry(record);
    if (success) {
      record.isSynced = true;
      updated = true;
    }
  }
  
  if (updated) {
    // Save all changes at once
    const updatedRecords = getRecords();
    const finalRecords = updatedRecords.map(r => {
      const syncedMatch = pendingRecords.find(pr => pr.id === r.id);
      if (syncedMatch && syncedMatch.isSynced) {
        return { ...r, isSynced: true };
      }
      return r;
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(finalRecords));
    // Trigger custom event so UI can update
    window.dispatchEvent(new Event('recordsUpdated'));
  }
};
