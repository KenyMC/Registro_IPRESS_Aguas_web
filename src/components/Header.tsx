import { Link, NavLink } from 'react-router-dom';
import { Droplet, Droplets, ClipboardList } from 'lucide-react';

export const Header = () => {
  return (
    <header className="header">
      <div className="header-content">
        <Link to="/" className="logo" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ3KU-5YMhb1Ee8FfD3Dd2bYTU3mecNLtGAaaAm1VhSdg&s" alt="Logo 1" style={{ height: '40px', objectFit: 'contain' }} />
          <img src="https://diresacusco.gob.pe/img/logo.png" alt="Logo DIRESA" style={{ height: '40px', objectFit: 'contain' }} />
          <span style={{ marginLeft: '4px' }}>Calidad del Agua IPRESS</span>
        </Link>
        <nav className="header-nav">
          <NavLink 
            to="/diagnostico" 
            className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}
          >
            <ClipboardList size={20} className="nav-icon" />
            <span>Diagnóstico</span>
          </NavLink>
          <NavLink 
            to="/monitoreo" 
            className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}
          >
            <Droplet size={20} className="nav-icon" />
            <span>Monitoreo</span>
          </NavLink>
        </nav>
      </div>
    </header>
  );
};
