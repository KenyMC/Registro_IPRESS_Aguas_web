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
  const existingIndex = records.findIndex(r => r.id === record.id);
  
  if (existingIndex >= 0) {
    records[existingIndex] = record;
  } else {
    records.push(record);
  }
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
};

export const deleteRecord = (id: string): void => {
  const records = getRecords();
  const updatedRecords = records.filter(r => r.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedRecords));
};

export const getRecordById = (id: string): LocalRecord | undefined => {
  return getRecords().find(r => r.id === id);
};

export const mergeRecords = (serverRecords: any[]): void => {
  const localRecords = getRecords();
  
  // We use UUID to match server records with local records.
  // We assume server records are already formatted as LocalRecord, but with id = uuid
  
  serverRecords.forEach(serverRecord => {
    // Check if it already exists locally
    const existingIndex = localRecords.findIndex(r => r.uuid === serverRecord.uuid);
    
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
};
