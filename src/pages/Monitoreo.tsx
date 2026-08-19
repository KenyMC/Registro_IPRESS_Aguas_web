import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { syncEntry, SyncRequest } from '../services/api';
import { saveRecord, getRecordById, LocalRecord } from '../services/storage';
import { getCachedIpressList, IpressRecord } from '../services/ipressData';
import { Save, RefreshCw, ArrowLeft, AlertTriangle } from 'lucide-react';

const UNIDADES_EJECUTORAS = [
  "Red Cusco Norte", "Red Cusco Sur", "Red Cusco VRAEM", 
  "Red CCE", "Red Chumbivilcas", "Red La Convencion", "Hospital", "Otro"
];

const validateParameter = (name: string, value: string) => {
  if (!value) return null;
  const num = parseFloat(value);
  if (isNaN(num)) return null;

  switch (name) {
    case 'cloro':
      if (num < 0.5 || num > 2.0) return 'Incumple';
      break;
    case 'turbiedad':
      if (num > 5.0) return 'Incumple';
      break;
    case 'ph':
      if (num < 6.5 || num > 8.5) return 'Incumple';
      break;
    case 'conductividad':
      if (num > 1500) return 'Incumple';
      break;
  }
  return null;
};

const WarningBadge = ({ show }: { show: boolean }) => {
  if (!show) return null;
  return (
    <span style={{ 
      marginLeft: '8px', 
      backgroundColor: '#fee2e2', 
      color: '#ef4444', 
      padding: '2px 8px', 
      borderRadius: '12px', 
      fontSize: '0.75rem', 
      fontWeight: 'bold',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px'
    }}>
      <AlertTriangle size={12} /> Incumple
    </span>
  );
};

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

  const [ipressList, setIpressList] = useState<IpressRecord[]>([]);
  const [isOtroUnidad, setIsOtroUnidad] = useState(false);

  useEffect(() => {
    const list = getCachedIpressList();
    setIpressList(list);
  }, []);

  useEffect(() => {
    if (id) {
      const existing = getRecordById(id);
      if (existing) {
        setFormData(existing);
        if (existing.unidadEjecutora === 'Otro') {
          setIsOtroUnidad(true);
        }
      }
    } else {
      setIsOtroUnidad(UNIDADES_EJECUTORAS[0] === 'Otro');
    }
  }, [id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    if (name === 'unidadEjecutora') {
      const isOtro = value === 'Otro' || value === '';
      setIsOtroUnidad(isOtro);
      setFormData(prev => ({ 
        ...prev, 
        unidadEjecutora: value,
        nombreIpress: '',
        codigoRenipress: ''
      }));
      return;
    }

    if (name === 'nombreIpress' && !isOtroUnidad) {
      const selected = ipressList.find(i => i.nombre === value && i.red === formData.unidadEjecutora);
      if (selected) {
        setFormData(prev => ({
          ...prev,
          nombreIpress: value,
          codigoRenipress: selected.codigo
        }));
        return;
      }
    }

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

      <form onSubmit={handleSubmit} style={{ padding: '0 0 2rem 0' }}>
        
        {/* IDENTIFICACIÓN */}
        <div className="form-section">
          <h3 className="section-heading">Datos de Identificación</h3>
          
          <div className="form-group">
            <label className="form-label">Unidad Ejecutora</label>
            <select required name="unidadEjecutora" className="form-control" value={formData.unidadEjecutora || ''} onChange={handleChange}>
              <option value="">Seleccione...</option>
              {UNIDADES_EJECUTORAS.map(ue => (
                <option key={ue} value={ue}>{ue}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Nombre de la IPRESS</label>
            {!isOtroUnidad ? (
              <select required name="nombreIpress" className="form-control" value={formData.nombreIpress || ''} onChange={handleChange}>
                <option value="">Seleccione IPRESS...</option>
                {ipressList.filter(i => i.red === formData.unidadEjecutora).map((ipress, idx) => (
                  <option key={idx} value={ipress.nombre}>{ipress.nombre}</option>
                ))}
              </select>
            ) : (
              <input required type="text" name="nombreIpress" className="form-control" value={formData.nombreIpress || ''} onChange={handleChange} />
            )}
          </div>
          <div className="form-group">
            <label className="form-label">Código RENIPRESS</label>
            <input required type="text" name="codigoRenipress" className="form-control" value={formData.codigoRenipress || ''} onChange={handleChange} readOnly={!isOtroUnidad} style={!isOtroUnidad ? { backgroundColor: '#f1f5f9' } : {}} />
          </div>
        </div>

        {/* DATOS TÉCNICOS */}
        <div className="form-section">
          <h3 className="section-heading">Datos Técnicos de Monitoreo</h3>
          
          <div className="form-group">
            <label className="form-label">
              Cloro Residual (mg/L)
              <WarningBadge show={validateParameter('cloro', formData.cloro || '') !== null} />
            </label>
            <input type="text" name="cloro" className="form-control" value={formData.cloro || ''} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label className="form-label">Temperatura (°C)</label>
            <input type="text" name="temperatura" className="form-control" value={formData.temperatura || ''} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label className="form-label">
              pH
              <WarningBadge show={validateParameter('ph', formData.ph || '') !== null} />
            </label>
            <input type="text" name="ph" className="form-control" value={formData.ph || ''} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label className="form-label">
              Turbiedad (NTU)
              <WarningBadge show={validateParameter('turbiedad', formData.turbiedad || '') !== null} />
            </label>
            <input type="text" name="turbiedad" className="form-control" value={formData.turbiedad || ''} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label className="form-label">
              Conductividad (µS/cm)
              <WarningBadge show={validateParameter('conductividad', formData.conductividad || '') !== null} />
            </label>
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
