import { Link, NavLink } from 'react-router-dom';
import { Droplet, Droplets, ClipboardList, Activity } from 'lucide-react';

export const Header = () => {
  return (
    <header className="header">
      <div className="header-content">
        <Link to="/" className="logo">
          <Droplets className="logo-icon" size={28} />
          <span>Calidad del Agua IPRESS</span>
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
