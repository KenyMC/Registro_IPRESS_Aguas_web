import * as XLSX from 'xlsx';
import { LocalRecord } from '../services/storage';

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
