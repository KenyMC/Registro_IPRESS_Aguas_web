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

const extractDateHelper = (val: string | undefined): string | null => {
  if (!val) return null;
  if (typeof val !== 'string') {
    try { return new Date(val).toISOString().split('T')[0]; } catch(e) { return null; }
  }
  if (val.match(/^\d{4}-\d{2}-\d{2}/)) return val.substring(0, 10);
  if (val.match(/^\d{2}-\d{2}-\d{4}/)) {
    const parts = val.split(' ')[0].split('-');
    if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  if (val.includes('T')) return val.split('T')[0];
  try {
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  } catch(e) {}
  return null;
};

/**
 * FUSIÓN DE REGISTROS Y SINCRONIZACIÓN DE ELIMINACIONES
 * -----------------------------------------------------
 * Esta función es el corazón del comportamiento "Offline-first" interactivo.
 * Su lógica principal es:
 * 1. El servidor (Google Sheets) es la FUENTE ABSOLUTA DE LA VERDAD para los registros sincronizados.
 * 2. Se filtran estrictamente filas vacías que puedan provenir del servidor o de importaciones previas.
 * 3. Descarta COMPLETAMENTE los registros locales que ya están sincronizados a favor de la lista del servidor.
 * 4. Deduplica registros idénticos que hayan entrado dos veces en Google Sheets (misma IPRESS + fecha).
 * 5. Solo conserva registros locales válidos que estén PENDIENTES de sincronización (isSynced = false).
 * 
 * BENEFICIO CLAVE:
 * Elimina inmediatamente cualquier registro en blanco, fantasma o duplicado y sincroniza exactamente con Google Sheets.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const mergeRecords = (serverData: any[]): void => {
  // 1. Filtrar registros válidos del servidor (ignorar filas vacías o inactivas de Google Sheets)
  const validServerData = (serverData || []).filter(r => isValidRecord(r) && r.estado !== 'Inactivo');
  
  // 1.1 Deduplicación defensiva en el cliente:
  // Si en el servidor existen registros duplicados (mismo tipo, misma IPRESS y misma fecha),
  // conservamos únicamente el primero para garantizar que en pantalla jamás aparezca duplicado.
  const seenKeys = new Set<string>();
  const deduplicatedServerData: any[] = [];
  
  for (const item of validServerData) {
    const ipressKey = String(item.codigoRenipress || item.nombreIpress || '').trim().toLowerCase();
    const dateKey = extractDateHelper(item.fecha) || extractDateHelper(item.fechaRegistro) || '';
    
    if (item.tipo === 'diagnostico' && ipressKey && dateKey) {
      const dedupKey = `${item.tipo}|${ipressKey}|${dateKey}`;
      if (seenKeys.has(dedupKey)) {
        continue; // Ignorar copia duplicada del servidor
      }
      seenKeys.add(dedupKey);
    }
    deduplicatedServerData.push(item);
  }
  
  // 2. Establecer la lista base con los registros oficiales y limpios de Google Sheets
  const finalRecords: LocalRecord[] = deduplicatedServerData.map(item => ({
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

let isSyncing = false;

export const syncPendingRecords = async (): Promise<void> => {
  if (!navigator.onLine) return;
  if (isSyncing) {
    console.log('Sincronización en curso, llamada ignorada para evitar duplicados.');
    return;
  }

  isSyncing = true;
  try {
    const records = getRecords();
    const pendingRecords = records.filter(r => !r.isSynced && r.estado !== 'Inactivo');
    
    if (pendingRecords.length === 0) return;
    console.log(`Intentando sincronizar ${pendingRecords.length} registros pendientes...`);
    
    // Dynamic import to avoid circular dependencies if we need api functions
    const { syncEntry } = await import('./api');
    
    for (const record of pendingRecords) {
      const success = await syncEntry(record);
      if (success) {
        // ACTUALIZACIÓN INMEDIATA POR REGISTRO:
        // Se persiste de inmediato como isSynced = true en localStorage para que ningún otro evento
        // o recarga vuelva a reenviarlo a Google Apps Script.
        const currentRecords = getRecords();
        const idx = currentRecords.findIndex(r => r.id === record.id);
        if (idx >= 0) {
          currentRecords[idx].isSynced = true;
          localStorage.setItem(STORAGE_KEY, JSON.stringify(currentRecords));
        }
      }
      // Pequeña pausa de 350ms para evitar bloqueos por cuota concurrente en Google Apps Script
      await new Promise(res => setTimeout(res, 350));
    }
    
    // Disparar evento para actualizar UI
    window.dispatchEvent(new Event('recordsUpdated'));
  } catch (err) {
    console.error('Error durante syncPendingRecords:', err);
  } finally {
    isSyncing = false;
  }
};
