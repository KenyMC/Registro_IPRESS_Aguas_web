import { useState } from 'react';
import { pdf } from '@react-pdf/renderer';
import { LocalRecord } from '../services/storage';
import { urlToBase64 } from './imageUtils';
import { ReporteDocument } from '../components/pdf/ReportePDF';

export const usePdfDownloader = () => {
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const downloadPdf = async (record: LocalRecord) => {
    try {
      setDownloadingId(record.id);

      // Pre-cargar imágenes y convertirlas a Base64
      const images = {
        foto1: record.foto1Base64 
          ? `data:${record.foto1Mime || 'image/jpeg'};base64,${record.foto1Base64}` 
          : await urlToBase64(record.urlFoto1 || ''),
        foto2: record.foto2Base64 
          ? `data:${record.foto2Mime || 'image/jpeg'};base64,${record.foto2Base64}` 
          : await urlToBase64(record.urlFoto2 || ''),
        foto3: record.foto3Base64 
          ? `data:${record.foto3Mime || 'image/jpeg'};base64,${record.foto3Base64}` 
          : await urlToBase64(record.urlFoto3 || ''),
        firma: record.firma 
          ? `data:${record.firmaMime || 'image/png'};base64,${record.firma}` 
          : await urlToBase64(record.urlFirma || '', true)
      };

      // Instanciar el documento
      const doc = <ReporteDocument record={record} images={images} />;
      
      // Renderizar a Blob
      const asPdf = pdf(doc);
      const blob = await asPdf.toBlob();
      
      // Descargar
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Reporte_${record.tipo}_${record.nombreIpress || 'Generado'}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

    } catch (error) {
      console.error('Error al generar PDF:', error);
      alert('Hubo un error al generar el PDF. Por favor, intente de nuevo.');
    } finally {
      setDownloadingId(null);
    }
  };

  return { downloadPdf, downloadingId };
};
