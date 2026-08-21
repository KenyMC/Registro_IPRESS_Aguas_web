import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Header } from './components/Header';
import { SplashScreen } from './components/SplashScreen';
import { Login } from './pages/Login';
import { Diagnostico } from './pages/Diagnostico';
import { Monitoreo } from './pages/Monitoreo';
import { DiagnosticoList } from './pages/DiagnosticoList';
import { MonitoreoList } from './pages/MonitoreoList';
import { UserAdmin } from './pages/UserAdmin';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { fetchAndCacheIpressList } from './services/ipressData';
import { syncPendingRecords } from './services/storage';

const SplashManager = ({ children }: { children: React.ReactNode }) => {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    fetchAndCacheIpressList();
    
    const handleOnline = () => {
      syncPendingRecords();
    };

    window.addEventListener('online', handleOnline);
    if (navigator.onLine) {
      syncPendingRecords();
    }

    const timer = setTimeout(() => setShowSplash(false), 2000);
    return () => {
      window.removeEventListener('online', handleOnline);
      clearTimeout(timer);
    };
  }, []);

  return showSplash ? <SplashScreen onFinish={() => {}} /> : <>{children}</>;
};

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading } = useAuth();
  if (isLoading) return <SplashScreen onFinish={() => {}} />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const ProtectedAdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading } = useAuth();
  if (isLoading) return <SplashScreen onFinish={() => {}} />;
  if (!user || user.rol !== 'Administra todas las Redes') return <Navigate to="/" replace />;
  return <>{children}</>;
};

const MainLayout = ({ children }: { children: React.ReactNode }) => (
  <>
    <Header />
    <main style={{ flex: 1, padding: '2rem 0' }}>
      {children}
    </main>
    <footer style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border)' }}>
      <p>&copy; PVCACH Cusco {new Date().getFullYear()} - Todos los derechos reservados.</p>
      <p className="signature-text">
        Design by Keny Orlando MC
      </p>
    </footer>
  </>
);

function App() {
  return (
    <AuthProvider>
      <SplashManager>
          <Routes>
            <Route path="/login" element={<Login />} />
            
            <Route path="/" element={
              <ProtectedRoute><MainLayout><DiagnosticoList /></MainLayout></ProtectedRoute>
            } />
            <Route path="/diagnostico" element={
              <ProtectedRoute><MainLayout><DiagnosticoList /></MainLayout></ProtectedRoute>
            } />
            <Route path="/diagnostico/nuevo" element={
              <ProtectedRoute><MainLayout><Diagnostico /></MainLayout></ProtectedRoute>
            } />
            <Route path="/diagnostico/editar/:id" element={
              <ProtectedRoute><MainLayout><Diagnostico /></MainLayout></ProtectedRoute>
            } />
            
            <Route path="/monitoreo" element={
              <ProtectedRoute><MainLayout><MonitoreoList /></MainLayout></ProtectedRoute>
            } />
            <Route path="/monitoreo/nuevo" element={
              <ProtectedRoute><MainLayout><Monitoreo /></MainLayout></ProtectedRoute>
            } />
            <Route path="/monitoreo/editar/:id" element={
              <ProtectedRoute><MainLayout><Monitoreo /></MainLayout></ProtectedRoute>
            } />

            <Route path="/admin-usuarios" element={
              <ProtectedAdminRoute><MainLayout><UserAdmin /></MainLayout></ProtectedAdminRoute>
            } />
          </Routes>
      </SplashManager>
    </AuthProvider>
  );
}

export default App;
