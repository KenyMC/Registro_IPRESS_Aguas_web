/**
 * Utilidades para manejo de imágenes y conversión a Base64
 */

export const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      resolve(reader.result as string);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

/**
 * Convierte una URL a Base64 usando ÚNICAMENTE la API de Miniaturas de Google Drive.
 * Es extremadamente rápido y no requiere canvas ni proxies lentos.
 */
export const urlToBase64 = async (url: string): Promise<string> => {
  if (!url) return '';
  if (url.startsWith('data:image')) return url;

  const match = url.match(/id=([^&]+)/);
  const driveId = match ? match[1] : null;

  try {
    let targetUrl = url;
    if (driveId) {
      // Usar Thumbnail API que es rápido y soporta CORS
      targetUrl = `https://drive.google.com/thumbnail?id=${driveId}&sz=w800`;
    }
    
    const response = await fetch(targetUrl);
    if (response.ok) {
      const blob = await response.blob();
      return await blobToBase64(blob);
    }
    return ''; // Falla silenciosa si no se puede descargar
  } catch (error) {
    console.error('Error al descargar la imagen para el PDF:', error);
    return '';
  }
};
