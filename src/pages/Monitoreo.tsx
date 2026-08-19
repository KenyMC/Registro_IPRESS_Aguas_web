import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { syncEntry, SyncRequest } from '../services/api';
import { saveRecord, getRecordById, LocalRecord } from '../services/storage';
import { Save, RefreshCw, ArrowLeft } from 'lucide-react';

const UNIDADES_EJECUTORAS = [
  "Red Cusco Norte", "Red Cusco Sur", "Red Cusco VRAEM", 
  "Red CCE", "Red Chumbivilcas", "Red La Convencion", "Hospital"
];

export const Monitoreo = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [formData, setFormData] = useState<Partial<SyncRequest>>({
    tipo: 'monitoreo',
    estado: 'Activo',
    unidadEjecutora: UNIDADES_EJECUTORAS[0],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (id) {
      const existing = getRecordById(id);
      if (existing) setFormData(existing);
    }
  }, [id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg('');

    const payload: SyncRequest = {
      ...(formData as SyncRequest),
      uuid: formData.uuid || crypto.randomUUID(),
      fechaRegistro: formData.fechaRegistro || new Date().toISOString(),
    };

    const isSynced = await syncEntry(payload);
    
    const localRecord: LocalRecord = {
      ...payload,
      id: id || crypto.randomUUID(),
      isSynced
    };
    
    saveRecord(localRecord);
    setIsSubmitting(false);

    if (!isSynced) {
      alert('Se guardó localmente, pero hubo un error al sincronizar con el servidor.');
    }

    navigate('/monitoreo');
  };

  return (
    <div className="container animate-fade-in">
      <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
        <button type="button" onClick={() => navigate('/monitoreo')} className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ArrowLeft size={16} /> Volver
        </button>
        <h2 className="section-title" style={{ margin: 0, border: 'none' }}>
          {id ? 'Actualizar Monitoreo' : 'Nuevo Monitoreo'}
        </h2>
      </div>

      {errorMsg && (
        <div className="glass-panel" style={{ padding: '1rem', marginBottom: '1rem', borderColor: 'var(--danger)' }}>
          <p style={{ color: 'var(--danger)' }}>{errorMsg}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="glass-panel" style={{ padding: '2rem' }}>
        
        {/* IDENTIFICACIÓN */}
        <h3 style={{ marginBottom: '1rem', color: 'var(--primary-dark)' }}>Identificación</h3>
        <div className="grid-2">
          <div className="form-group">
            <label className="form-label">Nombre de la IPRESS</label>
            <input required type="text" name="nombreIpress" className="form-control" value={formData.nombreIpress || ''} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label className="form-label">Código RENIPRESS</label>
            <input required type="text" name="codigoRenipress" className="form-control" value={formData.codigoRenipress || ''} onChange={handleChange} />
          </div>
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">Unidad Ejecutora</label>
            <select required name="unidadEjecutora" className="form-control" value={formData.unidadEjecutora || ''} onChange={handleChange}>
              <option value="">Seleccione...</option>
              {UNIDADES_EJECUTORAS.map(ue => (
                <option key={ue} value={ue}>{ue}</option>
              ))}
            </select>
          </div>
        </div>

        {/* DATOS TÉCNICOS */}
        <h3 style={{ margin: '2rem 0 1rem', color: 'var(--primary-dark)' }}>Datos Técnicos de Monitoreo</h3>
        <div className="grid-2">
          <div className="form-group">
            <label className="form-label">Cloro Residual (mg/L)</label>
            <input type="text" name="cloro" className="form-control" value={formData.cloro || ''} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label className="form-label">Temperatura (°C)</label>
            <input type="text" name="temperatura" className="form-control" value={formData.temperatura || ''} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label className="form-label">pH</label>
            <input type="text" name="ph" className="form-control" value={formData.ph || ''} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label className="form-label">Turbiedad (NTU)</label>
            <input type="text" name="turbiedad" className="form-control" value={formData.turbiedad || ''} onChange={handleChange} />
          </div>
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">Conductividad (µS/cm)</label>
            <input type="text" name="conductividad" className="form-control" value={formData.conductividad || ''} onChange={handleChange} />
          </div>
        </div>

        <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
          <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
            {isSubmitting ? <RefreshCw className="animate-spin" size={20} /> : <Save size={20} />}
            {isSubmitting ? 'Guardando...' : 'Guardar Monitoreo'}
          </button>
        </div>

      </form>
    </div>
  );
};
