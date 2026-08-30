import { useState, useEffect, useRef } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Droplet, Droplets, ClipboardList, UserCircle, LogOut, Users, Menu, X, Home } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export const Header = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const menuRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleClickOutsideMobile = (event: MouseEvent) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        setIsMobileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutsideMobile);
    return () => document.removeEventListener('mousedown', handleClickOutsideMobile);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className={`header ${isScrolled ? 'scrolled' : ''}`}>
      <div className="header-content">
        <div className="header-left-group">
          <div className="header-logos">
            <div className="logo-circle">
              <img src="./logo-cusco.jpg" alt="Logo 1" className="logo-img-cusco" />
            </div>
            <div className="logo-circle">
              <img src="./logo-diresa.png" alt="Logo DIRESA" className="logo-img-diresa" />
            </div>
            <div className="logo-circle">
              <img src="./logo-pvcach.png" alt="Logo PVCACH" className="logo-img-pvcach" />
            </div>
          </div>
          <Link to="/" className="logo">
            <Droplets className="logo-icon" size={28} />
            <span>Calidad del Agua IPRESS</span>
          </Link>
        </div>
        
        {user && (
          <button 
            className="mobile-menu-btn logo-circle" 
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X size={24} color="var(--primary)" /> : <Menu size={24} color="var(--primary)" />}
          </button>
        )}

        <div className="header-nav-wrapper desktop-only" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <nav className="header-nav">
            <NavLink 
              to="/diagnostico" 
              className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}
            >
              <ClipboardList size={18} className="nav-icon" />
              <span>Diagnóstico</span>
            </NavLink>
            <NavLink 
              to="/monitoreo" 
              className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}
            >
              <Droplet size={18} className="nav-icon" />
              <span>Monitoreo</span>
            </NavLink>
          </nav>

          {user && (
            <div className="user-profile-menu" ref={menuRef} style={{ position: 'relative' }}>
              <button 
                className="btn btn-secondary btn-sm" 
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderRadius: '20px' }}
                onClick={() => setIsMenuOpen(!isMenuOpen)}
              >
                <UserCircle size={18} />
                <span className="user-profile-name" style={{ fontWeight: 600 }}>{user.usuario}</span>
              </button>

              {isMenuOpen && (
                <div className="profile-dropdown glass-panel animate-fade-in" style={{ position: 'absolute', top: '100%', right: '0', marginTop: '0.5rem', padding: '0.5rem', minWidth: '200px', zIndex: 100, display: 'flex', flexDirection: 'column', gap: '0.25rem', color: 'var(--text-main)' }}>
                  <div style={{ padding: '0.5rem', borderBottom: '1px solid var(--border)', marginBottom: '0.25rem' }}>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>Rol:</p>
                    <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600 }}>{user.rol}</p>
                  </div>
                  
                  {user.rol === 'Administra todas las Redes' && (
                    <Link to="/admin-usuarios" className="btn btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'flex-start', background: 'transparent', color: 'var(--text-main)' }} onClick={() => setIsMenuOpen(false)}>
                      <Users size={16} /> Administrar Usuarios
                    </Link>
                  )}
                  
                  <button onClick={handleLogout} className="btn btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'flex-start', color: 'var(--danger)', background: 'transparent' }}>
                    <LogOut size={16} /> Cerrar Sesión
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* MOBILE MENU DROPDOWN */}
      {user && (
        <div 
          className={`mobile-menu-container ${isMobileMenuOpen ? 'open' : ''}`}
          ref={mobileMenuRef}
        >
          <div className="mobile-menu-header" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', borderBottom: '1px solid var(--border)', backgroundColor: '#f8fafc' }}>
            <UserCircle size={32} color="var(--primary)" />
            <div>
              <p style={{ margin: 0, fontWeight: 600, fontSize: '1rem', color: 'var(--text-main)' }}>{user.usuario}</p>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>{user.rol}</p>
            </div>
          </div>
          
          <nav className="mobile-nav-links" style={{ display: 'flex', flexDirection: 'column', padding: '0.5rem' }}>
            <NavLink to="/" className={({ isActive }) => isActive ? "mobile-nav-link active" : "mobile-nav-link"} onClick={() => setIsMobileMenuOpen(false)}>
              <Home size={20} /> Inicio
            </NavLink>
            <NavLink to="/diagnostico" className={({ isActive }) => isActive ? "mobile-nav-link active" : "mobile-nav-link"} onClick={() => setIsMobileMenuOpen(false)}>
              <ClipboardList size={20} /> Diagnóstico
            </NavLink>
            <NavLink to="/monitoreo" className={({ isActive }) => isActive ? "mobile-nav-link active" : "mobile-nav-link"} onClick={() => setIsMobileMenuOpen(false)}>
              <Droplet size={20} /> Monitoreo
            </NavLink>
            
            {user.rol === 'Administra todas las Redes' && (
              <NavLink to="/admin-usuarios" className={({ isActive }) => isActive ? "mobile-nav-link active" : "mobile-nav-link"} onClick={() => setIsMobileMenuOpen(false)}>
                <Users size={20} /> Administrar Usuarios
              </NavLink>
            )}
            
            <button className="mobile-nav-link logout-btn" onClick={() => { handleLogout(); setIsMobileMenuOpen(false); }}>
              <LogOut size={20} /> Cerrar Sesión
            </button>
          </nav>
        </div>
      )}
    </header>
  );
};
