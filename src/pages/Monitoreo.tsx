import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import SignatureCanvas from 'react-signature-canvas';
import { syncEntry, SyncRequest } from '../services/api';
import { saveRecord, getRecordById, LocalRecord } from '../services/storage';
import { getCachedIpressList, IpressRecord } from '../services/ipressData';
import { useAuth } from '../contexts/AuthContext';
import { Save, RefreshCw, ArrowLeft, AlertTriangle, PenTool, Camera, Upload } from 'lucide-react';

const imageToBase64 = (file: File, maxWidth = 800): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ratio = Math.min(maxWidth / img.width, 1);
        canvas.width = img.width * ratio;
        canvas.height = img.height * ratio;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        const base64String = dataUrl.split(',')[1];
        resolve(base64String);
      };
      img.onerror = (e) => reject(e);
    };
    reader.onerror = (e) => reject(e);
  });
};

const PhotoInput = ({ label, fieldName, formData, handleFileChange }: { label: string, fieldName: 'foto1' | 'foto2' | 'foto3', formData: Partial<SyncRequest>, handleFileChange: (e: React.ChangeEvent<HTMLInputElement>, fieldName: 'foto1' | 'foto2' | 'foto3') => void }) => {
  const base64 = formData[`${fieldName}Base64` as keyof SyncRequest];
  const url = formData[`url${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)}` as keyof SyncRequest] as string | undefined;
  const imageSrc = base64 ? `data:image/jpeg;base64,${base64}` : url;

  return (
    <div className="form-group" style={{ marginBottom: '1.5rem' }}>
      <label className="form-label">{label}</label>
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, justifyContent: 'center' }}>
              <Camera size={16} /> Tomar Foto
              <input type="file" accept="image/jpeg, image/png" capture="environment" style={{ display: 'none' }} onChange={(e) => handleFileChange(e, fieldName)} />
            </label>
            <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, justifyContent: 'center' }}>
              <Upload size={16} /> Seleccionar Archivo
              <input type="file" accept="image/jpeg, image/png" style={{ display: 'none' }} onChange={(e) => handleFileChange(e, fieldName)} />
            </label>
          </div>
          <small style={{ color: 'var(--text-muted)' }}>Formatos permitidos: JPG, PNG</small>
          {formData[`${fieldName}Name` as keyof SyncRequest] && (
            <small style={{ color: 'var(--primary)', fontWeight: 500, wordBreak: 'break-all' }}>
              Cargado: {formData[`${fieldName}Name` as keyof SyncRequest]}
            </small>
          )}
        </div>
        
        <div style={{ width: '80px', height: '80px', border: imageSrc ? '2px solid var(--border)' : '2px dashed var(--border)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9fafb', flexShrink: 0, overflow: 'hidden', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
          {imageSrc ? (
            <img 
              src={imageSrc} 
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
              alt={label} 
              referrerPolicy="no-referrer"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                if (target.src.includes('uc?export=view')) {
                  const fileId = target.src.split('id=')[1];
                  if (fileId) {
                    target.src = `https://lh3.googleusercontent.com/d/${fileId}`;
                    return;
                  }
                } else if (target.src.includes('lh3.googleusercontent.com')) {
                  target.src = 'https://via.placeholder.com/80?text=Foto';
                  return;
                }
              }} 
            />
          ) : (
            <Camera size={24} color="var(--border)" />
          )}
        </div>
      </div>
    </div>
  );
};

const UNIDADES_EJECUTORAS = [
  "Red Cusco Norte", "Red Cusco Sur", "Red Cusco VRAEM", 
  "Red CCE", "Red Chumbivilcas", "Red La Convencion", "Hospital", "Otro"
];

