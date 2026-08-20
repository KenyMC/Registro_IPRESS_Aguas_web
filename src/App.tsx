import { Routes, Route } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Header } from './components/Header';
import { SplashScreen } from './components/SplashScreen';
import { Home } from './pages/Home';
import { Diagnostico } from './pages/Diagnostico';
import { Monitoreo } from './pages/Monitoreo';
import { DiagnosticoList } from './pages/DiagnosticoList';
import { MonitoreoList } from './pages/MonitoreoList';
import { fetchAndCacheIpressList } from './services/ipressData';
import { syncPendingRecords } from './services/storage';

function App() {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    fetchAndCacheIpressList();
    
    const handleOnline = () => {
      syncPendingRecords();
    };

    window.addEventListener('online', handleOnline);
    // Also try syncing on app load if online
    if (navigator.onLine) {
      syncPendingRecords();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  return (
    <>
      {showSplash && <SplashScreen onFinish={() => setShowSplash(false)} />}
      <Header />
      <main style={{ flex: 1, padding: '2rem 0' }}>
        <Routes>
          <Route path="/" element={<Home />} />
          
          <Route path="/diagnostico" element={<DiagnosticoList />} />
          <Route path="/diagnostico/nuevo" element={<Diagnostico />} />
          <Route path="/diagnostico/editar/:id" element={<Diagnostico />} />
          
          <Route path="/monitoreo" element={<MonitoreoList />} />
          <Route path="/monitoreo/nuevo" element={<Monitoreo />} />
          <Route path="/monitoreo/editar/:id" element={<Monitoreo />} />
        </Routes>
      </main>
      <footer style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border)' }}>
        <p>&copy; PVCACH Cusco {new Date().getFullYear()} - Todos los derechos reservados.</p>
        <p className="signature-text">
          Design by Keny Orlando MC
        </p>
      </footer>
    </>
  );
}

export default App;
