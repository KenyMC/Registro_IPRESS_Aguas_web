import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LogIn, User as UserIcon, Lock } from 'lucide-react';

export const Login = () => {
  const [usuario, setUsuario] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      const result = await login(usuario, contrasena);
      if (result.success) {
        navigate('/');
      } else {
        setErrorMsg(result.message || 'Error de autenticación');
      }
    } catch {
      setErrorMsg('Error al intentar iniciar sesión.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-glass-card animate-fade-in">
        
        <div className="login-logos" style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '2rem' }}>
          <div className="logo-circle"><img src="./logo-cusco.jpg" alt="Gobierno Regional Cusco" className="logo-img-cusco" /></div>
          <div className="logo-circle"><img src="./logo-diresa.png" alt="DIRESA Cusco" className="logo-img-diresa" /></div>
          <div className="logo-circle"><img src="./logo-pvcach.png" alt="PVCACH" className="logo-img-pvcach" /></div>
        </div>

        <h1 className="login-title elegant-title" style={{ fontSize: '1.8rem', marginBottom: '0.5rem' }}>Vigilancia de la Calidad del Agua - IPRESS</h1>
        <p className="login-subtitle">Ingresa tus credenciales para continuar</p>

        {errorMsg && (
          <div className="login-error-alert animate-fade-in">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group" style={{ position: 'relative' }}>
            <UserIcon size={20} className="login-input-icon" />
            <input 
              type="text" 
              required 
              placeholder="Usuario" 
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              className="login-input"
            />
          </div>

          <div className="form-group" style={{ position: 'relative', marginTop: '1.5rem' }}>
            <Lock size={20} className="login-input-icon" />
            <input 
              type="password" 
              required 
              placeholder="Contraseña" 
              value={contrasena}
              onChange={(e) => setContrasena(e.target.value)}
              className="login-input"
            />
          </div>

          <button 
            type="submit" 
            className="login-button" 
            disabled={loading}
            style={{ marginTop: '2.5rem' }}
          >
            {loading ? 'Verificando...' : (
              <>
                Iniciar Sesión <LogIn size={20} />
              </>
            )}
          </button>
        </form>
        
        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
          <p className="signature-text" style={{ fontSize: '1.5rem' }}>
            Versión 1.3.0 - PVCACH Cusco
          </p>
        </div>
      </div>
    </div>
  );
};
