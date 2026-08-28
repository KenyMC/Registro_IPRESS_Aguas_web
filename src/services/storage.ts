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
    if (String(r.uuid) === String(record.uuid) && record.uuid !== '') return true;
    if (r.id && String(r.id) === String(record.id)) return true;
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
  return getRecords().find(r => String(r.id) === String(id));
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const mergeRecords = (serverRecords: any[]): void => {
  const localRecords = getRecords();
  
  // Keep ONLY local records that have NOT been synced yet
  const unsyncedLocalRecords = localRecords.filter(r => !r.isSynced);
  
  // Map server records to local format
  const formattedServerRecords: LocalRecord[] = serverRecords.map(serverRecord => ({
      ...serverRecord,
      uuid: String(serverRecord.uuid || ''),
      id: String(serverRecord.uuid || ''),
      isSynced: true
  }));

  const finalRecords: LocalRecord[] = [...formattedServerRecords];
  
  // Deduplicate unsynced local records that might actually be on the server
  unsyncedLocalRecords.forEach(localRecord => {
    const isAlreadyOnServer = formattedServerRecords.some(serverRecord => {
      if (String(localRecord.uuid) === String(serverRecord.uuid) && serverRecord.uuid !== '') return true;
      if (localRecord.fechaRegistro && serverRecord.fechaRegistro) {
        try {
          const localDate = new Date(localRecord.fechaRegistro);
          const serverDate = new Date(serverRecord.fechaRegistro);
          if (!isNaN(localDate.getTime()) && !isNaN(serverDate.getTime())) {
            const timeDiff = Math.abs(localDate.getTime() - serverDate.getTime());
            if (timeDiff < 120000) { // within 2 minutes
              return localRecord.nombreIpress === serverRecord.nombreIpress && localRecord.tipo === serverRecord.tipo;
            }
          }
        } catch (e) {}
        return localRecord.fechaRegistro === serverRecord.fechaRegistro && localRecord.nombreIpress === serverRecord.nombreIpress && localRecord.tipo === serverRecord.tipo;
      }
      return false;
    });
    
    // If it's NOT on the server, we keep it as pending!
    if (!isAlreadyOnServer) {
      finalRecords.push(localRecord);
    }
  });
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(finalRecords));
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
