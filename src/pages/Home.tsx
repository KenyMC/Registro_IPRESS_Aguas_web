import { Link } from 'react-router-dom';
import { ClipboardList, Droplet, Building2, FileText, BarChart3 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getRecords } from '../services/storage';
import { useAuth } from '../contexts/AuthContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export const Home: React.FC = () => {
  const [stats, setStats] = useState({
    totalDiagnosticos: 0,
    totalMonitoreos: 0,
    establecimientosUnicos: 0,
  });

  const [chartData, setChartData] = useState<{ date: string; Diagnósticos: number; Monitoreos: number }[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    const loadData = () => {
      if (!user) return;
      
      let records = getRecords().filter(r => r.estado !== 'Inactivo');
      
      // Filtro por Rol (RBAC)
      if (user.rol !== 'Administra todas las Redes') {
        if (user.rol.includes('Red')) {
          records = records.filter(r => r.unidadEjecutora === user.red);
        } else if (user.rol === 'IPRESS' || user.rol === 'Hospital') {
          records = records.filter(r => 
            (user.codigoRenipress && String(r.codigoRenipress).trim() === String(user.codigoRenipress).trim()) ||
            (String(r.nombreIpress).trim().toLowerCase() === String(user.usuario).trim().toLowerCase())
          );
        }
      }
      
      const diagnosticos = records.filter(r => r.tipo === 'diagnostico');
      const monitoreos = records.filter(r => r.tipo === 'monitoreo');
      
      // Contar establecimientos únicos (por nombre de IPRESS)
      const ipressSet = new Set();
      diagnosticos.forEach(d => {
        if (d.nombreIpress) ipressSet.add(d.nombreIpress);
      });
      monitoreos.forEach(m => {
        if (m.nombreIpress) ipressSet.add(m.nombreIpress);
      });

      setStats({
        totalDiagnosticos: diagnosticos.length,
        totalMonitoreos: monitoreos.length,
        establecimientosUnicos: ipressSet.size,
      });

      // Preparar datos para el gráfico (agrupados por fecha)
      const dateGroups: Record<string, { date: string, Diagnósticos: number, Monitoreos: number }> = {};
      
      records.forEach(r => {
        if (!r.fechaRegistro) return;
        
        // Parse date safely
        const dateObj = new Date(r.fechaRegistro);
        if (isNaN(dateObj.getTime())) return; // Skip if invalid date format
        
        // Usar solo la fecha (YYYY-MM-DD)
        const dateStr = dateObj.toISOString().split('T')[0];
        
        if (!dateGroups[dateStr]) {
          dateGroups[dateStr] = { date: dateStr, Diagnósticos: 0, Monitoreos: 0 };
        }
        
        if (r.tipo === 'diagnostico') {
          dateGroups[dateStr].Diagnósticos++;
        } else if (r.tipo === 'monitoreo') {
          dateGroups[dateStr].Monitoreos++;
        }
      });

      // Convertir a array y ordenar por fecha
      const sortedData = Object.values(dateGroups).sort((a, b) => a.date.localeCompare(b.date));
      // Mostrar solo los últimos 7 días con datos
      setChartData(sortedData.slice(-7));
    };

    loadData();

    window.addEventListener('recordsUpdated', loadData);
    return () => window.removeEventListener('recordsUpdated', loadData);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  return (
    <div className="container animate-fade-in">
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h1 style={{ color: 'var(--primary)', marginBottom: '0.5rem' }}>Sistema de Control IPRESS</h1>
        <p style={{ color: 'var(--text-muted)' }}>Dashboard y Resumen de Operaciones</p>
      </div>

      {/* DASHBOARD STATS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '1rem', backgroundColor: 'rgba(37, 99, 235, 0.1)', borderRadius: '12px', color: 'var(--primary)' }}>
            <Building2 size={24} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)' }}>Establecimientos</p>
            <h3 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--primary-dark)' }}>{stats.establecimientosUnicos}</h3>
          </div>
        </div>
        
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '1rem', backgroundColor: 'rgba(16, 185, 129, 0.1)', borderRadius: '12px', color: '#10b981' }}>
            <FileText size={24} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)' }}>Diagnósticos</p>
            <h3 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--primary-dark)' }}>{stats.totalDiagnosticos}</h3>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '1rem', backgroundColor: 'rgba(245, 158, 11, 0.1)', borderRadius: '12px', color: '#f59e0b' }}>
            <Droplet size={24} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)' }}>Monitoreos</p>
            <h3 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--primary-dark)' }}>{stats.totalMonitoreos}</h3>
          </div>
        </div>
      </div>

      {/* DASHBOARD CHART */}
      <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '3rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
          <BarChart3 size={20} color="var(--primary)" />
          <h3 style={{ margin: 0, color: 'var(--primary-dark)' }}>Actividad Reciente</h3>
        </div>
        
        <div style={{ height: '300px', width: '100%' }}>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  cursor={{ fill: '#f1f5f9' }}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '10px' }} />
                <Bar dataKey="Diagnósticos" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={50} />
                <Bar dataKey="Monitoreos" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={50} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              No hay datos suficientes para mostrar el gráfico.
            </div>
          )}
        </div>
      </div>

      {/* ACTION BUTTONS */}
      <h3 style={{ textAlign: 'center', color: 'var(--primary-dark)', marginBottom: '1.5rem' }}>Operaciones</h3>
      <div className="card-grid">
        <Link to="/diagnostico" className="glass-panel action-card">
          <div className="icon-wrapper">
            <ClipboardList size={32} />
          </div>
          <h3>Registro de Diagnóstico</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Registrar nueva información de diagnóstico de IPRESS, incluyendo datos geográficos y evaluación del sistema de agua.
          </p>
        </Link>

        <Link to="/monitoreo" className="glass-panel action-card">
          <div className="icon-wrapper">
            <Droplet size={32} />
          </div>
          <h3>Registro de Monitoreo</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Registrar nuevos datos técnicos de monitoreo como cloro, pH, temperatura y turbiedad.
          </p>
        </Link>
      </div>
    </div>
  );
};
