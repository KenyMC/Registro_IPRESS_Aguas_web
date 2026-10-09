import * as XLSX from 'xlsx';
import { LocalRecord } from '../services/storage';
import { generateUUID } from './uuid';

export const exportRecordsToExcel = (records: LocalRecord[], fileNamePrefix: string, sheetName: string = 'Registros') => {
  if (!records || records.length === 0) {
    alert("No hay registros para exportar");
    return;
  }

  // Clonar, ordenar ascendentemente y limpiar los datos para exportación
  const sortedRecords = [...records].sort((a, b) => new Date(a.fechaRegistro).getTime() - new Date(b.fechaRegistro).getTime());

  const exportData = sortedRecords.map((record) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const {
      firma, firmaMime, firmaName, urlFirma,
      foto1Base64, foto1Mime, foto1Name, urlFoto1,
      foto2Base64, foto2Mime, foto2Name, urlFoto2,
      foto3Base64, foto3Mime, foto3Name, urlFoto3,
      id: internalId, isSynced, tipo, estado, uuid,
      ...exportableData
    } = record as any;

    // Formatear fechaRegistro a DD/MM/YYYY HH:mm:ss
    if (exportableData.fechaRegistro) {
      const dateObj = new Date(exportableData.fechaRegistro);
      if (!isNaN(dateObj.getTime())) {
        const day = String(dateObj.getDate()).padStart(2, '0');
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const year = dateObj.getFullYear();
        const hours = String(dateObj.getHours()).padStart(2, '0');
        const minutes = String(dateObj.getMinutes()).padStart(2, '0');
        const seconds = String(dateObj.getSeconds()).padStart(2, '0');
        exportableData.fechaRegistro = `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
      }
    }

    // Formatear fecha a DD-MM-YYYY
    if (exportableData.fecha && typeof exportableData.fecha === 'string' && exportableData.fecha.includes('T')) {
      const dateObj = new Date(exportableData.fecha);
      if (!isNaN(dateObj.getTime())) {
        const day = String(dateObj.getDate()).padStart(2, '0');
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const year = dateObj.getFullYear();
        exportableData.fecha = `${day}-${month}-${year}`;
      }
    }

    // Formatear hora a HH:mm:ss
    if (exportableData.hora && typeof exportableData.hora === 'string' && exportableData.hora.includes('T')) {
      const horaObj = new Date(exportableData.hora);
      if (!isNaN(horaObj.getTime())) {
        const hours = String(horaObj.getHours()).padStart(2, '0');
        const minutes = String(horaObj.getMinutes()).padStart(2, '0');
        const seconds = String(horaObj.getSeconds()).padStart(2, '0');
        exportableData.hora = `${hours}:${minutes}:${seconds}`;
      }
    }

    return {
      id: uuid,
      ...exportableData
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
  
  XLSX.writeFile(workbook, `${fileNamePrefix}_${dateStr}_${timeStr}.xlsx`);
};

function parseImportDate(dateStr: any): string {
  if (typeof dateStr === 'number') {
    const jsDate = new Date(Math.round((dateStr - 25569) * 86400 * 1000));
    return jsDate.toISOString();
  }
  if (!dateStr || typeof dateStr !== 'string') return dateStr;
  
  let d = dateStr;
  if (d.includes('/')) {
    const parts = d.split(' ');
    const dateParts = parts[0].split('/');
    if (dateParts.length === 3) {
      let isoStr = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`;
      if (parts[1]) {
        isoStr += `T${parts[1]}.000Z`;
      } else {
        isoStr += `T00:00:00.000Z`;
      }
      return isoStr;
    }
  }
  if (d.includes('-') && d.length === 10) {
    const parts = d.split('-');
    if (parts[2] && parts[2].length === 4) {
      return `${parts[2]}-${parts[1]}-${parts[0]}T00:00:00.000Z`;
    }
  }
  return dateStr;
}

export const importRecordsFromExcel = (file: File, tipo: 'diagnostico' | 'monitoreo'): Promise<LocalRecord[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json<any>(worksheet, { defval: "" });
        
        const records: LocalRecord[] = json.map(row => {
          const rowId = row.id ? String(row.id) : '';
          const newUuid = rowId || generateUUID();
          
          const parsedRecord = {
            ...row,
            uuid: newUuid,
            id: `${tipo}-${newUuid}`,
            tipo,
            isSynced: false,
            estado: row.estado || 'Activo'
          };
          
          if (parsedRecord.fechaRegistro) parsedRecord.fechaRegistro = parseImportDate(parsedRecord.fechaRegistro);
          if (parsedRecord.fecha) parsedRecord.fecha = parseImportDate(parsedRecord.fecha);
          if (parsedRecord.hora) {
            if (typeof parsedRecord.hora === 'number') {
               const totalSeconds = Math.round(parsedRecord.hora * 86400);
               const hours = Math.floor(totalSeconds / 3600);
               const minutes = Math.floor((totalSeconds % 3600) / 60);
               const seconds = totalSeconds % 60;
               parsedRecord.hora = `${String(hours).padStart(2,'0')}:${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')}`;
            }
          }
          
          return parsedRecord as LocalRecord;
        });
        resolve(records);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsBinaryString(file);
  });
};
