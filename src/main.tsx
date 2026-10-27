import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'

import App from './App.tsx'
import './index.css'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'

/**
 * SISTEMA DE CONTROL DE VERSIONES PWA Y FORZADO DE CACHÉ
 */
const APP_VERSION = '1.4.7';
const localVersion = localStorage.getItem('APP_VERSION');

if (localVersion !== APP_VERSION) {
  // Conservar únicamente registros pendientes válidos (filtrar cualquier registro en blanco o fantasma)
  const rawRecords = localStorage.getItem('aguas_ipress_records');
  let cleanPendingRecords: any[] = [];
  if (rawRecords) {
    try {
      const parsed = JSON.parse(rawRecords);
      cleanPendingRecords = (parsed || []).filter((r: any) => 
        r && 
        !r.isSynced && 
        ((r.nombreIpress && String(r.nombreIpress).trim() !== '') || 
         (r.codigoRenipress && String(r.codigoRenipress).trim() !== ''))
      );
    } catch (e) {}
  }
  localStorage.clear();
  if (cleanPendingRecords.length > 0) {
    localStorage.setItem('aguas_ipress_records', JSON.stringify(cleanPendingRecords));
  }
  localStorage.setItem('APP_VERSION', APP_VERSION);
  localStorage.setItem('app_version', APP_VERSION);

  // Limpiar todas las cachés del navegador
  if ('caches' in window) {
    caches.keys().then((names) => {
      names.forEach((name) => caches.delete(name));
    });
  }

  // Desregistrar Service Workers anteriores
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then((regs) => {
      regs.forEach((r) => r.unregister());
    });
  }

  // Recargar en estado limpio
  window.location.reload();
}

// Escuchar cambios de Service Worker y forzar verificación inmediata
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((regs) => {
    regs.forEach((r) => r.update());
  });

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
    <ErrorBoundary>
      <HashRouter>
        <App />
      </HashRouter>
    </ErrorBoundary>
  </StrictMode>,
)
