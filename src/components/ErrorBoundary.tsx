import { Component, ErrorInfo, ReactNode } from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary detectó un error:", error, errorInfo);

    // Intento de auto-recuperación silenciosa una sola vez por sesión
    const hasRecovered = sessionStorage.getItem('pwa_auto_recovered');
    if (!hasRecovered) {
      sessionStorage.setItem('pwa_auto_recovered', 'true');
      this.handleForceUpdate();
    }
  }

  private handleForceUpdate = () => {
    // 1. Limpiar caches de la PWA
    if ('caches' in window) {
      caches.keys().then((names) => {
        names.forEach((name) => caches.delete(name));
      });
    }

    // 2. Desregistrar Service Workers antiguos
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((reg) => reg.unregister());
      });
    }

    // 3. Forzar recarga con parámetro de timestamp anti-caché
    setTimeout(() => {
      const cleanUrl = window.location.origin + window.location.pathname + '?v=' + Date.now() + window.location.hash;
      window.location.href = cleanUrl;
    }, 400);
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem',
          backgroundColor: '#f8fafc',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
          <div style={{
            maxWidth: '440px',
            width: '100%',
            backgroundColor: '#ffffff',
            padding: '2rem',
            borderRadius: '16px',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
            textAlign: 'center'
          }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: '#fee2e2',
              color: '#ef4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.25rem auto'
            }}>
              <AlertTriangle size={28} />
            </div>

            <h2 style={{ color: '#0f172a', margin: '0 0 0.5rem 0', fontSize: '1.35rem' }}>
              Actualización Necesaria
            </h2>

            <p style={{ color: '#64748b', fontSize: '0.9rem', lineHeight: '1.5', margin: '0 0 1.5rem 0' }}>
              Tu dispositivo tiene archivos guardados de una versión anterior. Presiona el botón para limpiar la memoria caché y cargar la versión más reciente del sistema.
            </p>

            <button
              onClick={this.handleForceUpdate}
              style={{
                width: '100%',
                padding: '0.85rem 1.25rem',
                backgroundColor: '#2563eb',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '0.95rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.2)'
              }}
            >
              <RefreshCw size={18} /> Limpiar Caché y Actualizar
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
