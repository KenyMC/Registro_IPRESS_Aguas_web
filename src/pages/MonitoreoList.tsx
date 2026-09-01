import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit2, Trash2, CheckCircle, XCircle, Filter, ChevronLeft, ChevronRight, Download, Loader2 } from 'lucide-react';
import { getRecords, saveRecord, getRecordById, LocalRecord } from '../services/storage';
import { syncEntry } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { usePdfDownloader } from '../utils/usePdfDownloader';

const extractDate = (val: string | undefined) => {
  if (!val) return null;
  if (typeof val !== 'string') {
     try { return new Date(val).toISOString().split('T')[0]; } catch(e) { return null; }
  }
  if (val.match(/^\d{4}-\d{2}-\d{2}/)) return val.substring(0, 10);
  if (val.match(/^\d{2}-\d{2}-\d{4}/)) {
    const parts = val.split(' ')[0].split('-');
    if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  if (val.includes('T')) return val.split('T')[0];
  try {
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  } catch(e) {}
  return null;
};

export const MonitoreoList = () => {
  const [records, setRecords] = useState<LocalRecord[]>([]);
  const [filterDate, setFilterDate] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const recordsPerPage = 50;
  const navigate = useNavigate();
  const { user } = useAuth();
  const { downloadPdf, downloadingId } = usePdfDownloader();

  // Función para renderizar 0 de forma correcta sin ser evaluado como "falsy" en el || '-'
  const renderValue = (val: any) => {
    return (val !== undefined && val !== null && val !== '') ? val : '-';
  };

  useEffect(() => {
    loadRecords();
    
    // Escuchar actualizaciones de sincronización de fondo
    window.addEventListener('recordsUpdated', loadRecords);
    return () => {
      window.removeEventListener('recordsUpdated', loadRecords);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterDate, user]);

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filterDate]);

  const loadRecords = () => {
    if (!user) return;

    let allRecords = getRecords().filter(r => r.tipo === 'monitoreo' && r.estado !== 'Inactivo');
    
    // RBAC Filter
    if (user.rol !== 'Administra todas las Redes') {
      if (user.rol.includes('Red')) {
        allRecords = allRecords.filter(r => r.unidadEjecutora === user.red);
      } else if (user.rol === 'IPRESS' || user.rol === 'Hospital') {
        // IPRESS/Hospital User
        allRecords = allRecords.filter(r => {
          if (!user.codigoRenipress) return String(r.nombreIpress).trim().toLowerCase() === String(user.usuario).trim().toLowerCase();
          
          const uCode = String(user.codigoRenipress).trim();
          const rCode = String(r.codigoRenipress || '').trim();
          
          return uCode === rCode || 
                 (uCode !== '' && rCode !== '' && !isNaN(Number(uCode)) && !isNaN(Number(rCode)) && Number(uCode) === Number(rCode)) ||
                 (String(r.nombreIpress).trim().toLowerCase() === String(user.usuario).trim().toLowerCase());
        });
      }
    }
    
    if (filterDate) {
      allRecords = allRecords.filter(r => {
        const dateToFilter = extractDate(r.fecha) || extractDate(r.fechaRegistro);
        return dateToFilter === filterDate;
      });
    }

    allRecords.sort((a, b) => new Date(b.fechaRegistro).getTime() - new Date(a.fechaRegistro).getTime());
    setRecords(allRecords);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('¿Está seguro de eliminar este registro?')) {
      const record = getRecordById(id);
      if (record) {
        const updatedRecord: LocalRecord = { ...record, estado: 'Inactivo' };
        saveRecord(updatedRecord);
        loadRecords();
        await syncEntry(updatedRecord);
      }
    }
  };

  return (
    <div className="container-fluid animate-fade-in">
      <div className="flex-between" style={{ marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h2 className="section-title" style={{ margin: 0, border: 'none' }}>Registros de Monitoreo</h2>
        
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#f8fafc', padding: '0.25rem 0.5rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <Filter size={16} style={{ color: 'var(--text-muted)' }} />
            <label style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: 0, fontWeight: 500 }}>Buscar por Fecha:</label>
            <input 
              type="date" 
              className="form-control" 
              style={{ padding: '0.25rem 0.5rem', width: 'auto', border: 'none', backgroundColor: 'transparent', outline: 'none' }} 
              value={filterDate} 
              onChange={(e) => setFilterDate(e.target.value)} 
            />
            {filterDate && (
              <button onClick={() => setFilterDate('')} className="btn-icon" style={{ color: 'var(--danger)', padding: '0.25rem' }} title="Limpiar filtro">
                <XCircle size={16} />
              </button>
            )}
          </div>
          <button onClick={() => navigate('/monitoreo/nuevo')} className="btn btn-primary">
            <Plus size={18} /> Agregar Registro
          </button>
        </div>
      </div>

      <div className="table-container">
        {records.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            No hay registros de monitoreo almacenados localmente.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
          <table>
            <thead>
              <tr>
                <th style={{ width: '50px', textAlign: 'center' }}>Nro.</th>
                <th>Fecha</th>
                <th>Unidad Ejecutora</th>
                <th>Nombre de la IPRESS</th>
                <th>Puntos de Monitoreo</th>
                <th>Cloro Residual</th>
                <th>Temperatura</th>
                <th>pH</th>
                <th>Turbiedad</th>
                <th>Conductividad</th>
                <th>Valor de STD</th>
                <th>Estado Sync</th>
                <th style={{ textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {records.slice((currentPage - 1) * recordsPerPage, currentPage * recordsPerPage).map((record, index) => (
                <tr key={record.id}>
                  <td style={{ textAlign: 'center', fontWeight: 500, color: 'var(--text-muted)' }}>
                    {(currentPage - 1) * recordsPerPage + index + 1}
                  </td>
                  <td>
                    {(() => {
                      let dateStr = extractDate(record.fecha);
                      if (!dateStr) dateStr = extractDate(record.fechaRegistro);
                      if (!dateStr) return '-';
                      const parts = dateStr.split('-');
                      return `${parts[2]}/${parts[1]}/${parts[0]}`;
                    })()}
                  </td>
                  <td style={{ fontWeight: 500 }}>{record.unidadEjecutora}</td>
                  <td style={{ fontWeight: 500 }}>{record.nombreIpress}</td>
                  <td>{renderValue(record.puntosMonitoreo)}</td>
                  <td>{renderValue(record.cloro)}</td>
                  <td>{renderValue(record.temperatura)}</td>
                  <td>{renderValue(record.ph)}</td>
                  <td>{renderValue(record.turbiedad)}</td>
                  <td>{renderValue(record.conductividad)}</td>
                  <td>{renderValue(record.std)}</td>
                  <td>
                    {record.isSynced ? (
                      <span className="status-badge success"><CheckCircle size={14}/> Sincronizado</span>
                    ) : (
                      <span className="status-badge warning"><XCircle size={14}/> Pendiente</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                      <button onClick={() => navigate(`/monitoreo/editar/${record.id}`)} className="btn-icon" title="Actualizar" style={{ color: 'var(--primary)' }}>
                        <Edit2 size={18} />
                      </button>
                      <button onClick={() => handleDelete(record.id)} className="btn-icon" title="Eliminar" style={{ color: 'var(--danger)' }}>
                        <Trash2 size={18} />
                      </button>
                      <button 
                        onClick={() => downloadPdf(record)} 
                        className="btn-icon" 
                        title="Descargar Monitoreo" 
                        style={{ color: '#d4af37' }}
                        disabled={downloadingId === record.id}
                      >
                        {downloadingId === record.id ? <Loader2 size={18} className="spin" /> : <Download size={18} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {records.length > recordsPerPage && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', borderTop: '1px solid var(--border)', backgroundColor: 'white', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px' }}>
              <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                Mostrando {(currentPage - 1) * recordsPerPage + 1} al {Math.min(currentPage * recordsPerPage, records.length)} de {records.length} registros
              </span>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button 
                  disabled={currentPage === 1} 
                  onClick={() => setCurrentPage(p => p - 1)} 
                  className="btn-icon"
                  style={{ border: '1px solid var(--border)', padding: '0.25rem', opacity: currentPage === 1 ? 0.5 : 1, cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
                >
                   <ChevronLeft size={20} />
                </button>
                <button 
                  disabled={currentPage === Math.ceil(records.length / recordsPerPage)} 
                  onClick={() => setCurrentPage(p => p + 1)} 
                  className="btn-icon"
                  style={{ border: '1px solid var(--border)', padding: '0.25rem', opacity: currentPage === Math.ceil(records.length / recordsPerPage) ? 0.5 : 1, cursor: currentPage === Math.ceil(records.length / recordsPerPage) ? 'not-allowed' : 'pointer' }}
                >
                   <ChevronRight size={20} />
                </button>
              </div>
            </div>
          )}
          </div>
        )}
      </div>
    </div>
  );
};
