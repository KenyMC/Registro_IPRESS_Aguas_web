import { Link } from 'react-router-dom';
import { 
  ClipboardList, 
  Droplet, 
  Building2, 
  BarChart3, 
  X, 
  CalendarClock, 
  AlertTriangle,
  FileSpreadsheet
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
import ExcelJS from 'exceljs';
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

// Extractor robusto de fecha con saneamiento anti-fechas corruptas (ej. 1899)
const extractDateHelper = (val: string | undefined): string | null => {
  if (!val) return null;
  if (typeof val !== 'string') {
    try { 
      const d = new Date(val);
      if (!isNaN(d.getTime())) {
        const iso = d.toISOString().split('T')[0];
        const yr = parseInt(iso.substring(0, 4), 10);
        if (yr >= 2020 && yr <= 2035) return iso;
      }
      return null;
    } catch(e) { return null; }
  }
  const cleanVal = val.startsWith("'") ? val.substring(1).trim() : val.trim();
  let result: string | null = null;
  if (cleanVal.match(/^\d{4}-\d{2}-\d{2}/)) {
    result = cleanVal.substring(0, 10);
  } else if (cleanVal.match(/^\d{2}-\d{2}-\d{4}/)) {
    const parts = cleanVal.split(' ')[0].split('-');
    if (parts.length === 3) result = `${parts[2]}-${parts[1]}-${parts[0]}`;
  } else if (cleanVal.match(/^\d{2}\/\d{2}\/\d{4}/)) {
    const parts = cleanVal.split(' ')[0].split('/');
    if (parts.length === 3) result = `${parts[2]}-${parts[1]}-${parts[0]}`;
  } else if (cleanVal.includes('T')) {
    result = cleanVal.split('T')[0];
  } else {
    try {
      const d = new Date(cleanVal);
      if (!isNaN(d.getTime())) result = d.toISOString().split('T')[0];
    } catch(e) {}
  }
  
  if (result) {
    const yr = parseInt(result.substring(0, 4), 10);
    if (yr < 2020 || yr > 2035) return null;
  }
  return result;
};

// Captura de elementos SVG de Recharts convertidos a PNG base64 para Excel
const captureChartSvgAsBase64 = async (elementId: string): Promise<string | null> => {
  const container = document.getElementById(elementId);
  if (!container) return null;
  const svg = container.querySelector('svg');
  if (!svg) return null;

  try {
    const clonedSvg = svg.cloneNode(true) as SVGSVGElement;
    const bbox = svg.getBoundingClientRect();
    const width = Math.max(svg.clientWidth || bbox.width || 750, 600);
    const height = Math.max(svg.clientHeight || bbox.height || 320, 260);

    clonedSvg.setAttribute('width', `${width}`);
    clonedSvg.setAttribute('height', `${height}`);
    clonedSvg.setAttribute('style', 'background-color: #ffffff;');

    const origElements = Array.from(svg.querySelectorAll('*'));
    const cloneElements = Array.from(clonedSvg.querySelectorAll('*'));
    origElements.forEach((orig, i) => {
      const clone = cloneElements[i];
      if (orig && clone) {
        const style = window.getComputedStyle(orig);
        const fill = style.getPropertyValue('fill');
        const stroke = style.getPropertyValue('stroke');
        const fontSize = style.getPropertyValue('font-size');
        const fontWeight = style.getPropertyValue('font-weight');
        if (fill && fill !== 'none') clone.setAttribute('fill', fill);
        if (stroke && stroke !== 'none') clone.setAttribute('stroke', stroke);
        clone.setAttribute('font-family', 'Arial, sans-serif');
        if (fontSize) clone.setAttribute('font-size', fontSize);
        if (fontWeight) clone.setAttribute('font-weight', fontWeight);
      }
    });

    const xml = new XMLSerializer().serializeToString(clonedSvg);
    const svgBlob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' });
    const blobUrl = URL.createObjectURL(svgBlob);

    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const scale = 2; // Alta resolución
        canvas.width = width * scale;
        canvas.height = height * scale;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.scale(scale, scale);
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/png');
          URL.revokeObjectURL(blobUrl);
          resolve(dataUrl.replace(/^data:image\/png;base64,/, ''));
        } else {
          URL.revokeObjectURL(blobUrl);
          resolve(null);
        }
      };
      img.onerror = () => {
        URL.revokeObjectURL(blobUrl);
        resolve(null);
      };
      img.src = blobUrl;
    });
  } catch (e) {
    console.error('Error capturing chart SVG:', e);
    return null;
  }
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

