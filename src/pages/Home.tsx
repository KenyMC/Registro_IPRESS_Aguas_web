import { Link } from 'react-router-dom';
import { 
  ClipboardList, 
  Droplet, 
  Building2, 
  BarChart3, 
  X, 
  CalendarClock, 
  AlertTriangle 
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { getRecords } from '../services/storage';
import { useAuth } from '../contexts/AuthContext';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend, 
  PieChart, 
  Pie, 
  Cell, 
  LabelList,
  ReferenceLine 
} from 'recharts';
import * as XLSX from 'xlsx';
import { matchRenipress, normalizeRenipress } from '../services/ipressData';

const monthNamesShort = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Set', 'Oct', 'Nov', 'Dic'];
const monthNamesFull = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Setiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const matchRedName = (a?: any, b?: any): boolean => {
  if (a === null || a === undefined || b === null || b === undefined) return false;
  const strA = String(a).trim().toLowerCase();
  const strB = String(b).trim().toLowerCase();
  return strA !== '' && strA === strB;
};

const getUserRed = (u: any): string => {
  if (!u) return '';
  if (u.red !== undefined && u.red !== null) {
    const r = String(u.red).trim();
    if (r) return r;
  }
  const rol = String(u.rol || '');
  if (rol.includes('Norte')) return 'Red Cusco Norte';
  if (rol.includes('Sur')) return 'Red Cusco Sur';
  if (rol.includes('CCE')) return 'Red CCE';
  if (rol.includes('Chumbivilcas')) return 'Red Chumbivilcas';
  if (rol.includes('La Convencion')) return 'Red La Convencion';
  if (rol.includes('Vraem') || rol.includes('VRAEM')) return 'Red Cusco VRAEM';
  return '';
};

const extractDateHelper = (val: string | undefined): string | null => {
  if (!val) return null;
  if (typeof val !== 'string') {
    try { return new Date(val).toISOString().split('T')[0]; } catch(e) { return null; }
  }
  const cleanVal = val.startsWith("'") ? val.substring(1).trim() : val.trim();
  if (cleanVal.match(/^\d{4}-\d{2}-\d{2}/)) return cleanVal.substring(0, 10);
  if (cleanVal.match(/^\d{2}-\d{2}-\d{4}/)) {
    const parts = cleanVal.split(' ')[0].split('-');
    if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  if (cleanVal.match(/^\d{2}\/\d{2}\/\d{4}/)) {
    const parts = cleanVal.split(' ')[0].split('/');
    if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  if (cleanVal.includes('T')) return cleanVal.split('T')[0];
  try {
    const d = new Date(cleanVal);
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  } catch(e) {}
  return null;
};

// Tooltip personalizado para IPRESS por Unidad Ejecutora
const CustomBarTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const isHospitalRow = String(label).trim().toLowerCase() === 'hospital' || String(label).toLowerCase().includes('hospital');
    return (
      <div style={{
        backgroundColor: '#fff',
        padding: '0.6rem 0.9rem',
        borderRadius: '8px',
        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        border: '1px solid #e2e8f0',
        fontSize: '0.875rem'
      }}>
        <p style={{ margin: '0 0 0.4rem 0', fontWeight: 600, color: 'var(--text)' }}>{label}</p>
        {payload.map((entry: any, index: number) => {
          const isCantidad = entry.dataKey === 'cantidad';
          const title = isCantidad 
            ? (isHospitalRow ? 'Cant. Hospitales' : 'Cant. IPRESS') 
            : entry.name;
          return (
            <p key={`tooltip-item-${index}`} style={{ margin: '0.25rem 0', color: entry.color, fontWeight: 500 }}>
              {title} : {entry.value}
            </p>
          );
        })}
      </div>
    );
  }
  return null;
};

// Tooltip personalizado para el gráfico de Cumplimiento Semanal de Monitoreo
const CustomWeeklyTooltip = ({ active, payload, unitName }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div style={{
        backgroundColor: '#ffffff',
        padding: '0.85rem 1.1rem',
        borderRadius: '8px',
        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
        border: '1px solid #e2e8f0',
        fontSize: '0.85rem',
        minWidth: '220px'
      }}>
        <p style={{ margin: '0 0 0.5rem 0', fontWeight: 700, color: 'var(--primary-dark)', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.35rem' }}>
          {data.fullName || data.name}
        </p>
        <p style={{ margin: '0.25rem 0', color: '#2563eb', fontWeight: 600 }}>
          🎯 Meta Semanal: {data.Meta} {unitName}
        </p>
        <p style={{ margin: '0.25rem 0', color: '#10b981', fontWeight: 600 }}>
          ✅ Cumplieron Monitoreo: {data.Monitoreadas} {unitName} ({data.Porcentaje}%)
        </p>
        <p style={{ margin: '0.25rem 0', color: '#ef4444', fontWeight: 600 }}>
          ⚠️ Faltan Monitorear: {data.Faltantes} {unitName}
        </p>
        {data.TotalMuestras !== undefined && (
          <p style={{ margin: '0.35rem 0 0 0', color: '#64748b', fontSize: '0.78rem', borderTop: '1px dashed #e2e8f0', paddingTop: '0.35rem' }}>
            📊 Registros totales de agua: {data.TotalMuestras}
          </p>
        )}
      </div>
    );
  }
  return null;
};

