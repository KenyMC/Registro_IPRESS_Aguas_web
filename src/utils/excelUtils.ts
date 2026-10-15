import * as XLSX from 'xlsx';
import { LocalRecord, isValidRecord } from '../services/storage';
import { generateUUID } from './uuid';
import { normalizeRenipress } from '../services/ipressData';

export const exportRecordsToExcel = (records: LocalRecord[], fileNamePrefix: string, sheetName: string = 'Registros') => {
  const validRecords = (records || []).filter(isValidRecord);
  if (!validRecords || validRecords.length === 0) {
    alert("No hay registros válidos para exportar");
    return;
  }

  // Clonar, ordenar ascendentemente y limpiar los datos para exportación
  const sortedRecords = [...validRecords].sort((a, b) => new Date(a.fechaRegistro).getTime() - new Date(b.fechaRegistro).getTime());

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
  
  let d = dateStr.trim();
  if (d.includes('/')) {
    const parts = d.split(' ');
    const dateParts = parts[0].split('/');
    if (dateParts.length === 3) {
      let isoStr = `${dateParts[2]}-${dateParts[1].padStart(2, '0')}-${dateParts[0].padStart(2, '0')}`;
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
      return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}T00:00:00.000Z`;
    }
  }
  return dateStr;
}

const getVal = (row: any, ...keys: string[]): any => {
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== '') {
      return row[k];
    }
  }
  return '';
};

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
        
        const records: LocalRecord[] = [];

        for (const row of json) {
          // Extraer nombre y código con soporte para encabezados tanto en inglés/código como en español de Google Sheets
          const nombreIpress = String(getVal(row, 'nombreIpress', 'Nombre de la IPRESS', 'NOMBRE DE LA IPRESS', 'IPRESS', 'Nombre IPRESS')).trim();
          const rawRenipress = getVal(row, 'codigoRenipress', 'Código RENIPRESS', 'Codigo RENIPRESS', 'CODIGO RENIPRESS', 'RENIPRESS');
          const codigoRenipress = normalizeRenipress(rawRenipress) || String(rawRenipress || '').trim();
          
          // FILTRO ESTRICTO: Descartar filas vacías de Excel que no tengan IPRESS ni RENIPRESS
          if (!nombreIpress && !codigoRenipress) {
            continue;
          }

          const rowId = String(getVal(row, 'id', 'uuid', 'IDD', 'ID')).trim();
          const newUuid = rowId || generateUUID();
          
          const rawFechaReg = getVal(row, 'fechaRegistro', 'Fecha Creacion', 'Fecha Creación', 'FECHA CREACION', 'Fecha Registro');
          const rawFecha = getVal(row, 'fecha', 'Fecha de Evaluacion', 'Fecha de Evaluación', 'Fecha', 'FECHA');
          let rawHora = getVal(row, 'hora', 'Hora de Evaluacion', 'Hora de Evaluación', 'Hora', 'HORA');

          if (typeof rawHora === 'number') {
            const totalSeconds = Math.round(rawHora * 86400);
            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const seconds = totalSeconds % 60;
            rawHora = `${String(hours).padStart(2,'0')}:${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')}`;
          }

          const parsedRecord: any = {
            ...row,
            tipo,
            uuid: newUuid,
            id: `${tipo}-${newUuid}`,
            isSynced: false,
            estado: getVal(row, 'estado', 'Estado') || 'Activo',
            unidadEjecutora: String(getVal(row, 'unidadEjecutora', 'Unidad Ejecutora', 'Red')).trim(),
            nombreIpress,
            codigoRenipress,
            fechaRegistro: rawFechaReg ? parseImportDate(rawFechaReg) : new Date().toISOString(),
            fecha: rawFecha ? parseImportDate(rawFecha) : '',
            hora: rawHora || '',
            provincia: String(getVal(row, 'provincia', 'Provincia')).trim(),
            distrito: String(getVal(row, 'distrito', 'Distrito')).trim(),
            centroPoblado: String(getVal(row, 'centroPoblado', 'Centro Poblado')).trim(),
            ubigeo: String(getVal(row, 'ubigeo', 'Ubigeo CCPP', 'Ubigeo')).trim(),
            latitud: getVal(row, 'latitud', 'Latitud'),
            longitud: getVal(row, 'longitud', 'Longitud'),
            altitud: getVal(row, 'altitud', 'Altitud'),
            precision: getVal(row, 'precision', 'Precisión', 'Precision'),
            responsable: String(getVal(row, 'responsable', 'Nombre del Responsable', 'Responsable')).trim(),
            dni: String(getVal(row, 'dni', 'DNI del Responsable', 'DNI')).trim(),
          };

          if (tipo === 'diagnostico') {
            parsedRecord.aguaPropio = getVal(row, 'aguaPropio', 'Sistema Propio');
            parsedRecord.fuenteAgua = getVal(row, 'fuenteAgua', 'Fuente de Agua');
            parsedRecord.bombasAgua = getVal(row, 'bombasAgua', 'Tiene Bombas');
            parsedRecord.bombasOperativas = getVal(row, 'bombasOperativas', 'Bombas Operativas');
            parsedRecord.reservorio = getVal(row, 'reservorio', 'Tiene Reservorio');
            parsedRecord.tipoMaterialReservorio = getVal(row, 'tipoMaterialReservorio', 'Tipo de Material del Reservorio');
            parsedRecord.volumenReservorio = getVal(row, 'volumenReservorio', 'Volumen del Reservorio (m3)');
            parsedRecord.reservorioElevado = getVal(row, 'reservorioElevado', 'Reservorio Elevado');
            parsedRecord.reservorioOperativo = getVal(row, 'reservorioOperativo', 'Reservorio Operativo');
            parsedRecord.cisterna = getVal(row, 'cisterna', 'Tiene Cisterna');
            parsedRecord.volumenCisterna = getVal(row, 'volumenCisterna', 'Volumen de la Cisterna (m3)');
            parsedRecord.cisternaOperativa = getVal(row, 'cisternaOperativa', 'Cisterna Operativa');
            parsedRecord.tratamientoAgua = getVal(row, 'tratamientoAgua', 'Tratamiento de Agua');
            parsedRecord.observaciones = getVal(row, 'observaciones', 'Observaciones');
            parsedRecord.urlFoto1 = getVal(row, 'urlFoto1', 'URL Foto 1');
            parsedRecord.urlFoto2 = getVal(row, 'urlFoto2', 'URL Foto 2');
            parsedRecord.urlFoto3 = getVal(row, 'urlFoto3', 'URL Foto 3');
            parsedRecord.firma = getVal(row, 'firma', 'URL Firma');
          } else {
            parsedRecord.puntosMonitoreo = getVal(row, 'puntosMonitoreo', 'Puntos de Monitoreo', 'Puntos Monitoreo');
            parsedRecord.cloro = getVal(row, 'cloro', 'Cloro Residual Libre (mg/L)', 'Cloro');
            parsedRecord.temperatura = getVal(row, 'temperatura', 'Temperatura (°C)', 'Temperatura');
            parsedRecord.ph = getVal(row, 'ph', 'pH', 'PH');
            parsedRecord.turbiedad = getVal(row, 'turbiedad', 'Turbiedad (UNT)', 'Turbiedad');
            parsedRecord.conductividad = getVal(row, 'conductividad', 'Conductividad (µS/cm)', 'Conductividad');
            parsedRecord.std = getVal(row, 'std', 'STD (mg/L)', 'STD');
            parsedRecord.analisisBacteriologico = getVal(row, 'analisisBacteriologico', 'Análisis Bacteriológico', 'Analisis Bacteriologico');
            parsedRecord.urlFoto1 = getVal(row, 'urlFoto1', 'URL Foto 1');
            parsedRecord.firma = getVal(row, 'firma', 'URL Firma');
          }

          records.push(parsedRecord as LocalRecord);
        }

        resolve(records);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsBinaryString(file);
  });
};