export const Home: React.FC = () => {
  const { user, usersList } = useAuth();

  const [dashboardRedFilter, setDashboardRedFilter] = useState<string>('Todas');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [dbMinDate, setDbMinDate] = useState<string>('');
  const [dbMaxDate, setDbMaxDate] = useState<string>('');
  const [datesInitialized, setDatesInitialized] = useState<boolean>(false);
  const [showDetalleModal, setShowDetalleModal] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);

  // Estadísticas consolidadas
  const [gestionStats, setGestionStats] = useState({
    totalIpress: 0,
    monitoreosTotal: 0,
    monitoreosHistoricos: 0,
    monitoreoSemanal: 0, // IPRESS distintas con monitoreo en últimos 7 días
    conDiagnosticoTotal: 0, // IPRESS distintas con diagnóstico (nunca excede totalIpress)
    faltanDiagnostico: 0,
    chartMonthTitle: '',
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

  // Controladores de fecha con validación estricta
  const handleDateFromChange = (val: string) => {
    if (!val) {
      setDateFrom('');
      return;
    }
    let safeVal = val;
    if (dbMinDate && safeVal < dbMinDate) {
      safeVal = dbMinDate;
    }
    setDateFrom(safeVal);
    if (dateTo && safeVal > dateTo) {
      setDateTo(safeVal);
    }
  };

  const handleDateToChange = (val: string) => {
    if (!val) {
      setDateTo('');
      return;
    }
    let safeVal = val;
    if (dbMinDate && safeVal < dbMinDate) {
      safeVal = dbMinDate;
    }
    if (dateFrom && safeVal < dateFrom) {
      setDateFrom(safeVal);
    }
    setDateTo(safeVal);
  };

  useEffect(() => {
    const loadData = () => {
      if (!user) return;
      
      let records = getRecords().filter(r => r.estado !== 'Inactivo');

      // 1. Detectar fecha más antigua y más actual registradas en la base de datos (válidas >= 2020)
      let minDateFound: string | null = null;
      let maxDateFound: string | null = null;

      records.forEach(r => {
        const dStr = extractDateHelper(r.fecha) || extractDateHelper(r.fechaRegistro);
        if (dStr) {
          if (!minDateFound || dStr < minDateFound) minDateFound = dStr;
          if (!maxDateFound || dStr > maxDateFound) maxDateFound = dStr;
        }
      });

      const todayStr = new Date().toISOString().split('T')[0];
      const earliest = minDateFound || `${new Date().getFullYear()}-01-01`;
      const latest = maxDateFound || todayStr;

      setDbMinDate(earliest);
      setDbMaxDate(latest);

      // Si es la primera carga, inicializar el rango con [fecha más antigua, fecha más actual]
      let activeDateFrom = dateFrom;
      let activeDateTo = dateTo;

      if (!datesInitialized) {
        activeDateFrom = earliest;
        activeDateTo = latest;
        setDateFrom(earliest);
        setDateTo(latest);
        setDatesInitialized(true);
      }

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

      // Total histórico de monitoreos para la Red seleccionada
      const totalMonitoreosHistorico = monitoreos.length;

      // Filtrar registros por Rango de Fechas (Inicio / Fin)
      const isDateInRange = (r: any) => {
        if (!activeDateFrom && !activeDateTo) return true;
        const dStr = extractDateHelper(r.fecha) || extractDateHelper(r.fechaRegistro);
        if (!dStr) return false;
        if (activeDateFrom && dStr < activeDateFrom) return false;
        if (activeDateTo && dStr > activeDateTo) return false;
        return true;
      };

      const monitoreosEnPeriodo = monitoreos.filter(isDateInRange);

      // -------------------------------------------------------------
      // CÁLCULOS AVANZADOS PARA GERESA Y REDES
      // -------------------------------------------------------------
      const currentTargetRed = isGeresaAdmin ? dashboardRedFilter : (getUserRed(user) || 'Sin Red');

      // Población total de IPRESS u Hospitales objetivo
      let allIpress = usersList.filter(u => u.rol === 'IPRESS' || u.rol === 'Hospital');
      if (currentTargetRed !== 'Todas') {
        allIpress = allIpress.filter(u => matchRedName(u.red, currentTargetRed));
      }
      const totalIpressCount = allIpress.length;

      // IPRESS por Red / Unidad Ejecutora (Conteo total y monitoreos)
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

      // -------------------------------------------------------------
      // 3. IPRESS ÚNICAS CON MONITOREOS EN LOS ÚLTIMOS 7 DÍAS
      // Cada IPRESS que haya monitoreado suma estrictamente 1
      // -------------------------------------------------------------
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      sevenDaysAgo.setHours(0, 0, 0, 0);
      
      const ipressMonitoreadasSemanal = new Set<string>();
      monitoreos.forEach(m => {
        const dateStr = extractDateHelper(m.fecha) || extractDateHelper(m.fechaRegistro);
        let isRecent = false;
        if (dateStr) {
          const mDate = new Date(dateStr + 'T00:00:00');
          if (mDate >= sevenDaysAgo) isRecent = true;
        } else if (m.fechaRegistro) {
          const mDate = new Date(m.fechaRegistro);
          if (!isNaN(mDate.getTime()) && mDate >= sevenDaysAgo) isRecent = true;
        }

        if (isRecent) {
          const matchedUser = allIpress.find(u => 
            (u.codigoRenipress && m.codigoRenipress && matchRenipress(u.codigoRenipress, m.codigoRenipress)) ||
            (u.usuario && m.nombreIpress && String(u.usuario).trim().toLowerCase() === String(m.nombreIpress).trim().toLowerCase()) ||
            (u.nombreIpress && m.nombreIpress && String(u.nombreIpress).trim().toLowerCase() === String(m.nombreIpress).trim().toLowerCase())
          );
          if (matchedUser) {
            ipressMonitoreadasSemanal.add(String(matchedUser.codigoRenipress || matchedUser.usuario || matchedUser.nombreIpress));
          } else if (currentTargetRed === 'Todas' || (m.unidadEjecutora && matchRedName(m.unidadEjecutora, currentTargetRed))) {
            ipressMonitoreadasSemanal.add(String(m.codigoRenipress || m.nombreIpress || Math.random()));
          }
        }
      });
      const totalIpressConMonitoreoSemanal = Math.min(totalIpressCount, ipressMonitoreadasSemanal.size);

      // -------------------------------------------------------------
      // 4. IPRESS CON DIAGNÓSTICOS & FALTA DIAGNÓSTICO
      // Conteo de IPRESS únicas con diagnóstico (si una IPRESS tiene >1 diagnóstico igual suma como 1)
      // -------------------------------------------------------------
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

      // -------------------------------------------------------------
      // 5. CÁLCULO DE CUMPLIMIENTO SEMANAL DE MONITOREO
      // Regla: Se enfoca siempre en el mes más actual del rango de fechas seleccionado
      // (evitando desconfiguración por abarcar múltiples meses en el gráfico semanal)
      // -------------------------------------------------------------
      const referenceDateStr = activeDateTo || activeDateFrom || latest;
      const [tYearStr, tMonthStr] = referenceDateStr.split('-');
      const targetYear = parseInt(tYearStr, 10);
      const targetMonth = parseInt(tMonthStr, 10); // 1-12

      const targetMonthName = monthNamesFull[targetMonth - 1] || tMonthStr;
      const targetMonthShort = monthNamesShort[targetMonth - 1] || tMonthStr;
      const daysInTargetMonth = new Date(targetYear, targetMonth, 0).getDate();

      const targetMonthWeeks = [
        { wNum: 1, startDay: 1, endDay: 7 },
        { wNum: 2, startDay: 8, endDay: 14 },
        { wNum: 3, startDay: 15, endDay: 21 },
        { wNum: 4, startDay: 22, endDay: 28 },
        { wNum: 5, startDay: 29, endDay: daysInTargetMonth }
      ];

      const weekDataList = targetMonthWeeks.map(w => {
        const sStr = `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(w.startDay).padStart(2, '0')}`;
        const eStr = `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(w.endDay).padStart(2, '0')}`;
        
        const shortLabel = `Sem. ${w.wNum} (${w.startDay}-${w.endDay} ${targetMonthShort})`;
        const fullLabel = `Semana ${w.wNum} (${String(w.startDay).padStart(2, '0')} al ${String(w.endDay).padStart(2, '0')} de ${targetMonthName} ${targetYear})`;

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

        return {
          name: shortLabel,
          fullName: fullLabel,
          Monitoreadas: monitoredCount,
          Faltantes: faltanCount,
          Meta: totalIpressCount,
          Porcentaje: pct,
          TotalMuestras: samplesCount
        };
      });

      setGestionStats({
        totalIpress: totalIpressCount,
        monitoreosTotal: monitoreosEnPeriodo.length,
        monitoreosHistoricos: totalMonitoreosHistorico,
        monitoreoSemanal: totalIpressConMonitoreoSemanal,
        conDiagnosticoTotal: conDiag,
        faltanDiagnostico: faltanDiag,
        chartMonthTitle: `${targetMonthName} ${targetYear}`,
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
  }, [user, dashboardRedFilter, dateFrom, dateTo, usersList, datesInitialized]);

  // Exportar Detalle de Diagnósticos simple a Excel
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

  // Filtrar el gráfico horizontal de IPRESS por Red:
  // Si está en 'Todas', muestra todas las redes; si se seleccionó una Red, muestra ÚNICAMENTE esa red
  const displayIpressPorRed = targetRed === 'Todas'
    ? gestionStats.ipressPorRed
    : gestionStats.ipressPorRed.filter(item => matchRedName(item.red, targetRed));

  const maxWeeklyY = Math.max(
    gestionStats.totalIpress, 
    ...gestionStats.weeklyComplianceData.map(d => Math.max(d.Monitoreadas, d.Faltantes, d.Meta || 0)), 
    10
  ) + 5;

  const maxHorizontalX = Math.max(
    ...displayIpressPorRed.map(d => Math.max(d.cantidad, d.monitoreos)),
    10
  ) + 15;

  const complianceAvg = gestionStats.weeklyComplianceData.length > 0
    ? Math.round(
        gestionStats.weeklyComplianceData.reduce((acc, curr) => acc + curr.Porcentaje, 0) / 
        gestionStats.weeklyComplianceData.length
      )
    : 0;

  // -------------------------------------------------------------
  // EXPORTACIÓN COMPLETA DEL DASHBOARD A EXCEL CON GRÁFICOS INCRUSTADOS
  // -------------------------------------------------------------
  const exportDashboardExcel = async () => {
    setIsExportingExcel(true);
    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Sistema de Control IPRESS - GERESA Cusco';
      workbook.created = new Date();

      // Capturar gráficos renderizados en el DOM como imágenes PNG en alta definición
      const chartWeeklyPng = await captureChartSvgAsBase64('chart-container-weekly');
      const chartIpressRedPng = await captureChartSvgAsBase64('chart-container-ipress-red');
      const chartCoberturaPng = await captureChartSvgAsBase64('chart-container-cobertura');

      // -------------------------------------------------------------
      // HOJA 1: DASHBOARD DE GESTIÓN (DATOS + GRÁFICOS DINÁMICOS)
      // -------------------------------------------------------------
      const wsDashboard = workbook.addWorksheet('Dashboard de Gestión', {
        views: [{ showGridLines: true }]
      });

      // Anchos de columnas
      wsDashboard.columns = [
        { width: 4 },  // A
        { width: 28 }, // B
        { width: 22 }, // C
        { width: 22 }, // D
        { width: 22 }, // E
        { width: 22 }, // F
        { width: 20 }, // G
        { width: 20 }, // H
      ];

      // Banner institucional de cabecera
      wsDashboard.mergeCells('B2:H3');
      const titleCell = wsDashboard.getCell('B2');
      titleCell.value = 'SISTEMA DE CONTROL IPRESS - REPORTE GERENCIAL DE GESTIÓN Y CALIDAD DE AGUA';
      titleCell.font = { name: 'Arial', size: 13, bold: true, color: { argb: 'FFFFFFFF' } };
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
      titleCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1E40AF' }
      };

      // Fila de parámetros del filtro
      wsDashboard.getCell('B4').value = `Unidad Ejecutora: ${targetRed}`;
      wsDashboard.getCell('B4').font = { bold: true, color: { argb: 'FF1E293B' }, size: 10 };
      wsDashboard.getCell('D4').value = `Rango de Fechas: ${dateFrom || 'Inicio'} al ${dateTo || 'Fin'}`;
      wsDashboard.getCell('D4').font = { bold: true, color: { argb: 'FF1E293B' }, size: 10 };
      wsDashboard.getCell('F4').value = `Fecha de Emisión: ${new Date().toLocaleString('es-PE')}`;
      wsDashboard.getCell('F4').font = { color: { argb: 'FF64748B' }, size: 9 };

      // 5 Tarjetas KPI formateadas
      const kpiDefinitions = [
        { col: 'B', title: unitEstablecimientoTitle, val: gestionStats.totalIpress, color: 'FFDBEAFE', textColor: 'FF1E40AF' },
        { col: 'C', title: 'Registros de Monitoreos', val: gestionStats.monitoreosTotal, color: 'FFFEF3C7', textColor: 'FF92400E' },
        { col: 'D', title: 'IPRESS c/ Monitoreo (7d)', val: gestionStats.monitoreoSemanal, color: 'FFD1FAE5', textColor: 'FF065F46' },
        { col: 'E', title: 'IPRESS con Diagnósticos', val: gestionStats.conDiagnosticoTotal, color: 'FFE0E7FF', textColor: 'FF3730A3' },
        { col: 'F', title: 'Falta Diagnóstico', val: gestionStats.faltanDiagnostico, color: 'FFFEE2E2', textColor: 'FF991B1B' },
      ];

      kpiDefinitions.forEach(kpi => {
        const cellHeader = wsDashboard.getCell(`${kpi.col}6`);
        cellHeader.value = kpi.title;
        cellHeader.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF475569' } };
        cellHeader.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        cellHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: kpi.color } };
        cellHeader.border = { top: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };

        const cellVal = wsDashboard.getCell(`${kpi.col}7`);
        cellVal.value = kpi.val;
        cellVal.font = { name: 'Arial', size: 16, bold: true, color: { argb: kpi.textColor } };
        cellVal.alignment = { horizontal: 'center', vertical: 'middle' };
        cellVal.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: kpi.color } };
        cellVal.border = { bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
      });

      // SECCIÓN 1: CUMPLIMIENTO SEMANAL
      let currentRow = 9;
      wsDashboard.getCell(`B${currentRow}`).value = `1. CUMPLIMIENTO SEMANAL DE MONITOREO (${gestionStats.chartMonthTitle}) - ${targetRed === 'Todas' ? 'Región Cusco' : targetRed}`;
      wsDashboard.getCell(`B${currentRow}`).font = { bold: true, size: 11, color: { argb: 'FF1E40AF' } };
      currentRow++;

      const weeklyHeaders = ['Semana', 'Período', 'Meta (IPRESS)', 'Monitoreadas', 'Faltantes', '% Cumplimiento', 'Total Muestras'];
      const cols = ['B', 'C', 'D', 'E', 'F', 'G', 'H'];
      weeklyHeaders.forEach((h, idx) => {
        const cell = wsDashboard.getCell(`${cols[idx]}${currentRow}`);
        cell.value = h;
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
      });
      currentRow++;

      gestionStats.weeklyComplianceData.forEach(row => {
        const values = [row.name, row.fullName, row.Meta, row.Monitoreadas, row.Faltantes, `${row.Porcentaje}%`, row.TotalMuestras];
        values.forEach((v, idx) => {
          const cell = wsDashboard.getCell(`${cols[idx]}${currentRow}`);
          cell.value = v;
          cell.alignment = { horizontal: idx >= 2 ? 'center' : 'left', vertical: 'middle' };
          cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
        });
        currentRow++;
      });

      currentRow += 1;

      // Incrustar imagen del gráfico semanal
      if (chartWeeklyPng) {
        const imgId = workbook.addImage({ base64: chartWeeklyPng, extension: 'png' });
        wsDashboard.addImage(imgId, {
          tl: { col: 1, row: currentRow - 1 },
          ext: { width: 680, height: 280 }
        });
        currentRow += 16;
      }

      currentRow += 2;

      // SECCIÓN 2: IPRESS POR UNIDAD EJECUTORA & COBERTURA
      wsDashboard.getCell(`B${currentRow}`).value = `2. ESTADÍSTICAS POR UNIDAD EJECUTORA Y COBERTURA (${targetRed === 'Todas' ? 'Región Cusco' : targetRed})`;
      wsDashboard.getCell(`B${currentRow}`).font = { bold: true, size: 11, color: { argb: 'FF1E40AF' } };
      currentRow++;

      // Tabla 2: IPRESS por Red
      const redHeaders = ['Unidad Ejecutora', `Cant. ${unitName}`, 'Monitoreos Totales'];
      const redCols = ['B', 'C', 'D'];
      redHeaders.forEach((h, idx) => {
        const cell = wsDashboard.getCell(`${redCols[idx]}${currentRow}`);
        cell.value = h;
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3B82F6' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
      });

      // Tabla 3: Cobertura
      const cobHeaders = ['Estado de Diagnóstico', 'Cantidad IPRESS', 'Porcentaje'];
      const cobCols = ['F', 'G', 'H'];
      cobHeaders.forEach((h, idx) => {
        const cell = wsDashboard.getCell(`${cobCols[idx]}${currentRow}`);
        cell.value = h;
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF10B981' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
      });
      currentRow++;

      const maxSubRows = Math.max(displayIpressPorRed.length, gestionStats.coberturaData.length);
      for (let i = 0; i < maxSubRows; i++) {
        const redRow = displayIpressPorRed[i];
        if (redRow) {
          wsDashboard.getCell(`B${currentRow}`).value = redRow.red;
          wsDashboard.getCell(`C${currentRow}`).value = redRow.cantidad;
          wsDashboard.getCell(`D${currentRow}`).value = redRow.monitoreos;
          ['B', 'C', 'D'].forEach(c => {
            const cell = wsDashboard.getCell(`${c}${currentRow}`);
            cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
            if (c !== 'B') cell.alignment = { horizontal: 'center' };
          });
        }

        const cobRow = gestionStats.coberturaData[i];
        if (cobRow) {
          const pct = gestionStats.totalIpress > 0 ? Math.round((cobRow.value / gestionStats.totalIpress) * 100) : 0;
          wsDashboard.getCell(`F${currentRow}`).value = cobRow.name;
          wsDashboard.getCell(`G${currentRow}`).value = cobRow.value;
          wsDashboard.getCell(`H${currentRow}`).value = `${pct}%`;
          ['F', 'G', 'H'].forEach(c => {
            const cell = wsDashboard.getCell(`${c}${currentRow}`);
            cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
            if (c !== 'F') cell.alignment = { horizontal: 'center' };
          });
        }
        currentRow++;
      }

      currentRow += 1;

      // Incrustar imágenes de los gráficos de barras y de cobertura
      if (chartIpressRedPng || chartCoberturaPng) {
        if (chartIpressRedPng) {
          const imgId = workbook.addImage({ base64: chartIpressRedPng, extension: 'png' });
          wsDashboard.addImage(imgId, {
            tl: { col: 1, row: currentRow - 1 },
            ext: { width: 360, height: 260 }
          });
        }
        if (chartCoberturaPng) {
          const imgId = workbook.addImage({ base64: chartCoberturaPng, extension: 'png' });
          wsDashboard.addImage(imgId, {
            tl: { col: 5, row: currentRow - 1 },
            ext: { width: 340, height: 260 }
          });
        }
        currentRow += 15;
      }

      // -------------------------------------------------------------
      // HOJA 2: DETALLE DIAGNÓSTICOS
      // -------------------------------------------------------------
      const wsDiag = workbook.addWorksheet('Detalle de Diagnósticos', {
        views: [{ showGridLines: true }]
      });
      wsDiag.columns = [
        { header: 'N°', key: 'num', width: 6 },
        { header: 'Unidad Ejecutora', key: 'red', width: 28 },
        { header: 'IPRESS / Establecimiento', key: 'ipress', width: 36 },
        { header: '¿Tiene Diagnóstico?', key: 'tieneDiag', width: 22 },
      ];
      wsDiag.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      wsDiag.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } };
      wsDiag.getRow(1).alignment = { horizontal: 'center' };

      gestionStats.detalleList.forEach((item, index) => {
        const row = wsDiag.addRow({
          num: index + 1,
          red: item.red,
          ipress: item.ipress,
          tieneDiag: item.tieneDiag ? 'SÍ' : 'NO'
        });
        row.getCell('num').alignment = { horizontal: 'center' };
        row.getCell('tieneDiag').alignment = { horizontal: 'center' };
        if (item.tieneDiag) {
          row.getCell('tieneDiag').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCFCE7' } };
          row.getCell('tieneDiag').font = { bold: true, color: { argb: 'FF166534' } };
        } else {
          row.getCell('tieneDiag').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
          row.getCell('tieneDiag').font = { bold: true, color: { argb: 'FF991B1B' } };
        }
      });

      // -------------------------------------------------------------
      // HOJA 3: DETALLE MONITOREOS
      // -------------------------------------------------------------
      const wsMon = workbook.addWorksheet('Detalle de Monitoreos', {
        views: [{ showGridLines: true }]
      });
      wsMon.columns = [
        { header: 'N°', key: 'num', width: 6 },
        { header: 'Fecha', key: 'fecha', width: 14 },
        { header: 'Unidad Ejecutora', key: 'red', width: 26 },
        { header: 'IPRESS', key: 'ipress', width: 34 },
        { header: 'Código RENIPRESS', key: 'renipress', width: 18 },
        { header: 'Cloro Residual (mg/L)', key: 'cloro', width: 22 },
        { header: 'pH', key: 'ph', width: 12 },
        { header: 'Turbiedad (UNT)', key: 'turbiedad', width: 16 },
        { header: 'Temperatura (°C)', key: 'temp', width: 16 },
      ];
      wsMon.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      wsMon.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };
      wsMon.getRow(1).alignment = { horizontal: 'center' };

      const allRecords = getRecords().filter(r => r.estado !== 'Inactivo' && r.tipo === 'monitoreo');
      let monIdx = 1;
      allRecords.forEach(r => {
        const userObj = usersList.find(u => 
          (u.codigoRenipress && r.codigoRenipress && matchRenipress(u.codigoRenipress, r.codigoRenipress)) ||
          (u.usuario && r.nombreIpress && String(u.usuario).trim().toLowerCase() === String(r.nombreIpress).trim().toLowerCase()) ||
          (u.nombreIpress && r.nombreIpress && String(u.nombreIpress).trim().toLowerCase() === String(r.nombreIpress).trim().toLowerCase())
        );
        const rRed = userObj?.red || r.unidadEjecutora || 'Sin Red';
        if (targetRed !== 'Todas' && !matchRedName(rRed, targetRed)) return;
        
        const dStr = extractDateHelper(r.fecha) || extractDateHelper(r.fechaRegistro);
        if (dateFrom && dStr && dStr < dateFrom) return;
        if (dateTo && dStr && dStr > dateTo) return;

        const row = wsMon.addRow({
          num: monIdx++,
          fecha: dStr || '',
          red: rRed,
          ipress: r.nombreIpress || '',
          renipress: r.codigoRenipress || '',
          cloro: (r as any).cloroResidual ?? r.cloro ?? '',
          ph: r.ph ?? '',
          turbiedad: r.turbiedad ?? '',
          temp: r.temperatura ?? '',
        });
        row.getCell('num').alignment = { horizontal: 'center' };
        row.getCell('fecha').alignment = { horizontal: 'center' };
        row.getCell('renipress').alignment = { horizontal: 'center' };
        row.getCell('cloro').alignment = { horizontal: 'center' };
        row.getCell('ph').alignment = { horizontal: 'center' };
        row.getCell('turbiedad').alignment = { horizontal: 'center' };
        row.getCell('temp').alignment = { horizontal: 'center' };
      });

      // Descargar archivo Excel generado
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      const safeRedName = (targetRed || 'General').replace(/[^a-zA-Z0-9_-]/g, '_');
      link.download = `Dashboard_Gestion_${safeRedName}_${dateFrom || 'inicio'}_al_${dateTo || 'fin'}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Error exportando dashboard a Excel:', err);
      alert('Ocurrió un error al generar el archivo Excel con gráficos.');
    } finally {
      setIsExportingExcel(false);
    }
  };

  return (
    <div className="dashboard-fullwidth animate-fade-in">
      {/* HEADER PRINCIPAL */}
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h1 style={{ color: 'var(--primary)', marginBottom: '0.5rem' }}>Sistema de Control IPRESS</h1>
        <p style={{ color: 'var(--text-muted)' }}>Dashboard y Resumen de Operaciones</p>
      </div>

      {/* SECCIÓN ESTADÍSTICAS DE GESTIÓN (GERESA / REDES) */}
      <div style={{ marginBottom: '3rem' }}>
        {/* BARRA DE FILTROS EN UNA SOLA LÍNEA */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1.25rem',
          marginBottom: '1.5rem',
          padding: '1rem 1.5rem',
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.05)',
          border: '1px solid #e2e8f0',
          width: '100%'
        }}>
          {/* TÍTULO DE LA SECCIÓN */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 'fit-content' }}>
            <div style={{ padding: '0.45rem', backgroundColor: 'rgba(37, 99, 235, 0.1)', borderRadius: '8px', color: 'var(--primary)', display: 'flex', alignItems: 'center' }}>
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

          {/* CONTENEDOR DE FILTROS Y BOTÓN EXPORTAR EXCEL */}
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            {/* FILTRO 1: UNIDAD EJECUTORA */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: 600 }}>
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
                    fontSize: '0.875rem',
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
                  fontSize: '0.875rem',
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

            {/* FILTRO 2: RANGO DE FECHA (SOLO INICIO Y FIN, CON VALIDACIÓN MÍNIMA DE DB) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                Rango de fecha:
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', backgroundColor: '#f8fafc', padding: '0.3rem 0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>Inicio:</span>
                <input
                  type="date"
                  value={dateFrom}
                  min={dbMinDate}
                  max={dateTo || dbMaxDate || '2030-12-31'}
                  onChange={(e) => handleDateFromChange(e.target.value)}
                  style={{
                    padding: '0.35rem 0.5rem',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.825rem',
                    outline: 'none',
                    backgroundColor: '#ffffff'
                  }}
                  title={`Fecha inicial (Mínima registrada: ${dbMinDate})`}
                />
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500, margin: '0 0.15rem' }}>Fin:</span>
                <input
                  type="date"
                  value={dateTo}
                  min={dbMinDate}
                  max={dbMaxDate || '2030-12-31'}
                  onChange={(e) => handleDateToChange(e.target.value)}
                  style={{
                    padding: '0.35rem 0.5rem',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.825rem',
                    outline: 'none',
                    backgroundColor: '#ffffff'
                  }}
                  title={`Fecha final (No puede ser menor a la fecha más antigua registrada: ${dbMinDate})`}
                />
              </div>
            </div>

            {/* BOTÓN: EXPORTAR DASHBOARD COMPLETO A EXCEL */}
            <button
              onClick={exportDashboardExcel}
              disabled={isExportingExcel}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                backgroundColor: isExportingExcel ? '#94a3b8' : '#059669',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '0.45rem 0.9rem',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: isExportingExcel ? 'not-allowed' : 'pointer',
                boxShadow: '0 2px 4px rgba(5, 150, 105, 0.2)',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap'
              }}
              title="Exportar todo el dashboard actual con gráficos a Excel (.xlsx)"
            >
              <FileSpreadsheet size={17} />
              <span>{isExportingExcel ? 'Generando Excel...' : 'Exportar Dashboard Excel'}</span>
            </button>
          </div>
        </div>

        {/* 5 TARJETAS KPI EN UNA SOLA LÍNEA HORIZONTAL COMPLETA */}
        <div className="dashboard-kpi-row">
          {/* 1. Establecimientos Región Cusco / Red */}
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

          {/* 2. Registros de Monitoreos */}
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
                Registros de Monitoreos
              </p>
              <h3 style={{ margin: '0.2rem 0 0 0', fontSize: '1.6rem', color: 'var(--primary-dark)', fontWeight: 700 }}>
                {gestionStats.monitoreosTotal}
              </h3>
              {gestionStats.monitoreosHistoricos !== gestionStats.monitoreosTotal && (
                <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  Total histórico: {gestionStats.monitoreosHistoricos}
                </p>
              )}
            </div>
          </div>

          {/* 3. IPRESS con Monitoreos (Últimos 7 días) */}
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
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={isHospital ? 'Hospitales con Monitoreos (Últimos 7 días)' : 'IPRESS con Monitoreos (Últimos 7 días)'}>
                {isHospital ? 'Hospitales c/ Monitoreo (7d)' : 'IPRESS con Monitoreos (Últimos 7 días)'}
              </p>
              <h3 style={{ margin: '0.2rem 0 0 0', fontSize: '1.6rem', color: '#10b981', fontWeight: 700 }}>
                {gestionStats.monitoreoSemanal}
              </h3>
            </div>
          </div>

          {/* 4. IPRESS con Diagnósticos */}
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
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={isHospital ? 'Hospitales con Diagnósticos' : 'IPRESS con Diagnósticos'}>
                {isHospital ? 'Hospitales con Diagnósticos' : 'IPRESS con Diagnósticos'}
              </p>
              <h3 style={{ margin: '0.2rem 0 0 0', fontSize: '1.6rem', color: 'var(--primary-dark)', fontWeight: 700 }}>
                {gestionStats.conDiagnosticoTotal}
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

        {/* GRÁFICO 1: ACTIVIDAD RECIENTE (MES MÁS ACTUAL) - CUMPLIMIENTO SEMANAL DE MONITOREO */}
        <div id="chart-container-weekly" className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <BarChart3 size={20} color="var(--primary)" />
                <h3 style={{ margin: 0, color: 'var(--primary-dark)', fontSize: '1.15rem' }}>
                  Actividad Reciente ({gestionStats.chartMonthTitle}) - Cumplimiento Semanal de Monitoreo ({targetRed === 'Todas' ? 'Región Cusco' : targetRed})
                </h3>
              </div>
              <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Evaluación mensual por semanas de {gestionStats.chartMonthTitle} en {targetRed === 'Todas' ? 'toda la Región Cusco' : targetRed} (Meta: {gestionStats.totalIpress} {unitName} semanales)
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
            {/* GRÁFICO 2: IPRESS POR UNIDAD EJECUTORA (FILTRADO EXACTO SEGÚN RED SELECCIONADA) */}
            <div id="chart-container-ipress-red" className="glass-panel" style={{ padding: '1.5rem' }}>
              <h4 style={{ margin: '0 0 1rem 0', color: 'var(--text)' }}>
                IPRESS por Unidad Ejecutora ({targetRed === 'Todas' ? 'Región Cusco' : targetRed})
              </h4>
              <div style={{ height: displayIpressPorRed.length <= 1 ? '200px' : '300px', width: '100%' }}>
                {displayIpressPorRed.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={displayIpressPorRed} layout="vertical" margin={{ top: 5, right: 40, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
                      <XAxis type="number" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} domain={[0, maxHorizontalX]} />
                      <YAxis dataKey="red" type="category" width={140} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <Tooltip 
                        content={<CustomBarTooltip />}
                        cursor={{ fill: '#f1f5f9' }}
                      />
                      <Legend />
                      <Bar dataKey="cantidad" name={`Cant. ${unitName}`} fill="var(--primary)" radius={[0, 4, 4, 0]} barSize={displayIpressPorRed.length <= 1 ? 22 : 15}>
                        <LabelList dataKey="cantidad" position="right" fill="#64748b" fontSize={11} fontWeight={500} />
                      </Bar>
                      <Bar dataKey="monitoreos" name="Monitoreos Totales" fill="#f59e0b" radius={[0, 4, 4, 0]} barSize={displayIpressPorRed.length <= 1 ? 22 : 15}>
                        <LabelList dataKey="monitoreos" position="right" fill="#64748b" fontSize={11} fontWeight={500} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                    No hay datos disponibles para la unidad seleccionada.
                  </div>
                )}
              </div>
            </div>

            {/* GRÁFICO 3: COBERTURA DE DIAGNÓSTICOS */}
            <div id="chart-container-cobertura" className="glass-panel" style={{ padding: '1.5rem', position: 'relative' }}>
              <h4 style={{ margin: '0 0 1rem 0', color: 'var(--text)' }}>
                Cobertura de Diagnósticos ({targetRed === 'Todas' ? 'Región Cusco' : targetRed})
              </h4>
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
