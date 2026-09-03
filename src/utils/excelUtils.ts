import * as XLSX from 'xlsx';
import { LocalRecord } from '../services/storage';

export const exportRecordsToExcel = (records: LocalRecord[], fileNamePrefix: string) => {
  if (!records || records.length === 0) {
    alert("No hay registros para exportar");
    return;
  }

  // Clonar y limpiar los datos para exportación
  const exportData = records.map((record) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const {
      firma, firmaMime, firmaName, urlFirma,
      foto1Base64, foto1Mime, foto1Name, urlFoto1,
      foto2Base64, foto2Mime, foto2Name, urlFoto2,
      foto3Base64, foto3Mime, foto3Name, urlFoto3,
      id, isSynced,
      ...exportableData
    } = record as any;

    return exportableData;
  });

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Registros');

  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
  
  XLSX.writeFile(workbook, `${fileNamePrefix}_${dateStr}_${timeStr}.xlsx`);
};