const PUNTOS_MONITOREO = [
  "Captacion Manante", "Captacion Riachuelo", "Captacion Pozo", "Camion Cisterna",
  "Reservorio", "Cisterna", "SS.HH.", "Cocina", "Comedor", "Sala de partos",
  "Sala de Operaciones", "Laboratorio", "Nutrición", "UCI", "Otros"
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
  const sigCanvas = useRef<SignatureCanvas>(null);
  const { user } = useAuth();

  const [formData, setFormData] = useState<Partial<SyncRequest>>(() => {
    const now = new Date();
    const defaultFecha = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
    const defaultHora = now.toTimeString().split(' ')[0].substring(0, 5);
    
    return {
      tipo: 'monitoreo',
      estado: 'Activo',
      unidadEjecutora: user?.red && user.rol !== 'Administra todas las Redes' ? user.red : UNIDADES_EJECUTORAS[0],
      fecha: defaultFecha,
      hora: defaultHora,
      analisisBacteriologico: 'No',
    };
  });
  
  const [initialData, setInitialData] = useState<Partial<SyncRequest>>(formData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [signatureError, setSignatureError] = useState(false);
  const [isSignatureDirty, setIsSignatureDirty] = useState(false);
  const [isFoto1Dirty, setIsFoto1Dirty] = useState(false);

  const [ipressList, setIpressList] = useState<IpressRecord[]>([]);
  const [isOtroUnidad, setIsOtroUnidad] = useState(false);
  const [puntoOption, setPuntoOption] = useState<string>('');
  
  const [isSignatureEmpty, setIsSignatureEmpty] = useState(true);
  const [hasExistingSignatureUrl, setHasExistingSignatureUrl] = useState(false);
  const [isSignatureLoading, setIsSignatureLoading] = useState(true);

  useEffect(() => {
    const list = getCachedIpressList();
    setIpressList(list);
    
    // Auto-fill IPRESS for IPRESS/Hospital users on new records
    if (!id && user && (user.rol === 'IPRESS' || user.rol === 'Hospital')) {
      if (user.codigoRenipress) {
        // Try to match by codigoRenipress (numeric or string)
        const uCode = String(user.codigoRenipress).trim();
        const matched = list.find(i => {
          const rCode = String(i.codigo || '').trim();
          return uCode === rCode || (uCode !== '' && rCode !== '' && !isNaN(Number(uCode)) && !isNaN(Number(rCode)) && Number(uCode) === Number(rCode));
        });
        
        if (matched) {
          setFormData(prev => ({
            ...prev,
            nombreIpress: matched.nombre,
            codigoRenipress: matched.codigo
          }));
        } else {
          // Fallback to username matching
          const matchedByName = list.find(i => String(i.nombre).trim().toLowerCase() === String(user.usuario).trim().toLowerCase());
          if (matchedByName) {
            setFormData(prev => ({
              ...prev,
              nombreIpress: matchedByName.nombre,
              codigoRenipress: matchedByName.codigo
            }));
          }
        }
      } else {
        // Fallback to username matching if no codigoRenipress
        const matchedByName = list.find(i => String(i.nombre).trim().toLowerCase() === String(user.usuario).trim().toLowerCase());
        if (matchedByName) {
          setFormData(prev => ({
            ...prev,
            nombreIpress: matchedByName.nombre,
            codigoRenipress: matchedByName.codigo
          }));
        }
      }
    }
  }, [id, user]);

  useEffect(() => {
    if (id) {
      const existing = getRecordById(id);
      if (existing) {
        const now = new Date();
        const fallbackFecha = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
        const fallbackHora = now.toTimeString().split(' ')[0].substring(0, 5);
        
        let fechaLimpia: any = existing.fecha || fallbackFecha;
        if (typeof fechaLimpia === 'string') {
          if (fechaLimpia.includes('T')) {
            fechaLimpia = fechaLimpia.split('T')[0];
          } else if (fechaLimpia.match(/^\d{2}-\d{2}-\d{4}$/)) {
            const [d, m, y] = fechaLimpia.split('-');
            fechaLimpia = `${y}-${m}-${d}`;
          }
        } else if (fechaLimpia instanceof Date) {
          fechaLimpia = fechaLimpia.toISOString().split('T')[0];
        }

        let horaLimpia: any = existing.hora || fallbackHora;
        if (typeof horaLimpia === 'string') {
          if (horaLimpia.includes('T')) {
            const dateObj = new Date(horaLimpia);
            if (!isNaN(dateObj.getTime())) {
              horaLimpia = dateObj.toTimeString().split(' ')[0].substring(0, 5);
            }
          } else if (horaLimpia.match(/^\d{2}:\d{2}:\d{2}$/)) {
            horaLimpia = horaLimpia.substring(0, 5);
          }
        } else if (horaLimpia instanceof Date) {
          horaLimpia = horaLimpia.toTimeString().split(' ')[0].substring(0, 5);
        }

        const newData = {
          ...existing,
          fecha: fechaLimpia,
          hora: horaLimpia
        };

        setFormData(newData);
        setInitialData(newData);
        if (existing.unidadEjecutora === 'Otro') {
          setIsOtroUnidad(true);
        }
        if (existing.puntosMonitoreo) {
          if (!PUNTOS_MONITOREO.includes(existing.puntosMonitoreo)) {
            setPuntoOption('Otros');
          } else {
            setPuntoOption(existing.puntosMonitoreo);
          }
        }
        if (existing.firma || existing.urlFirma) {
          setHasExistingSignatureUrl(true);
          setIsSignatureEmpty(false);
        }
      }
    } else {
      setIsOtroUnidad(UNIDADES_EJECUTORAS[0] === 'Otro');
    }
    setIsSignatureLoading(false);
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

    if (name === 'puntoOption') {
      setPuntoOption(value);
      if (value !== 'Otros') {
        setFormData(prev => ({ ...prev, puntosMonitoreo: value }));
      } else {
        setFormData(prev => ({ ...prev, puntosMonitoreo: '' }));
      }
      return;
    }

    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, fieldName: 'foto1' | 'foto2' | 'foto3') => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      try {
        const base64 = await imageToBase64(file);
        setFormData(prev => ({
          ...prev,
          [`${fieldName}Base64`]: base64,
          [`${fieldName}Name`]: file.name,
          [`${fieldName}Mime`]: file.type
        }));
        setIsFoto1Dirty(true);
      } catch (error) {
        console.error("Error al procesar imagen", error);
        alert("Error al procesar la imagen. Intente de nuevo.");
      }
    }
  };

  const clearSignature = () => {
    if (sigCanvas.current) {
      sigCanvas.current.clear();
      setHasExistingSignatureUrl(false);
      setIsSignatureEmpty(true);
      setIsSignatureDirty(true);
      setFormData(prev => {
        const newData = { ...prev };
        delete newData.firma;
        return newData;
      });
    }
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg('');
    setSignatureError(false);
    
    let firmaBase64 = formData.firma || '';
    let firmaMime = formData.firmaMime || '';
    const dynamicFirmaName = `${formData.dni || 'sin_dni'} - ${formData.responsable || 'sin_nombre'}.png`;

    if (sigCanvas.current && !sigCanvas.current.isEmpty()) {
      const dataUrl = sigCanvas.current.toDataURL('image/png');
      firmaBase64 = dataUrl.split(',')[1];
      firmaMime = 'image/png';
    } else if (hasExistingSignatureUrl) {
      firmaBase64 = formData.firma || '';
    }
    
    if (!firmaBase64 && !hasExistingSignatureUrl) {
      setSignatureError(true);
      setIsSubmitting(false);
      setTimeout(() => document.querySelector('.signature-container')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
      return;
    }

    const payload: SyncRequest = {
      ...(formData as SyncRequest),
      uuid: formData.uuid || crypto.randomUUID(),
      fechaRegistro: formData.fechaRegistro || new Date().toISOString(),
      firma: firmaBase64,
      firmaName: dynamicFirmaName,
      firmaMime,
      foto1Base64: formData.foto1Base64 || formData.urlFoto1 || '',
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
          
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Unidad Ejecutora / Red *</label>
              <select 
                className="form-control"
                name="unidadEjecutora" 
                value={formData.unidadEjecutora} 
                onChange={handleChange} 
                required
                disabled={user?.rol === 'IPRESS' || user?.rol === 'Hospital' || (user?.rol?.includes('Red') && user.rol !== 'Administra todas las Redes')}
              >
                <option value="">Seleccione...</option>
                {UNIDADES_EJECUTORAS.map((ue, idx) => (
                  <option key={idx} value={ue}>{ue}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Nombre de la IPRESS *</label>
              <select 
                className="form-control"
                name="nombreIpress" 
                value={formData.nombreIpress} 
                onChange={handleChange} 
                required
                disabled={user?.rol === 'IPRESS' || user?.rol === 'Hospital'}
              >
                <option value="">Seleccione una IPRESS</option>
                {ipressList.filter(i => i.red === formData.unidadEjecutora).map((ipress, idx) => (
                  <option key={idx} value={ipress.nombre}>{ipress.nombre}</option>
                ))}
              </select>
            </div>
          </div>

          {!isOtroUnidad ? null : (
            <div className="form-group">
              <label className="form-label">Nombre de la IPRESS</label>
              <input required type="text" name="nombreIpress" className="form-control" value={formData.nombreIpress || ''} onChange={handleChange} />
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Código RENIPRESS</label>
            <input required type="text" name="codigoRenipress" className="form-control" value={formData.codigoRenipress || ''} onChange={handleChange} readOnly={!isOtroUnidad} style={!isOtroUnidad ? { backgroundColor: '#f1f5f9' } : {}} />
          </div>
        </div>

        {/* DATOS TÉCNICOS */}
        <div className="form-section">
          <h3 className="section-heading">Datos Técnicos de Monitoreo</h3>
          
          <div className="form-group">
            <label className="form-label">Puntos de Monitoreo</label>
            <select required name="puntoOption" className="form-control" value={puntoOption} onChange={handleChange}>
              <option value="">Seleccione un punto...</option>
              {PUNTOS_MONITOREO.map(punto => (
                <option key={punto} value={punto}>{punto}</option>
              ))}
            </select>
          </div>
          
          {puntoOption === 'Otros' && (
            <div className="form-group animate-fade-in">
              <label className="form-label">Especifique el Punto de Monitoreo</label>
              <input required type="text" name="puntosMonitoreo" className="form-control" value={formData.puntosMonitoreo || ''} onChange={handleChange} placeholder="Ingrese el punto manualmente" />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">
              Cloro Residual (mg/L)
              <WarningBadge show={validateParameter('cloro', formData.cloro !== undefined && formData.cloro !== null ? String(formData.cloro) : '') !== null} />
            </label>
            <input required type="number" step="any" name="cloro" className="form-control" value={formData.cloro !== undefined && formData.cloro !== null ? formData.cloro : ''} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label className="form-label">Temperatura (°C)</label>
            <input type="number" step="any" name="temperatura" className="form-control" value={formData.temperatura !== undefined && formData.temperatura !== null ? formData.temperatura : ''} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label className="form-label">
              pH
              <WarningBadge show={validateParameter('ph', formData.ph !== undefined && formData.ph !== null ? String(formData.ph) : '') !== null} />
            </label>
            <input type="number" step="any" name="ph" className="form-control" value={formData.ph !== undefined && formData.ph !== null ? formData.ph : ''} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label className="form-label">
              Turbiedad (NTU)
              <WarningBadge show={validateParameter('turbiedad', formData.turbiedad !== undefined && formData.turbiedad !== null ? String(formData.turbiedad) : '') !== null} />
            </label>
            <input type="number" step="any" name="turbiedad" className="form-control" value={formData.turbiedad !== undefined && formData.turbiedad !== null ? formData.turbiedad : ''} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label className="form-label">
              Conductividad (µS/cm)
              <WarningBadge show={validateParameter('conductividad', formData.conductividad !== undefined && formData.conductividad !== null ? String(formData.conductividad) : '') !== null} />
            </label>
            <input type="number" step="any" name="conductividad" className="form-control" value={formData.conductividad !== undefined && formData.conductividad !== null ? formData.conductividad : ''} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label className="form-label">Valor de STD (mg/L)</label>
            <input type="number" step="any" name="std" className="form-control" value={formData.std !== undefined && formData.std !== null ? formData.std : ''} onChange={handleChange} />
          </div>
          
          <PhotoInput 
            label="Foto de los Valores" 
            fieldName="foto1" 
            formData={formData} 
            handleFileChange={handleFileChange} 
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1.5rem' }}>
            <div className="form-group">
              <label className="form-label">Fecha</label>
              <input required type="date" name="fecha" className="form-control" value={formData.fecha || ''} min={new Date().toISOString().split('T')[0]} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label className="form-label">Hora</label>
              <input required type="time" name="hora" className="form-control" value={formData.hora || ''} onChange={handleChange} />
            </div>
          </div>
          
          <div className="form-group">
            <label className="form-label">¿Se tomó muestra de agua para análisis bacteriológico?</label>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input type="radio" name="analisisBacteriologico" value="Si" checked={formData.analisisBacteriologico === 'Si'} onChange={handleChange} />
                <span>Sí</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input type="radio" name="analisisBacteriologico" value="No" checked={formData.analisisBacteriologico === 'No'} onChange={handleChange} />
                <span>No</span>
              </label>
            </div>
          </div>
        </div>

        {/* FIRMA Y DATOS DEL INSPECTOR */}
        <div className="form-section signature-container">
          <h3 className="section-heading">Datos del Inspector</h3>
          
          <div className="form-group">
            <label className="form-label">Nombre del Inspector</label>
            <input required type="text" name="responsable" className="form-control" value={formData.responsable || ''} onChange={handleChange} />
          </div>
          
          <div className="form-group">
            <label className="form-label">DNI Inspector</label>
            <input required type="number" name="dni" className="form-control" value={formData.dni || ''} onChange={handleChange} />
          </div>
          
          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              Firma
              <button type="button" onClick={clearSignature} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.875rem' }}>
                Limpiar Firma
              </button>
            </label>
            <div className="signature-container" style={{ position: 'relative', minHeight: '200px', border: '1px solid var(--border)', borderRadius: '8px' }}>
              {hasExistingSignatureUrl ? (
                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%', padding: '1rem' }}>
                  <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text)', fontSize: '0.95rem' }}>Firma Registrada</h4>
                  <div style={{ width: '100%', display: 'flex', justifyContent: 'center', backgroundColor: '#f9fafb', borderRadius: '8px', padding: '1rem', border: '1px dashed var(--border)' }}>
                    {isSignatureLoading && (
                      <div style={{ position: 'absolute', display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', height: '100%' }}>
                        <RefreshCw className="animate-spin" size={24} color="var(--primary)" />
                        <span style={{ marginLeft: '8px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Cargando firma...</span>
                      </div>
                    )}
                    <img 
                      src={formData.firma} 
                      alt="Firma Registrada" 
                      referrerPolicy="no-referrer"
                      style={{ maxWidth: '100%', maxHeight: '120px', objectFit: 'contain', display: isSignatureLoading ? 'none' : 'block' }} 
                      onLoad={() => setIsSignatureLoading(false)}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        if (target.src.includes('uc?export=view')) {
                          const fileId = formData.firma!.split('id=')[1];
                          if (fileId) {
                            target.src = `https://lh3.googleusercontent.com/d/${fileId}`;
                            return;
                          }
                        }
                        if (target.src.includes('lh3.googleusercontent.com')) {
                          const fileId = formData.firma!.split('id=')[1];
                          if (fileId) {
                            target.src = `https://drive.google.com/thumbnail?id=${fileId}&sz=w800`;
                            return;
                          }
                        }
                        target.style.display = 'none';
                        setIsSignatureLoading(false);
                        const parent = target.parentElement;
                        if (parent) {
                          const fallback = document.createElement('div');
                          fallback.innerHTML = `<p style="color: #ef4444; font-size: 0.85rem; text-align: center; margin: 0;">Firma guardada, pero el navegador bloquea la previsualización.</p><a href="${formData.firma}" target="_blank" rel="noopener noreferrer" style="display: inline-block; margin-top: 0.5rem; font-size: 0.85rem; color: var(--primary);">Abrir Firma en nueva pestaña</a>`;
                          parent.appendChild(fallback);
                        }
                      }}
                    />
                  </div>
                </div>
              ) : (
                <>
                  {isSignatureEmpty && (
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', pointerEvents: 'none' }}>
                      <PenTool size={48} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
                      <p style={{ margin: 0, fontSize: '1.1rem', opacity: 0.6, fontWeight: 500 }}>Ponga su Firma aquí</p>
                    </div>
                  )}
                  <SignatureCanvas
                    ref={sigCanvas}
                    onBegin={() => {
                      setIsSignatureEmpty(false);
                      setSignatureError(false);
                      setIsSignatureDirty(true);
                    }}
                    penColor="black"
                    canvasProps={{ className: 'signature-canvas' }}
                  />
                </>
              )}
            </div>
            {signatureError && (
              <p style={{ color: 'var(--danger)', fontSize: '0.875rem', marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <PenTool size={14} /> Debe ingresar la firma del responsable para guardar.
              </p>
            )}
          </div>
        </div>

        <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
          <button type="submit" className="btn btn-primary" disabled={isSubmitting || (JSON.stringify(formData) === JSON.stringify(initialData) && !isSignatureDirty && !isFoto1Dirty)}>
            {isSubmitting ? <RefreshCw className="animate-spin" size={20} /> : <Save size={20} />}
            {isSubmitting ? 'Guardando...' : 'Guardar Monitoreo'}
          </button>
        </div>

      </form>
    </div>
  );
};