const getInitialDates = () => {
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, '0');
  const lastDay = new Date(y, today.getMonth() + 1, 0).getDate();
  return {
    month: `${y}-${m}`,
    from: `${y}-${m}-01`,
    to: `${y}-${m}-${String(lastDay).padStart(2, '0')}`
  };
};

export const Home: React.FC = () => {
  const { user, usersList } = useAuth();
  const initialDates = getInitialDates();

  const [dashboardRedFilter, setDashboardRedFilter] = useState<string>('Todas');
  const [selectedMonth, setSelectedMonth] = useState<string>(initialDates.month);
  const [dateFrom, setDateFrom] = useState<string>(initialDates.from);
  const [dateTo, setDateTo] = useState<string>(initialDates.to);
  const [monthOptions, setMonthOptions] = useState<{ value: string; label: string }[]>([]);
  const [showDetalleModal, setShowDetalleModal] = useState(false);

  // Estadísticas consolidadas
  const [gestionStats, setGestionStats] = useState({
    totalIpress: 0,
    monitoreosTotal: 0,
    monitoreosHistoricos: 0,
    monitoreoSemanal: 0,
    diagnosticosTotal: 0,
    faltanDiagnostico: 0,
    ipressPorRed: [] as { red: string; cantidad: number; monitoreos: number }[],
    coberturaData: [] as { name: string; value: number }[],
    detalleList: [] as { ipress: string; red: string; tieneDiag: boolean }[],
    weeklyComplianceData: [] as {
      name: string;
      fullName: string;
      Monitoreadas: number;
      Faltantes: number;
      Meta: number;
      Porcentaje: number;
      TotalMuestras: number;
    }[]
  });

  const isGeresaAdmin = user?.rol === 'Administra todas las Redes';
  const isRedAdmin = !isGeresaAdmin && (Boolean(user?.rol?.includes('Red')) || user?.rol === 'Red');
  const canViewGestionStats = isGeresaAdmin || isRedAdmin;
  const targetRed = isGeresaAdmin ? dashboardRedFilter : (getUserRed(user) || 'Sin Red');

  // Obtener lista de redes para el filtro GERESA
  const redesOptions = Array.from(new Set(
    usersList.filter(u => u.rol === 'IPRESS' || u.rol === 'Hospital' || u.rol === 'Red').map(u => u.red).filter(Boolean)
  )).sort();

  // Cambio de mes en selector
  const handleMonthChange = (val: string) => {
    setSelectedMonth(val);
    if (val !== 'custom') {
      const [y, m] = val.split('-').map(Number);
      const lastDay = new Date(y, m, 0).getDate();
      setDateFrom(`${y}-${String(m).padStart(2, '0')}-01`);
      setDateTo(`${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`);
    }
  };

  useEffect(() => {
    const loadData = () => {
      if (!user) return;
      
      let records = getRecords().filter(r => r.estado !== 'Inactivo');

      // Generar opciones de meses disponibles basados en fechas reales de registros
      const today = new Date();
      const curY = today.getFullYear();
      const curM = String(today.getMonth() + 1).padStart(2, '0');
      const curYM = `${curY}-${curM}`;

      const setYM = new Set<string>();
      setYM.add(curYM);

      for (let i = 1; i <= 3; i++) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        setYM.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
      }

      records.forEach(r => {
        const dStr = extractDateHelper(r.fecha) || extractDateHelper(r.fechaRegistro);
        if (dStr && dStr.length >= 7) {
          setYM.add(dStr.substring(0, 7));
        }
      });

      const sortedYM = Array.from(setYM).sort().reverse();
      const opts = sortedYM.map(ym => {
        const [y, m] = ym.split('-');
        const idx = parseInt(m, 10) - 1;
        const name = monthNamesFull[idx] || ym;
        const isCur = ym === curYM;
        return {
          value: ym,
          label: `${name} ${y}${isCur ? ' (Mes Actual)' : ''}`
        };
      });
      setMonthOptions(opts);

      // Filtro por Rol (RBAC)
      if (!isGeresaAdmin) {
        if (user.rol.includes('Red')) {
          const uRed = getUserRed(user);
          records = records.filter(r => {
            if (user.red && r.unidadEjecutora === user.red) return true;
            if (r.unidadEjecutora && matchRedName(r.unidadEjecutora, uRed)) return true;
            const userObj = usersList.find(u => 
              (u.codigoRenipress && r.codigoRenipress && matchRenipress(u.codigoRenipress, r.codigoRenipress)) ||
              (u.usuario && r.nombreIpress && String(u.usuario).trim().toLowerCase() === String(r.nombreIpress).trim().toLowerCase()) ||
              (u.nombreIpress && r.nombreIpress && String(u.nombreIpress).trim().toLowerCase() === String(r.nombreIpress).trim().toLowerCase())
            );
            return userObj?.red && matchRedName(userObj.red, uRed);
          });
        } else if (user.rol === 'IPRESS' || user.rol === 'Hospital') {
          records = records.filter(r => {
            if (!user.codigoRenipress) return String(r.nombreIpress).trim().toLowerCase() === String(user.usuario).trim().toLowerCase();
            return matchRenipress(user.codigoRenipress, r.codigoRenipress) ||
                   (String(r.nombreIpress).trim().toLowerCase() === String(user.usuario).trim().toLowerCase());
          });
        }
      }
      
      let diagnosticos = records.filter(r => r.tipo === 'diagnostico');
      let monitoreos = records.filter(r => r.tipo === 'monitoreo');

      // Aplicar filtro de Red para GERESA
      if (isGeresaAdmin && dashboardRedFilter !== 'Todas') {
        const filterByRed = (r: any) => {
          const userObj = usersList.find(u => 
            (u.codigoRenipress && r.codigoRenipress && matchRenipress(u.codigoRenipress, r.codigoRenipress)) ||
            (u.usuario && r.nombreIpress && String(u.usuario).trim().toLowerCase() === String(r.nombreIpress).trim().toLowerCase()) ||
            (u.nombreIpress && r.nombreIpress && String(u.nombreIpress).trim().toLowerCase() === String(r.nombreIpress).trim().toLowerCase())
          );
          const rRed = userObj?.red || r.unidadEjecutora;
          return matchRedName(rRed, dashboardRedFilter);
        };
        diagnosticos = diagnosticos.filter(filterByRed);
        monitoreos = monitoreos.filter(filterByRed);
      }

      // Total histórico de monitoreos
      const totalMonitoreosHistorico = monitoreos.length;

      // Filtrar registros por Rango de Fechas (Desde / Hasta)
      const isDateInRange = (r: any) => {
        if (!dateFrom && !dateTo) return true;
        const dStr = extractDateHelper(r.fecha) || extractDateHelper(r.fechaRegistro);
        if (!dStr) return false;
        if (dateFrom && dStr < dateFrom) return false;
        if (dateTo && dStr > dateTo) return false;
        return true;
      };

      const monitoreosEnPeriodo = monitoreos.filter(isDateInRange);
      const diagnosticosEnPeriodo = diagnosticos.filter(isDateInRange);

      // -------------------------------------------------------------
      // CÁLCULOS AVANZADOS PARA GERESA Y REDES
      // -------------------------------------------------------------
      const currentTargetRed = isGeresaAdmin ? dashboardRedFilter : (getUserRed(user) || 'Sin Red');

      // 1. Población total de IPRESS u Hospitales objetivo
      let allIpress = usersList.filter(u => u.rol === 'IPRESS' || u.rol === 'Hospital');
      if (currentTargetRed !== 'Todas') {
        allIpress = allIpress.filter(u => matchRedName(u.red, currentTargetRed));
      }
      const totalIpressCount = allIpress.length;

      // 2. IPRESS por Red / Unidad Ejecutora (Conteo total y monitoreos)
      const redCounts: Record<string, number> = {};
      const targetUsersList = usersList.filter(u => u.rol === 'IPRESS' || u.rol === 'Hospital');
      targetUsersList.forEach(u => {
        const redName = u.red || 'Sin Red';
        redCounts[redName] = (redCounts[redName] || 0) + 1;
      });
      
      const monitoreosPorRed: Record<string, number> = {};
      monitoreosEnPeriodo.forEach(m => {
        const userForM = usersList.find(u => 
          (u.codigoRenipress && m.codigoRenipress && matchRenipress(u.codigoRenipress, m.codigoRenipress)) ||
          (u.usuario && m.nombreIpress && String(u.usuario).trim().toLowerCase() === String(m.nombreIpress).trim().toLowerCase()) ||
          (u.nombreIpress && m.nombreIpress && String(u.nombreIpress).trim().toLowerCase() === String(m.nombreIpress).trim().toLowerCase())
        );
        const redName = userForM?.red || m.unidadEjecutora || 'Sin Red';
        monitoreosPorRed[redName] = (monitoreosPorRed[redName] || 0) + 1;
      });

      const allRedes = new Set([...Object.keys(redCounts), ...Object.keys(monitoreosPorRed)]);
      const ipressPorRedArr = Array.from(allRedes).map(red => ({
        red,
        cantidad: redCounts[red] || 0,
        monitoreos: monitoreosPorRed[red] || 0
      })).sort((a, b) => b.cantidad - a.cantidad);

      // 3. Monitoreos Totales en los Últimos 7 Días
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      sevenDaysAgo.setHours(0, 0, 0, 0);
      
      let totalMonitoreosSemanal = 0;
      monitoreos.forEach(m => {
        const dateStr = extractDateHelper(m.fecha) || extractDateHelper(m.fechaRegistro);
        if (dateStr) {
          const mDate = new Date(dateStr + 'T00:00:00');
          if (mDate >= sevenDaysAgo) {
            totalMonitoreosSemanal++;
          }
        } else if (m.fechaRegistro) {
          const mDate = new Date(m.fechaRegistro);
          if (!isNaN(mDate.getTime()) && mDate >= sevenDaysAgo) {
            totalMonitoreosSemanal++;
          }
        }
      });

      // 4. Cobertura de Diagnósticos & Falta Diagnóstico
      const ipressConDiagnostico = new Set();
      diagnosticos.forEach(d => {
        if (d.codigoRenipress) {
          ipressConDiagnostico.add(String(d.codigoRenipress).trim());
          const norm = normalizeRenipress(d.codigoRenipress);
          if (norm) ipressConDiagnostico.add(norm);
        }
        if (d.nombreIpress) ipressConDiagnostico.add(String(d.nombreIpress).trim().toLowerCase());
      });
      
      let conDiag = 0;
      const tempDetalleList: { ipress: string; red: string; tieneDiag: boolean }[] = [];
      
      allIpress.forEach(u => {
        const normUCode = normalizeRenipress(u.codigoRenipress);
        const codeMatch = (u.codigoRenipress && u.codigoRenipress !== 'S/N') 
          ? (ipressConDiagnostico.has(String(u.codigoRenipress).trim()) || (normUCode ? ipressConDiagnostico.has(normUCode) : false)) 
          : false;
        const nameMatch = u.usuario ? ipressConDiagnostico.has(String(u.usuario).trim().toLowerCase()) : false;
        const fullNameMatch = u.nombreIpress ? ipressConDiagnostico.has(String(u.nombreIpress).trim().toLowerCase()) : false;
        const tieneDiag = codeMatch || nameMatch || fullNameMatch;
        if (tieneDiag) {
          conDiag++;
        }
        tempDetalleList.push({
          ipress: u.nombreIpress || u.usuario || 'Sin Nombre',
          red: u.red || 'Sin Red',
          tieneDiag
        });
      });
      
      tempDetalleList.sort((a, b) => {
        if (a.tieneDiag && !b.tieneDiag) return -1;
        if (!a.tieneDiag && b.tieneDiag) return 1;
        return String(a.ipress).localeCompare(String(b.ipress));
      });

      const faltanDiag = Math.max(0, totalIpressCount - conDiag);

      // 5. CÁLCULO DE CUMPLIMIENTO SEMANAL DE MONITOREO (Gráfico Actividad Reciente MES)
      const weekDataList: any[] = [];
      if (dateFrom && dateTo) {
        const startD = new Date(dateFrom + 'T00:00:00');
        const endD = new Date(dateTo + 'T23:59:59');
        
        if (!isNaN(startD.getTime()) && !isNaN(endD.getTime()) && startD <= endD) {
          let currD = new Date(startD);
          let wIdx = 1;
          
          while (currD <= endD) {
            let nextD = new Date(currD);
            nextD.setDate(nextD.getDate() + 6);
            if (nextD > endD) {
              nextD = new Date(endD);
            }
            
            const sStr = currD.toISOString().split('T')[0];
            const eStr = nextD.toISOString().split('T')[0];
            
            const sDay = currD.getDate();
            const eDay = nextD.getDate();
            const sMShort = monthNamesShort[currD.getMonth()];
            const eMShort = monthNamesShort[nextD.getMonth()];
            
            const shortLabel = sMShort === eMShort
              ? `Sem. ${wIdx} (${sDay}-${eDay} ${sMShort})`
              : `Sem. ${wIdx} (${sDay} ${sMShort} - ${eDay} ${eMShort})`;
              
            const fullLabel = sMShort === eMShort
              ? `Semana ${wIdx} (${sDay} al ${eDay} de ${monthNamesFull[currD.getMonth()]})`
              : `Semana ${wIdx} (${sDay} ${sMShort} al ${eDay} ${eMShort})`;
            
            // Contar IPRESS únicas que cumplieron monitoreo en esta semana
            const uniqueMonitoredIpress = new Set<string>();
            let samplesCount = 0;
            
            monitoreos.forEach(m => {
              const mDate = extractDateHelper(m.fecha) || extractDateHelper(m.fechaRegistro);
              if (mDate && mDate >= sStr && mDate <= eStr) {
                samplesCount++;
                
                const matchedUser = allIpress.find(u =>
                  (u.codigoRenipress && m.codigoRenipress && matchRenipress(u.codigoRenipress, m.codigoRenipress)) ||
                  (u.usuario && m.nombreIpress && String(u.usuario).trim().toLowerCase() === String(m.nombreIpress).trim().toLowerCase()) ||
                  (u.nombreIpress && m.nombreIpress && String(u.nombreIpress).trim().toLowerCase() === String(m.nombreIpress).trim().toLowerCase())
                );
                
                if (matchedUser) {
                  const key = String(matchedUser.codigoRenipress || matchedUser.usuario || matchedUser.nombreIpress || 'ipress-item');
                  uniqueMonitoredIpress.add(key);
                } else if (currentTargetRed === 'Todas' || (m.unidadEjecutora && matchRedName(m.unidadEjecutora, currentTargetRed))) {
                  uniqueMonitoredIpress.add(m.codigoRenipress || m.nombreIpress || `rec-${samplesCount}`);
                }
              }
            });
            
            const monitoredCount = Math.min(totalIpressCount, uniqueMonitoredIpress.size);
            const faltanCount = Math.max(0, totalIpressCount - monitoredCount);
            const pct = totalIpressCount > 0 ? Math.round((monitoredCount / totalIpressCount) * 100) : 0;
            
            weekDataList.push({
              name: shortLabel,
              fullName: fullLabel,
              Monitoreadas: monitoredCount,
              Faltantes: faltanCount,
              Meta: totalIpressCount,
              Porcentaje: pct,
              TotalMuestras: samplesCount
            });
            
            const advance = new Date(nextD);
            advance.setDate(advance.getDate() + 1);
            currD = advance;
            wIdx++;
          }
        }
      }

      setGestionStats({
        totalIpress: totalIpressCount,
        monitoreosTotal: monitoreosEnPeriodo.length,
        monitoreosHistoricos: totalMonitoreosHistorico,
        monitoreoSemanal: totalMonitoreosSemanal,
        diagnosticosTotal: (dateFrom || dateTo) ? diagnosticosEnPeriodo.length : diagnosticos.length,
        faltanDiagnostico: faltanDiag,
        ipressPorRed: ipressPorRedArr,
        coberturaData: [
          { name: 'Con Diagnóstico', value: conDiag },
          { name: 'Falta Diagnóstico', value: faltanDiag }
        ],
        detalleList: tempDetalleList,
        weeklyComplianceData: weekDataList
      });
    };

    loadData();

    window.addEventListener('recordsUpdated', loadData);
    return () => window.removeEventListener('recordsUpdated', loadData);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, dashboardRedFilter, dateFrom, dateTo, usersList]);

  const exportarDetalleExcel = () => {
    const data = gestionStats.detalleList.map(item => ({
      'Unidad Ejecutora': item.red,
      'IPRESS': item.ipress,
      '¿Tiene Diagnóstico?': item.tieneDiag ? 'Sí' : 'No'
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Detalle de Diagnósticos');
    const safeRedName = (targetRed || 'General').replace(/[^a-zA-Z0-9_-]/g, '_');
    XLSX.writeFile(wb, `Detalle_Diagnosticos_${safeRedName}.xlsx`);
  };

  const isHospital = targetRed === 'Hospital';
  const unitName = isHospital ? 'Hospitales' : 'IPRESS';
  const titleText = isGeresaAdmin 
    ? 'Estadísticas de Gestión (GERESA)' 
    : `Estadísticas de Gestión (${targetRed})`;

  const unitEstablecimientoTitle = targetRed === 'Todas' 
    ? 'Establecimientos Región Cusco' 
    : (isHospital ? 'Establecimientos Hospitales' : `Establecimientos ${targetRed}`);

  const maxWeeklyY = Math.max(
    gestionStats.totalIpress, 
    ...gestionStats.weeklyComplianceData.map(d => Math.max(d.Monitoreadas, d.Faltantes, d.Meta || 0)), 
    10
  ) + 5;

  const complianceAvg = gestionStats.weeklyComplianceData.length > 0
    ? Math.round(
        gestionStats.weeklyComplianceData.reduce((acc, curr) => acc + curr.Porcentaje, 0) / 
        gestionStats.weeklyComplianceData.length
      )
    : 0;

  return (
    <div className="container animate-fade-in">
      {/* HEADER PRINCIPAL */}
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h1 style={{ color: 'var(--primary)', marginBottom: '0.5rem' }}>Sistema de Control IPRESS</h1>
        <p style={{ color: 'var(--text-muted)' }}>Dashboard y Resumen de Operaciones</p>
      </div>

      {/* SECCIÓN ESTADÍSTICAS DE GESTIÓN (GERESA / REDES) */}
      <div style={{ marginBottom: '3rem' }}>
        {/* BARRA DE FILTROS: Unidad Ejecutora y Rango de Fecha */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1.5rem',
          padding: '1rem 1.25rem',
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.05)',
          border: '1px solid #e2e8f0'
        }}>
          {/* TÍTULO DE LA SECCIÓN */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{ padding: '0.45rem', backgroundColor: 'rgba(37, 99, 235, 0.1)', borderRadius: '8px', color: 'var(--primary)' }}>
              <BarChart3 size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, color: 'var(--primary-dark)', fontSize: '1.2rem', fontWeight: 700 }}>
                {titleText}
              </h3>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Control semanal de cobertura y estado situacional
              </p>
            </div>
          </div>

          {/* CONTENEDOR DE FILTROS */}
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            {/* FILTRO 1: UNIDAD EJECUTORA */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                Filtrar por Unidad Ejecutora:
              </span>
              {isGeresaAdmin ? (
                <select
                  value={dashboardRedFilter}
                  onChange={(e) => setDashboardRedFilter(e.target.value)}
                  style={{
                    padding: '0.45rem 0.75rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    outline: 'none',
                    fontSize: '0.85rem',
                    backgroundColor: '#ffffff',
                    color: 'var(--text)',
                    cursor: 'pointer',
                    fontWeight: 500
                  }}
                >
                  <option value="Todas">Todas</option>
                  {redesOptions.map(red => (
                    <option key={red} value={red}>{red}</option>
                  ))}
                </select>
              ) : (
                <span style={{
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: 'var(--primary-dark)',
                  backgroundColor: '#eff6ff',
                  padding: '0.35rem 0.75rem',
                  borderRadius: '6px',
                  border: '1px solid #bfdbfe'
                }}>
                  {targetRed}
                </span>
              )}
            </div>

            {/* FILTRO 2: RANGO DE FECHA */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                Rango de fecha:
              </span>
              <select
                value={selectedMonth}
                onChange={(e) => handleMonthChange(e.target.value)}
                style={{
                  padding: '0.45rem 0.75rem',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  outline: 'none',
                  fontSize: '0.85rem',
                  backgroundColor: '#ffffff',
                  color: 'var(--text)',
                  cursor: 'pointer',
                  fontWeight: 500
                }}
              >
                {monthOptions.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
                <option value="custom">📅 Personalizado...</option>
              </select>

              {/* INPUTS DE FECHA DESDE / HASTA */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => {
                    setDateFrom(e.target.value);
                    setSelectedMonth('custom');
                  }}
                  style={{
                    padding: '0.4rem 0.5rem',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.8rem',
                    outline: 'none'
                  }}
                  title="Fecha de inicio"
                />
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>al</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => {
                    setDateTo(e.target.value);
                    setSelectedMonth('custom');
                  }}
                  style={{
                    padding: '0.4rem 0.5rem',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.8rem',
                    outline: 'none'
                  }}
                  title="Fecha de fin"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 5 TARJETAS KPI CON ICONOS REPRESENTATIVOS */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '1rem', 
          marginBottom: '2rem' 
        }}>
          {/* 1. Establecimientos Región Cusco */}
          <div className="glass-panel" style={{ 
            padding: '1.25rem', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '1rem', 
            borderLeft: '4px solid var(--primary)',
            borderRadius: '12px'
          }}>
            <div style={{ 
              padding: '0.85rem', 
              backgroundColor: 'rgba(37, 99, 235, 0.1)', 
              borderRadius: '12px', 
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <Building2 size={24} />
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={unitEstablecimientoTitle}>
                {unitEstablecimientoTitle}
              </p>
              <h3 style={{ margin: '0.2rem 0 0 0', fontSize: '1.6rem', color: 'var(--primary-dark)', fontWeight: 700 }}>
                {gestionStats.totalIpress}
              </h3>
            </div>
          </div>

          {/* 2. Monitoreos */}
          <div className="glass-panel" style={{ 
            padding: '1.25rem', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '1rem', 
            borderLeft: '4px solid #f59e0b',
            borderRadius: '12px'
          }}>
            <div style={{ 
              padding: '0.85rem', 
              backgroundColor: 'rgba(245, 158, 11, 0.1)', 
              borderRadius: '12px', 
              color: '#f59e0b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <Droplet size={24} />
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                Monitoreos
              </p>
              <h3 style={{ margin: '0.2rem 0 0 0', fontSize: '1.6rem', color: 'var(--primary-dark)', fontWeight: 700 }}>
                {gestionStats.monitoreosTotal}
              </h3>
            </div>
          </div>

          {/* 3. Monitoreos (Últimos 7 días) */}
          <div className="glass-panel" style={{ 
            padding: '1.25rem', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '1rem', 
            borderLeft: '4px solid #10b981',
            borderRadius: '12px'
          }}>
            <div style={{ 
              padding: '0.85rem', 
              backgroundColor: 'rgba(16, 185, 129, 0.1)', 
              borderRadius: '12px', 
              color: '#10b981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <CalendarClock size={24} />
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                Monitoreos (Últimos 7 días)
              </p>
              <h3 style={{ margin: '0.2rem 0 0 0', fontSize: '1.6rem', color: '#10b981', fontWeight: 700 }}>
                {gestionStats.monitoreoSemanal}
              </h3>
            </div>
          </div>

          {/* 4. Diagnósticos */}
          <div className="glass-panel" style={{ 
            padding: '1.25rem', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '1rem', 
            borderLeft: '4px solid #6366f1',
            borderRadius: '12px'
          }}>
            <div style={{ 
              padding: '0.85rem', 
              backgroundColor: 'rgba(99, 102, 241, 0.1)', 
              borderRadius: '12px', 
              color: '#6366f1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <ClipboardList size={24} />
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                Diagnósticos
              </p>
              <h3 style={{ margin: '0.2rem 0 0 0', fontSize: '1.6rem', color: 'var(--primary-dark)', fontWeight: 700 }}>
                {gestionStats.diagnosticosTotal}
              </h3>
            </div>
          </div>

          {/* 5. Falta Diagnóstico */}
          <div className="glass-panel" style={{ 
            padding: '1.25rem', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '1rem', 
            borderLeft: '4px solid #ef4444',
            borderRadius: '12px'
          }}>
            <div style={{ 
              padding: '0.85rem', 
              backgroundColor: 'rgba(239, 68, 68, 0.1)', 
              borderRadius: '12px', 
              color: '#ef4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <AlertTriangle size={24} />
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                Falta Diagnóstico
              </p>
              <h3 style={{ margin: '0.2rem 0 0 0', fontSize: '1.6rem', color: '#ef4444', fontWeight: 700 }}>
                {gestionStats.faltanDiagnostico} <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>{unitName}</span>
              </h3>
            </div>
          </div>
        </div>

        {/* GRÁFICO 1: ACTIVIDAD RECIENTE (MES) - CUMPLIMIENTO SEMANAL DE MONITOREO */}
        <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <BarChart3 size={20} color="var(--primary)" />
                <h3 style={{ margin: 0, color: 'var(--primary-dark)', fontSize: '1.15rem' }}>
                  Actividad Reciente (MES) - Cumplimiento Semanal de Monitoreo
                </h3>
              </div>
              <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Seguimiento semanal por IPRESS: {targetRed === 'Todas' ? 'Toda la Región Cusco' : targetRed} (Meta: {gestionStats.totalIpress} {unitName} semanales)
              </p>
            </div>

            {/* RESUMEN DE CUMPLIMIENTO GLOBAL */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              backgroundColor: '#f8fafc',
              padding: '0.4rem 0.85rem',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              fontSize: '0.85rem'
            }}>
              <span style={{ color: 'var(--text-muted)' }}>
                Meta Semanal: <strong style={{ color: 'var(--primary-dark)' }}>{gestionStats.totalIpress}</strong> {unitName}
              </span>
              <span style={{ color: '#cbd5e1' }}>|</span>
              <span style={{ color: 'var(--text-muted)' }}>
                Cumplimiento Promedio: <strong style={{ color: complianceAvg >= 80 ? '#10b981' : complianceAvg >= 50 ? '#f59e0b' : '#ef4444' }}>{complianceAvg}%</strong>
              </span>
            </div>
          </div>

          <div style={{ height: '320px', width: '100%' }}>
            {gestionStats.weeklyComplianceData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={gestionStats.weeklyComplianceData} margin={{ top: 25, right: 15, left: -15, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} domain={[0, maxWeeklyY]} />
                  <Tooltip content={<CustomWeeklyTooltip unitName={unitName} />} />
                  <Legend wrapperStyle={{ paddingTop: '10px' }} />
                  {gestionStats.totalIpress > 0 && (
                    <ReferenceLine 
                      y={gestionStats.totalIpress} 
                      stroke="#2563eb" 
                      strokeDasharray="4 4" 
                      strokeWidth={1.5}
                      label={{ 
                        value: `Meta: ${gestionStats.totalIpress} ${unitName}`, 
                        position: 'top', 
                        fill: '#2563eb', 
                        fontSize: 11, 
                        fontWeight: 600 
                      }} 
                    />
                  )}
                  <Bar dataKey="Monitoreadas" name="IPRESS Monitoreadas" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={45}>
                    <LabelList dataKey="Monitoreadas" position="top" fill="#10b981" fontSize={11} fontWeight={600} />
                  </Bar>
                  <Bar dataKey="Faltantes" name="Faltan Monitorear" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={45}>
                    <LabelList dataKey="Faltantes" position="top" fill="#ef4444" fontSize={11} fontWeight={600} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                No hay registros de monitoreo para el periodo y red seleccionados.
              </div>
            )}
          </div>
        </div>

        {/* DEMÁS GRÁFICOS: IPRESS POR UNIDAD EJECUTORA & COBERTURA DE DIAGNÓSTICOS */}
        {canViewGestionStats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
            {/* GRÁFICO 2: IPRESS POR UNIDAD EJECUTORA */}
            <div className="glass-panel" style={{ padding: '1.5rem' }}>
              <h4 style={{ margin: '0 0 1rem 0', color: 'var(--text)' }}>IPRESS por Unidad Ejecutora</h4>
              <div style={{ height: '300px', width: '100%' }}>
                {gestionStats.ipressPorRed.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={gestionStats.ipressPorRed} layout="vertical" margin={{ top: 5, right: 40, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
                      <XAxis type="number" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis dataKey="red" type="category" width={140} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <Tooltip 
                        content={<CustomBarTooltip />}
                        cursor={{ fill: '#f1f5f9' }}
                      />
                      <Legend />
                      <Bar dataKey="cantidad" name={`Cant. ${unitName}`} fill="var(--primary)" radius={[0, 4, 4, 0]} barSize={15}>
                        <LabelList dataKey="cantidad" position="right" fill="#64748b" fontSize={11} fontWeight={500} />
                      </Bar>
                      <Bar dataKey="monitoreos" name="Monitoreos Totales" fill="#f59e0b" radius={[0, 4, 4, 0]} barSize={15}>
                        <LabelList dataKey="monitoreos" position="right" fill="#64748b" fontSize={11} fontWeight={500} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                    Cargando usuarios...
                  </div>
                )}
              </div>
            </div>

            {/* GRÁFICO 3: COBERTURA DE DIAGNÓSTICOS */}
            <div className="glass-panel" style={{ padding: '1.5rem', position: 'relative' }}>
              <h4 style={{ margin: '0 0 1rem 0', color: 'var(--text)' }}>Cobertura de Diagnósticos</h4>
              <div style={{ height: '300px', width: '100%', position: 'relative' }}>
                {gestionStats.totalIpress > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={gestionStats.coberturaData}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={70}
                        paddingAngle={5}
                        dataKey="value"
                        label={(props: any) => {
                          const { cx, cy, midAngle, outerRadius, name, percent } = props;
                          const RADIAN = Math.PI / 180;
                          const radius = outerRadius + 12;
                          const x = cx + radius * Math.cos(-midAngle * RADIAN);
                          const y = cy + radius * Math.sin(-midAngle * RADIAN);
                          return (
                            <text x={x} y={y} fill="#64748b" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={11}>
                              <tspan x={x} dy="-0.4em">{name}</tspan>
                              <tspan x={x} dy="1.2em">{`(${((percent || 0) * 100).toFixed(0)}%)`}</tspan>
                            </text>
                          );
                        }}
                        labelLine={true}
                      >
                        <Cell key="cell-0" fill="#10b981" />
                        <Cell key="cell-1" fill="#ef4444" />
                        <LabelList dataKey="value" position="inside" fill="#ffffff" fontSize={12} fontWeight={600} />
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                    Cargando estadísticas...
                  </div>
                )}

                {/* FLECHA CURVA ANIMADA QUE SALE DE LA SECCIÓN ROJA APUNTANDO AL BOTÓN VER DETALLE */}
                {gestionStats.faltanDiagnostico > 0 && (
                  <div style={{
                    position: 'absolute',
                    left: '52%',
                    top: '185px',
                    right: '30px',
                    bottom: '5px',
                    pointerEvents: 'none',
                    zIndex: 2
                  }}>
                    <svg width="100%" height="100%" viewBox="0 0 120 75" fill="none" preserveAspectRatio="none" style={{ overflow: 'visible' }}>
                      <defs>
                        <marker id="arrowhead-red" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                          <polygon points="0 0, 8 3, 0 6" fill="#ef4444" />
                        </marker>
                        <linearGradient id="redGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#ef4444" stopOpacity="0.3" />
                          <stop offset="100%" stopColor="#ef4444" stopOpacity="1" />
                        </linearGradient>
                      </defs>
                      <path
                        d="M 12 8 Q 45 45 112 70"
                        stroke="url(#redGrad)"
                        strokeWidth="2.5"
                        strokeDasharray="6 4"
                        markerEnd="url(#arrowhead-red)"
                        className="dash-flow-arrow"
                      />
                    </svg>
                  </div>
                )}
              </div>

              {/* CONTENEDOR INFERIOR CON INDICADOR ANIMADO Y BOTÓN VER DETALLE */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.75rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                {gestionStats.faltanDiagnostico > 0 && (
                  <div 
                    onClick={() => setShowDetalleModal(true)}
                    title="Clic para ver la lista de IPRESS con y sin diagnóstico"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: '#fee2e2',
                      border: '1.5px solid #ef4444',
                      color: '#b91c1c',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      padding: '4px 10px',
                      borderRadius: '16px',
                      cursor: 'pointer',
                      userSelect: 'none',
                      animation: 'pulseBadgeRed 2s infinite ease-in-out',
                      zIndex: 3
                    }}
                  >
                    <span style={{ 
                      display: 'inline-block', 
                      width: '7px', 
                      height: '7px', 
                      borderRadius: '50%', 
                      backgroundColor: '#ef4444', 
                      animation: 'blinkDotRed 1.2s infinite' 
                    }}></span>
                    <span>Ver quiénes faltan</span>
                    <span style={{ animation: 'bounceArrowDiag 1.5s infinite ease-in-out', display: 'inline-block' }}>👉</span>
                  </div>
                )}

                <button
                  onClick={() => setShowDetalleModal(true)}
                  className={gestionStats.faltanDiagnostico > 0 ? "btn-ver-detalle-pulse" : ""}
                  style={{
                    padding: '0.45rem 1.1rem',
                    backgroundColor: gestionStats.faltanDiagnostico > 0 ? '#eff6ff' : 'var(--primary-light)',
                    color: gestionStats.faltanDiagnostico > 0 ? '#1d4ed8' : 'var(--primary-dark)',
                    border: gestionStats.faltanDiagnostico > 0 ? '1.5px solid #3b82f6' : '1px solid var(--primary)',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    fontWeight: 600,
                    transition: 'all 0.2s ease',
                    boxShadow: '0 2px 4px rgba(37, 99, 235, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    zIndex: 3
                  }}
                >
                  Ver Detalle
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL DETALLE COBERTURA */}
        {showDetalleModal && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
          }}>
            <div style={{
              backgroundColor: 'white', borderRadius: '12px', width: '100%', maxWidth: '600px',
              maxHeight: '90vh', display: 'flex', flexDirection: 'column',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)'
            }}>
              <div style={{ padding: '1.25rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, color: 'var(--text)', fontSize: '1.2rem' }}>
                  Detalle de Diagnósticos {isGeresaAdmin ? (dashboardRedFilter === 'Todas' ? '(Región Cusco)' : `(${dashboardRedFilter})`) : `(${targetRed})`}
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <button 
                    onClick={exportarDetalleExcel}
                    style={{
                      padding: '0.4rem 0.8rem',
                      backgroundColor: '#10b981',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '0.875rem',
                      cursor: 'pointer',
                      fontWeight: 500,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem'
                    }}
                  >
                    Exportar Excel
                  </button>
                  <button onClick={() => setShowDetalleModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex' }}>
                    <X size={24} />
                  </button>
                </div>
              </div>
              <div style={{ padding: '1rem', overflowY: 'auto', flex: 1 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                  <thead style={{ position: 'sticky', top: 0, backgroundColor: 'white', zIndex: 1 }}>
                    <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                      <th style={{ padding: '0.75rem', color: '#64748b', fontWeight: 600 }}>Unidad Ejecutora</th>
                      <th style={{ padding: '0.75rem', color: '#64748b', fontWeight: 600 }}>IPRESS</th>
                      <th style={{ padding: '0.75rem', color: '#64748b', fontWeight: 600, textAlign: 'center' }}>¿Tiene Diagnóstico?</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gestionStats.detalleList.map((item, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '0.75rem', color: 'var(--text)' }}>{item.red}</td>
                        <td style={{ padding: '0.75rem', color: 'var(--text)' }}>{item.ipress}</td>
                        <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                          {item.tieneDiag ? (
                            <span style={{ backgroundColor: '#dcfce7', color: '#166534', padding: '0.2rem 0.5rem', borderRadius: '1rem', fontSize: '0.75rem', fontWeight: 600 }}>Sí</span>
                          ) : (
                            <span style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '0.2rem 0.5rem', borderRadius: '1rem', fontSize: '0.75rem', fontWeight: 600 }}>No</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {gestionStats.detalleList.length === 0 && (
                      <tr>
                        <td colSpan={3} style={{ padding: '1.5rem', textAlign: 'center', color: '#94a3b8' }}>No hay registros para mostrar.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* BOTONES DE ACCIÓN (OPERACIONES) */}
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
