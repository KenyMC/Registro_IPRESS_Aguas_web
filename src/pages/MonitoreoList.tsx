import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Edit2, Trash2, CheckCircle, XCircle, Filter } from 'lucide-react';
import { getRecords, saveRecord, getRecordById, LocalRecord } from '../services/storage';
import { syncEntry } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

export const MonitoreoList = () => {
  const [records, setRecords] = useState<LocalRecord[]>([]);
  const [filterDate, setFilterDate] = useState<string>('');
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    loadRecords();
    
    // Escuchar actualizaciones de sincronización de fondo
    window.addEventListener('recordsUpdated', loadRecords);
    return () => {
      window.removeEventListener('recordsUpdated', loadRecords);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterDate, user]);

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
    <div className="container animate-fade-in">
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

          <Link to="/monitoreo/nuevo" className="btn btn-primary">
            <Plus size={20} /> Agregar Registro
          </Link>
        </div>
      </div>

      <div className="table-container">
        {records.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            No hay registros de monitoreo almacenados localmente.
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>IPRESS</th>
                <th>Cloro (mg/L)</th>
                <th>Estado Sync</th>
                <th style={{ textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {records.map(record => (
                <tr key={record.id}>
                  <td>
                    {(() => {
                      const dVal = record.fecha || record.fechaRegistro;
                      if (!dVal) return '-';
                      if (typeof dVal === 'string' && dVal.match(/^\d{2}-\d{2}-\d{4}/)) {
                        return dVal.split(' ')[0].replace(/-/g, '/');
                      }
                      if (typeof dVal === 'string' && dVal.match(/^\d{4}-\d{2}-\d{2}/)) {
                        const datePart = dVal.split('T')[0].split(' ')[0];
                        const parts = datePart.split('-');
                        return `${parts[2]}/${parts[1]}/${parts[0]}`;
                      }
                      try {
                        const d = new Date(dVal);
                        return isNaN(d.getTime()) ? String(dVal).split(' ')[0] : d.toLocaleDateString();
                      } catch(e) {
                        return String(dVal).split(' ')[0];
                      }
                    })()}
                  </td>
                  <td style={{ fontWeight: 500 }}>{record.nombreIpress}</td>
                  <td>{record.cloro !== undefined && record.cloro !== null && record.cloro !== '' ? record.cloro : '-'}</td>
                  <td>
                    {record.isSynced ? (
                      <span className="status-badge success"><CheckCircle size={14}/> Sincronizado</span>
                    ) : (
                      <span className="status-badge warning"><XCircle size={14}/> Pendiente</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button onClick={() => navigate(`/monitoreo/editar/${record.id}`)} className="btn-icon" title="Actualizar" style={{ color: 'var(--primary)' }}>
                      <Edit2 size={18} />
                    </button>
                    <button onClick={() => handleDelete(record.id)} className="btn-icon" title="Eliminar" style={{ color: 'var(--danger)' }}>
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
