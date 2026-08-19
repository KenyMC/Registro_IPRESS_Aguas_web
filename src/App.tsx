import { Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import { Header } from './components/Header';
import { Home } from './pages/Home';
import { Diagnostico } from './pages/Diagnostico';
import { Monitoreo } from './pages/Monitoreo';
import { DiagnosticoList } from './pages/DiagnosticoList';
import { MonitoreoList } from './pages/MonitoreoList';
import { fetchAndCacheIpressList } from './services/ipressData';

function App() {
  useEffect(() => {
    fetchAndCacheIpressList();
  }, []);

  return (
    <>
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
        <p>&copy; {new Date().getFullYear()} Calidad del Agua IPRESS. Todos los derechos reservados.</p>
      </footer>
    </>
  );
}

export default App;
