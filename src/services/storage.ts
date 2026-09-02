import { SyncRequest } from './api';
import { generateUUID } from '../utils/uuid';

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
  
  // Find matching local record by UUID and type (backend assigns UUIDs to new records)
  const existingIndex = records.findIndex(r => {
    if (String(r.uuid) === String(record.uuid) && record.uuid !== '' && r.tipo === record.tipo) return true;
    if (r.id && String(r.id) === String(record.id)) return true;
    if (!r.uuid && r.fechaRegistro && record.fechaRegistro && r.tipo === record.tipo) {
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

/**
 * FUSIÓN DE REGISTROS Y SINCRONIZACIÓN DE ELIMINACIONES
 * -----------------------------------------------------
 * Esta función es el corazón del comportamiento "Offline-first" interactivo.
 * Su lógica principal es:
 * 1. El servidor (Google Sheets) es la FUENTE ABSOLUTA DE LA VERDAD para los registros sincronizados.
 * 2. El cliente retiene temporalmente sus registros "pendientes de sincronización".
 * 3. Descarta COMPLETAMENTE los registros sincronizados locales y adopta los que vienen del servidor.
 * 
 * BENEFICIO CLAVE (Sincronización de Eliminaciones):
 * Como los registros sincronizados locales se descartan a favor de la lista del servidor, si
 * un registro fue eliminado en Google Sheets (ya no viene en la petición), automáticamente
 * desaparecerá del almacenamiento local del usuario (y de la pantalla, en combinación con el polleo de App.tsx).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const mergeRecords = (serverData: any[]): void => {
  const localRecords = getRecords();
  
  // Create a new array that will hold the merged result
  // Start with server records, marked as synced. Avoid ID collisions between tipos.
  const finalRecords: LocalRecord[] = serverData.map(item => ({
    ...item,
    uuid: String(item.uuid || ''),
    id: item.uuid ? `${item.tipo}-${item.uuid}` : generateUUID(),
    isSynced: true
  }));
  
  // Now, add any local records that have NOT been synced yet (isSynced = false)
  // or that are not present in the server data.
  localRecords.forEach(localRecord => {
    // Check if this local record is already in the server data
    const isAlreadyOnServer = finalRecords.some(serverRecord => {
      if (String(localRecord.uuid) === String(serverRecord.uuid) && serverRecord.uuid !== '' && localRecord.tipo === serverRecord.tipo) return true;
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
