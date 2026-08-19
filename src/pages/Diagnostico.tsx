import { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import SignatureCanvas from 'react-signature-canvas';
import { syncEntry, SyncRequest } from '../services/api';
import { saveRecord, getRecordById, LocalRecord } from '../services/storage';
import { MapPin, Save, RefreshCw, ArrowLeft } from 'lucide-react';

const UNIDADES_EJECUTORAS = [
  "Red Cusco Norte", "Red Cusco Sur", "Red Cusco VRAEM", 
  "Red CCE", "Red Chumbivilcas", "Red La Convencion", "Hospital"
];

const FUENTES_AGUA = [
  "Red Publica", "Manante", "Riachuelo", "Pozo", 
  "Camion Cisterna", "Agua de lluvia"
];

export const Diagnostico = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const sigCanvas = useRef<SignatureCanvas>(null);
  
  const [formData, setFormData] = useState<Partial<SyncRequest>>({
    tipo: 'diagnostico',
    aguaPropio: 'No',
    bombasAgua: 'No',
    bombasOperativas: 'No',
    reservorio: 'No',
    reservorioElevado: 'No',
    reservorioOperativo: 'No',
    tratamientoAgua: 'No',
    unidadEjecutora: UNIDADES_EJECUTORAS[0],
    fuenteAgua: FUENTES_AGUA[0],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (id) {
      const existing = getRecordById(id);
      if (existing) {
        setFormData(existing);
        if (existing.firma) {
          setTimeout(() => {
            sigCanvas.current?.fromDataURL(existing.firma!);
          }, 100);
        }
      }
    }
  }, [id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleGetLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData(prev => ({
            ...prev,
            latitud: position.coords.latitude.toString(),
            longitud: position.coords.longitude.toString(),
            altitud: position.coords.altitude?.toString() || '0',
            precision: position.coords.accuracy.toString(),
          }));
        },
        (error) => {
          alert('Error obteniendo ubicación: ' + error.message);
        },
        { enableHighAccuracy: true }
      );
    } else {
      alert('Geolocalización no soportada en este navegador.');
    }
  };

  const clearSignature = () => {
    sigCanvas.current?.clear();
    setFormData(prev => ({ ...prev, firma: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg('');

    let firmaBase64 = formData.firma || '';
    if (sigCanvas.current && !sigCanvas.current.isEmpty()) {
      firmaBase64 = sigCanvas.current.toDataURL('image/png');
    }

    const payload: SyncRequest = {
      ...(formData as SyncRequest),
      uuid: formData.uuid || crypto.randomUUID(),
      fechaRegistro: formData.fechaRegistro || new Date().toISOString(),
      firma: firmaBase64,
    };

    // Try to sync to Google Apps Script
    const isSynced = await syncEntry(payload);
    
    // Save locally regardless of sync success
    const localRecord: LocalRecord = {
      ...payload,
      id: id || crypto.randomUUID(),
      isSynced
    };
    
    saveRecord(localRecord);
    setIsSubmitting(false);

    if (!isSynced) {
      // Si falla, avisamos pero igual guardamos y salimos
      alert('Se guardó localmente, pero hubo un error al sincronizar con el servidor.');
    }
    
    navigate('/diagnostico');
  };

  return (
    <div className="container animate-fade-in">
      <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
        <button type="button" onClick={() => navigate('/diagnostico')} className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ArrowLeft size={16} /> Volver
        </button>
        <h2 className="section-title" style={{ margin: 0, border: 'none' }}>
          {id ? 'Actualizar Diagnóstico' : 'Nuevo Diagnóstico'}
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

        {/* UBICACIÓN */}
        <h3 style={{ margin: '2rem 0 1rem', color: 'var(--primary-dark)' }}>Ubicación</h3>
        <div className="grid-2">
          <div className="form-group">
            <label className="form-label">Provincia</label>
            <input type="text" name="provincia" className="form-control" value={formData.provincia || ''} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label className="form-label">Distrito</label>
            <input type="text" name="distrito" className="form-control" value={formData.distrito || ''} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label className="form-label">Centro Poblado</label>
            <input type="text" name="centroPoblado" className="form-control" value={formData.centroPoblado || ''} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label className="form-label">Ubigeo CCPP</label>
            <input type="text" name="ubigeo" className="form-control" value={formData.ubigeo || ''} onChange={handleChange} />
          </div>
        </div>

        {/* GEOREFERENCIA */}
        <h3 style={{ margin: '2rem 0 1rem', color: 'var(--primary-dark)' }}>Georeferencia</h3>
        <button type="button" className="btn btn-secondary btn-sm" onClick={handleGetLocation} style={{ marginBottom: '1rem' }}>
          <MapPin size={18} /> Obtener Ubicación Actual
        </button>
        <div className="grid-2">
          <div className="form-group">
            <label className="form-label">Latitud</label>
            <input type="text" readOnly name="latitud" className="form-control" value={formData.latitud || ''} />
          </div>
          <div className="form-group">
            <label className="form-label">Longitud</label>
            <input type="text" readOnly name="longitud" className="form-control" value={formData.longitud || ''} />
          </div>
          <div className="form-group">
            <label className="form-label">Altitud</label>
            <input type="text" readOnly name="altitud" className="form-control" value={formData.altitud || ''} />
          </div>
          <div className="form-group">
            <label className="form-label">Precisión</label>
            <input type="text" readOnly name="precision" className="form-control" value={formData.precision || ''} />
          </div>
        </div>

        {/* SISTEMA DE AGUA */}
        <h3 style={{ margin: '2rem 0 1rem', color: 'var(--primary-dark)' }}>Sistema de Agua</h3>
        <div className="grid-2">
          <div className="form-group">
            <label className="form-label">¿Sistema Propio?</label>
            <select name="aguaPropio" className="form-control" value={formData.aguaPropio || 'No'} onChange={handleChange}>
              <option value="Si">Sí</option>
              <option value="No">No</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Fuente de Agua</label>
            <select name="fuenteAgua" className="form-control" value={formData.fuenteAgua || ''} onChange={handleChange}>
              <option value="">Seleccione...</option>
              {FUENTES_AGUA.map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">¿Tiene Bombas?</label>
            <select name="bombasAgua" className="form-control" value={formData.bombasAgua || 'No'} onChange={handleChange}>
              <option value="Si">Sí</option>
              <option value="No">No</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">¿Bombas Operativas?</label>
            <select name="bombasOperativas" className="form-control" value={formData.bombasOperativas || 'No'} onChange={handleChange}>
              <option value="Si">Sí</option>
              <option value="No">No</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">¿Tiene Reservorio?</label>
            <select name="reservorio" className="form-control" value={formData.reservorio || 'No'} onChange={handleChange}>
              <option value="Si">Sí</option>
              <option value="No">No</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">¿Reservorio Elevado?</label>
            <select name="reservorioElevado" className="form-control" value={formData.reservorioElevado || 'No'} onChange={handleChange}>
              <option value="Si">Sí</option>
              <option value="No">No</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">¿Reservorio Operativo?</label>
            <select name="reservorioOperativo" className="form-control" value={formData.reservorioOperativo || 'No'} onChange={handleChange}>
              <option value="Si">Sí</option>
              <option value="No">No</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">¿Tratamiento de Agua?</label>
            <select name="tratamientoAgua" className="form-control" value={formData.tratamientoAgua || 'No'} onChange={handleChange}>
              <option value="Si">Sí</option>
              <option value="No">No</option>
            </select>
          </div>
        </div>

        {/* FINALIZACIÓN */}
        <h3 style={{ margin: '2rem 0 1rem', color: 'var(--primary-dark)' }}>Finalización</h3>
        <div className="form-group">
          <label className="form-label">Observaciones</label>
          <textarea name="observaciones" className="form-control" rows={3} value={formData.observaciones || ''} onChange={handleChange}></textarea>
        </div>
        <div className="grid-2">
          <div className="form-group">
            <label className="form-label">Responsable</label>
            <input type="text" name="responsable" className="form-control" value={formData.responsable || ''} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label className="form-label">DNI</label>
            <input type="text" name="dni" className="form-control" value={formData.dni || ''} onChange={handleChange} />
          </div>
        </div>

        <div className="form-group" style={{ marginTop: '1rem' }}>
          <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            Firma
            <button type="button" onClick={clearSignature} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.875rem' }}>
              Limpiar Firma
            </button>
          </label>
          <div className="signature-container">
            <SignatureCanvas ref={sigCanvas} penColor="black" canvasProps={{ className: 'sigCanvas' }} />
          </div>
        </div>

        <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
          <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
            {isSubmitting ? <RefreshCw className="animate-spin" size={20} /> : <Save size={20} />}
            {isSubmitting ? 'Guardando...' : 'Guardar Registro'}
          </button>
        </div>

      </form>
    </div>
  );
};
