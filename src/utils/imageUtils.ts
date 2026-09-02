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
 * Convierte una URL a Base64 evadiendo bloqueos de CORS.
 * Utiliza la técnica de previsualización (lh3.googleusercontent.com) dibujando en un canvas.
 */
export const urlToBase64 = (url: string): Promise<string> => {
  return new Promise((resolve) => {
    if (!url) {
      resolve('');
      return;
    }
    
    // Si la url ya es base64, retornarla directamente
    if (url.startsWith('data:image')) {
      resolve(url);
      return;
    }

    const getDriveId = (u: string) => {
      const match = u.match(/id=([^&]+)/);
      return match ? match[1] : null;
    };

    const driveId = getDriveId(url);
    // Usar el mismo truco de previsualización que en el formulario
    const previewUrl = driveId ? `https://lh3.googleusercontent.com/d/${driveId}` : url;

    const img = new Image();
    // NOTA: Para poder hacer toDataURL sin error de "tainted canvas", necesitamos crossOrigin
    img.crossOrigin = 'Anonymous'; 
    
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const dataURL = canvas.toDataURL('image/jpeg', 0.8);
          resolve(dataURL);
        } else {
          resolve('');
        }
      } catch (err) {
        console.warn('Error de CORS en canvas (Taint). Intentando fallback con Fetch proxy...', err);
        fallbackFetch(previewUrl, driveId, resolve);
      }
    };

    img.onerror = () => {
      console.warn('Error cargando imagen con crossOrigin. Intentando fallback con Fetch proxy...', previewUrl);
      fallbackFetch(previewUrl, driveId, resolve);
    };

    img.src = previewUrl;
  });
};

const fallbackFetch = async (originalUrl: string, driveId: string | null, resolve: (val: string) => void) => {
  try {
    if (driveId) {
      // Fallback 1: Thumbnail API
      const thumbUrl = `https://drive.google.com/thumbnail?id=${driveId}&sz=w800`;
      const response = await fetch(thumbUrl);
      if (response.ok) {
        const blob = await response.blob();
        resolve(await blobToBase64(blob));
        return;
      }
    }

    // Fallback 2: allorigins Proxy (más confiable que corsproxy.io a veces)
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(originalUrl)}`;
    const response = await fetch(proxyUrl);
    if (response.ok) {
      const blob = await response.blob();
      resolve(await blobToBase64(blob));
      return;
    }
    
    resolve(''); // Falla silenciosa para no romper el PDF
  } catch (error) {
    console.error('Fallbacks de imagen fallaron:', error);
    resolve('');
  }
};
