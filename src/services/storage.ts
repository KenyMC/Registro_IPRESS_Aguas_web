import { SyncRequest } from './api';
import { generateUUID } from '../utils/uuid';

export interface LocalRecord extends SyncRequest {
  id: string; // Internal ID for local operations
  isSynced: boolean; // Tells us if it was successfully sent to Google Apps Script
}

const STORAGE_KEY = 'aguas_ipress_records';

export const isValidRecord = (r: any): boolean => {
  if (!r) return false;
  const hasName = r.nombreIpress !== undefined && r.nombreIpress !== null && String(r.nombreIpress).trim() !== '';
  const hasCode = r.codigoRenipress !== undefined && r.codigoRenipress !== null && String(r.codigoRenipress).trim() !== '';
  return hasName || hasCode;
};

export const getRecords = (): LocalRecord[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    const parsed: LocalRecord[] = JSON.parse(data);
    
    // Filtro estricto: Todo registro DEBE tener nombreIpress o codigoRenipress válido
    const valid = parsed.filter(isValidRecord);
    
    // Si habían registros corruptos o en blanco, eliminarlos del almacenamiento local inmediatamente
    if (valid.length !== parsed.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(valid));
    }
    return valid;
  } catch (error) {
    console.error("Error reading from local storage", error);
    return [];
  }
};

export const saveRecord = (record: LocalRecord): void => {
  if (!isValidRecord(record)) {
    console.warn("Intento de guardar registro sin IPRESS ni RENIPRESS ignorado:", record);
    return;
  }

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
 * 2. Se filtran estrictamente filas vacías que puedan provenir del servidor o de importaciones previas.
 * 3. Descarta COMPLETAMENTE los registros locales que ya están sincronizados a favor de la lista del servidor.
 * 4. Solo conserva registros locales válidos que estén PENDIENTES de sincronización (isSynced = false).
 * 
 * BENEFICIO CLAVE:
 * Elimina inmediatamente cualquier registro en blanco o fantasma y sincroniza exactamente con Google Sheets.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const mergeRecords = (serverData: any[]): void => {
  // 1. Filtrar registros válidos del servidor (ignorar filas vacías de Google Sheets)
  const validServerData = (serverData || []).filter(isValidRecord);
  
  // 2. Establecer la lista base con los registros oficiales de Google Sheets
  const finalRecords: LocalRecord[] = validServerData.map(item => ({
    ...item,
    uuid: String(item.uuid || ''),
    id: item.uuid ? `${item.tipo}-${item.uuid}` : generateUUID(),
    isSynced: true
  }));
  
  // 3. Obtener los registros locales
  const localRecords = getRecords();
  
  // 4. Solo conservar registros locales válidos que ESTÉN PENDIENTES DE ENVÍO (isSynced === false)
  localRecords.forEach(localRecord => {
    // Si ya está sincronizado localmente, no lo conservamos porque el servidor es la fuente de la verdad
    if (localRecord.isSynced) return;
    if (!isValidRecord(localRecord)) return;
    
    // Verificar si por casualidad ya llegó al servidor
    const isAlreadyOnServer = finalRecords.some(serverRecord => {
      if (String(localRecord.uuid) === String(serverRecord.uuid) && serverRecord.uuid !== '' && localRecord.tipo === serverRecord.tipo) return true;
      if (localRecord.fechaRegistro && serverRecord.fechaRegistro) {
        try {
          const localDate = new Date(localRecord.fechaRegistro);
          const serverDate = new Date(serverRecord.fechaRegistro);
          if (!isNaN(localDate.getTime()) && !isNaN(serverDate.getTime())) {
            const timeDiff = Math.abs(localDate.getTime() - serverDate.getTime());
            if (timeDiff < 120000) { // within 2 minutes
              return String(localRecord.nombreIpress).trim().toLowerCase() === String(serverRecord.nombreIpress).trim().toLowerCase() && localRecord.tipo === serverRecord.tipo;
            }
          }
        } catch (e) {}
        return localRecord.fechaRegistro === serverRecord.fechaRegistro && String(localRecord.nombreIpress).trim().toLowerCase() === String(serverRecord.nombreIpress).trim().toLowerCase() && localRecord.tipo === serverRecord.tipo;
      }
      return false;
    });
    
    // Si no está en el servidor aún, mantenerlo pendiente
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
