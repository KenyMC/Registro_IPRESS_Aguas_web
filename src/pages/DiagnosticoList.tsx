import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Edit2, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { getRecords, saveRecord, getRecordById, LocalRecord } from '../services/storage';
import { syncEntry } from '../services/api';

export const DiagnosticoList = () => {
  const [records, setRecords] = useState<LocalRecord[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    loadRecords();
  }, []);

  const loadRecords = () => {
    const allRecords = getRecords().filter(r => r.tipo === 'diagnostico' && r.estado !== 'Inactivo');
    // Sort by date descending
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
      <div className="flex-between" style={{ marginBottom: '2rem' }}>
        <h2 className="section-title" style={{ margin: 0, border: 'none' }}>Registros de Diagnóstico</h2>
        <Link to="/diagnostico/nuevo" className="btn btn-primary">
          <Plus size={20} /> Agregar Registro
        </Link>
      </div>

      <div className="table-container">
        {records.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            No hay registros de diagnóstico almacenados localmente.
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>IPRESS</th>
                <th>Unidad Ejecutora</th>
                <th>Estado Sync</th>
                <th style={{ textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {records.map(record => (
                <tr key={record.id}>
                  <td>{new Date(record.fechaRegistro).toLocaleDateString()}</td>
                  <td style={{ fontWeight: 500 }}>{record.nombreIpress}</td>
                  <td>{record.unidadEjecutora}</td>
                  <td>
                    {record.isSynced ? (
                      <span className="status-badge success"><CheckCircle size={14}/> Sincronizado</span>
                    ) : (
                      <span className="status-badge warning"><XCircle size={14}/> Pendiente</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button onClick={() => navigate(`/diagnostico/editar/${record.id}`)} className="btn-icon" title="Actualizar" style={{ color: 'var(--primary)' }}>
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
