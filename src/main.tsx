import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'

import App from './App.tsx'
import './index.css'
// Control de versiones para forzar cierre de sesión y limpieza de caché a todos los usuarios
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
