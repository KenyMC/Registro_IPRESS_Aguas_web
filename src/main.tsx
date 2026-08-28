import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'

import App from './App.tsx'
import './index.css'
/**
 * SISTEMA DE CONTROL DE VERSIONES PWA Y FORZADO DE CACHÉ
 * -----------------------------------------------------
 * Esta constante `APP_VERSION` es fundamental para el ciclo de vida de la aplicación.
 * Debido a la agresiva política de caché de las aplicaciones PWA offline-first, los
 * usuarios pueden quedarse estancados en versiones antiguas del código y estado.
 * 
 * ¿Cómo forzar una actualización general?
 * Solo necesitas incrementar este número (ej. '1.1.1'). Cuando el Service Worker descargue 
 * silenciosamente el nuevo código y el usuario entre, este bloque detectará que su
 * `localStorage` tiene la versión antigua. 
 * Automáticamente purgará todo (borrando sesiones antiguas, registros cacheados corruptos)
 * y recargará la página en un estado completamente limpio.
 */
const APP_VERSION = '1.1.0';
const localVersion = localStorage.getItem('APP_VERSION');

if (localVersion !== APP_VERSION) {
  // Si la versión no coincide, limpiamos todo el almacenamiento (cierra sesión, borra datos antiguos)
  localStorage.clear();
  localStorage.setItem('APP_VERSION', APP_VERSION);
  // Recargar la página limpia
  window.location.reload();
}

// When using registerType: 'autoUpdate', the service worker updates automatically.
// We just need to listen for the controller change to force a page reload
// so the user immediately sees the newest version.
if ('serviceWorker' in navigator) {
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      refreshing = true;
      window.location.reload();
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
)
