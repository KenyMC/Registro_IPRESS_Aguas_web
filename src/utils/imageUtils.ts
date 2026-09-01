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
 * Convierte una URL a Base64 evadiendo bloqueos de CORS mediante fallbacks sucesivos.
 */
export const urlToBase64 = async (url: string): Promise<string> => {
  if (!url) return '';
  
  // Si la url ya es base64, retornarla directamente
  if (url.startsWith('data:image')) {
    return url;
  }

  const getDriveId = (u: string) => {
    const match = u.match(/id=([^&]+)/);
    return match ? match[1] : null;
  };

  try {
    // Intento 1: Fetch directo (si el servidor lo permite)
    const response = await fetch(url, { mode: 'cors' });
    if (!response.ok) throw new Error('Fetch directo falló');
    const blob = await response.blob();
    return await blobToBase64(blob);
  } catch (error) {
    console.warn('Fetch directo falló (posible CORS). Intentando fallbacks para PDF...', url);
    
    const driveId = getDriveId(url);

    try {
      if (driveId) {
        // Intento 2: Google Drive Thumbnail API (suele no requerir CORS estricto si es público)
        const thumbUrl = `https://drive.google.com/thumbnail?id=${driveId}&sz=w800`;
        const responseThumb = await fetch(thumbUrl, { mode: 'cors' });
        if (responseThumb.ok) {
            const blob = await responseThumb.blob();
            return await blobToBase64(blob);
        }
      }

      // Intento 3: Usar un proxy CORS público como último recurso
      const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
      const proxyResponse = await fetch(proxyUrl);
      if (!proxyResponse.ok) throw new Error('Proxy falló');
      const blob = await proxyResponse.blob();
      return await blobToBase64(blob);
      
    } catch (fallbackError) {
      console.error('Todos los intentos de obtener la imagen fallaron.', fallbackError);
      // Retornar un string vacío, el PDF simplemente no mostrará esta imagen,
      // pero no crasheará la generación completa.
      return '';
    }
  }
};
