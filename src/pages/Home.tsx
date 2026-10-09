import { Link } from 'react-router-dom';
import { ClipboardList, Droplet, Building2, FileText, BarChart3 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getRecords } from '../services/storage';
import { useAuth } from '../contexts/AuthContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';

export const Home: React.FC = () => {
  const [stats, setStats] = useState({
    totalDiagnosticos: 0,
    totalMonitoreos: 0,
    establecimientosUnicos: 0,
  });

  const [chartData, setChartData] = useState<{ date: string; Diagnósticos: number; Monitoreos: number }[]>([]);
  
  // GERESA advanced stats
  const [geresaStats, setGeresaStats] = useState({
    totalIpress: 0,
    monitoreoSemanal: 0,
    faltanDiagnostico: 0,
    ipressPorRed: [] as { red: string; cantidad: number }[],
    coberturaData: [] as { name: string; value: number }[]
  });

  const { user, usersList } = useAuth();

  useEffect(() => {
    const loadData = () => {
      if (!user) return;
      
      let records = getRecords().filter(r => r.estado !== 'Inactivo');
      
      // Filtro por Rol (RBAC)
      if (user.rol !== 'Administra todas las Redes') {
        if (user.rol.includes('Red')) {
          records = records.filter(r => r.unidadEjecutora === user.red);
        } else if (user.rol === 'IPRESS' || user.rol === 'Hospital') {
          records = records.filter(r => {
            if (!user.codigoRenipress) return String(r.nombreIpress).trim().toLowerCase() === String(user.usuario).trim().toLowerCase();
            
            const uCode = String(user.codigoRenipress).trim();
            const rCode = String(r.codigoRenipress || '').trim();
            
            return uCode === rCode || 
                   (uCode !== '' && rCode !== '' && !isNaN(Number(uCode)) && !isNaN(Number(rCode)) && Number(uCode) === Number(rCode)) ||
                   (String(r.nombreIpress).trim().toLowerCase() === String(user.usuario).trim().toLowerCase());
          });
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
      setChartData(sortedData.slice(-7));

      // -------------------------------------------------------------
      // CÁLCULOS AVANZADOS PARA GERESA
      // -------------------------------------------------------------
      if (user.rol === 'Administra todas las Redes' && usersList && usersList.length > 0) {
        // 1. Filtrar solo los usuarios que son IPRESS u Hospital
        const allIpress = usersList.filter(u => u.rol === 'IPRESS' || u.rol === 'Hospital');
        const totalIpressCount = allIpress.length;

        // 2. IPRESS por Red
        const redCounts: Record<string, number> = {};
        allIpress.forEach(u => {
          const redName = u.red || 'Sin Red';
          redCounts[redName] = (redCounts[redName] || 0) + 1;
        });
        const ipressPorRedArr = Object.keys(redCounts)
          .map(red => ({ red, cantidad: redCounts[red] }))
          .sort((a, b) => b.cantidad - a.cantidad);

        // 3. Monitoreo Semanal (IPRESS únicas que enviaron monitoreo en últimos 7 días)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        const ipressConMonitoreoSemanal = new Set();
        monitoreos.forEach(m => {
          if (!m.fechaRegistro) return;
          const mDate = new Date(m.fechaRegistro);
          if (mDate >= sevenDaysAgo && m.codigoRenipress) {
            ipressConMonitoreoSemanal.add(String(m.codigoRenipress).trim());
          }
        });

        // 4. Falta Diagnóstico
        const ipressConDiagnostico = new Set();
        diagnosticos.forEach(d => {
          if (d.codigoRenipress) {
            ipressConDiagnostico.add(String(d.codigoRenipress).trim());
          }
        });
        
        // Some IPRESS in records might not be in usersList (rare, but possible), so we calculate mathematically:
        let conDiag = 0;
        allIpress.forEach(u => {
          if (ipressConDiagnostico.has(String(u.codigoRenipress).trim())) {
            conDiag++;
          }
        });
        const faltanDiag = totalIpressCount - conDiag;

        setGeresaStats({
          totalIpress: totalIpressCount,
          monitoreoSemanal: ipressConMonitoreoSemanal.size,
          faltanDiagnostico: faltanDiag,
          ipressPorRed: ipressPorRedArr,
          coberturaData: [
            { name: 'Con Diagnóstico', value: conDiag },
            { name: 'Falta Diagnóstico', value: faltanDiag }
          ]
        });
      }
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

      {/* GERESA ADVANCED DASHBOARD */}
      {user?.rol === 'Administra todas las Redes' && (
        <div style={{ marginBottom: '3rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <BarChart3 size={20} color="var(--primary)" />
            <h3 style={{ margin: 0, color: 'var(--primary-dark)' }}>Estadísticas de Gestión (GERESA)</h3>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
            <div className="glass-panel" style={{ padding: '1.5rem', borderLeft: '4px solid var(--primary)' }}>
              <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)' }}>Total IPRESS Registradas</p>
              <h3 style={{ margin: '0.5rem 0 0 0', fontSize: '1.8rem', color: 'var(--primary-dark)' }}>{geresaStats.totalIpress}</h3>
            </div>
            <div className="glass-panel" style={{ padding: '1.5rem', borderLeft: '4px solid #10b981' }}>
              <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)' }}>Monitoreos (Últimos 7 días)</p>
              <h3 style={{ margin: '0.5rem 0 0 0', fontSize: '1.8rem', color: '#10b981' }}>{geresaStats.monitoreoSemanal} <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>IPRESS</span></h3>
            </div>
            <div className="glass-panel" style={{ padding: '1.5rem', borderLeft: '4px solid #ef4444' }}>
              <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)' }}>Falta Diagnóstico</p>
              <h3 style={{ margin: '0.5rem 0 0 0', fontSize: '1.8rem', color: '#ef4444' }}>{geresaStats.faltanDiagnostico} <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>IPRESS</span></h3>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
            {/* IPRESS POR RED CHART */}
            <div className="glass-panel" style={{ padding: '1.5rem' }}>
              <h4 style={{ margin: '0 0 1rem 0', color: 'var(--text)' }}>IPRESS por Red (Unidad Ejecutora)</h4>
              <div style={{ height: '300px', width: '100%' }}>
                {geresaStats.ipressPorRed.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={geresaStats.ipressPorRed} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
                      <XAxis type="number" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis dataKey="red" type="category" width={120} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        cursor={{ fill: '#f1f5f9' }}
                      />
                      <Bar dataKey="cantidad" name="Cant. IPRESS" fill="var(--primary)" radius={[0, 4, 4, 0]} barSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                    Cargando usuarios...
                  </div>
                )}
              </div>
            </div>

            {/* COBERTURA PIE CHART */}
            <div className="glass-panel" style={{ padding: '1.5rem' }}>
              <h4 style={{ margin: '0 0 1rem 0', color: 'var(--text)' }}>Cobertura de Diagnósticos</h4>
              <div style={{ height: '300px', width: '100%' }}>
                {geresaStats.totalIpress > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={geresaStats.coberturaData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        <Cell key="cell-0" fill="#10b981" />
                        <Cell key="cell-1" fill="#ef4444" />
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                    Cargando estadísticas...
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

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
