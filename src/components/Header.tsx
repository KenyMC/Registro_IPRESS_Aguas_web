import { useState, useEffect } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Droplet, Droplets, ClipboardList } from 'lucide-react';

export const Header = () => {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className={`header ${isScrolled ? 'scrolled' : ''}`}>
      <div className="header-content">
        <div className="header-logos">
          <div className="logo-circle">
            <img src="./logo-cusco.jpg" alt="Logo 1" className="logo-img-cusco" />
          </div>
          <div className="logo-circle">
            <img src="./logo-diresa.png" alt="Logo DIRESA" className="logo-img-diresa" />
          </div>
        </div>
        <Link to="/" className="logo">
          <Droplets className="logo-icon" size={28} />
          <span>Calidad del Agua IPRESS</span>
        </Link>
        <div className="header-nav-wrapper">
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
        </div>
      </div>
    </header>
  );
};
