import { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import SignatureCanvas from 'react-signature-canvas';
import { syncEntry, SyncRequest } from '../services/api';
import { generateUUID } from '../utils/uuid';
import { saveRecord, getRecordById, LocalRecord } from '../services/storage';
import { getCachedIpressList, IpressRecord } from '../services/ipressData';
import { getCachedCcppList, CcppRecord } from '../services/ccppData';
import { useAuth } from '../contexts/AuthContext';
import { MapPin, Save, RefreshCw, ArrowLeft, PenTool, Camera, Upload } from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet's default marker icon in Vite
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

// Component to recenter map when location changes
const RecenterMap = ({ lat, lng }: { lat: number, lng: number }) => {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], 15);
  }, [lat, lng, map]);
  return null;
};

// Utilidad para comprimir imágenes y obtener el base64 sin prefijo
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

const UNIDADES_EJECUTORAS = [
  "Hospital", "Red CCE", "Red Chumbivilcas", "Red Cusco Norte", "Red Cusco Sur", 
  "Red Cusco VRAEM", "Red La Convencion", "Otro"
];

const FUENTES_AGUA = [
  "Agua de lluvia", "Camion Cisterna", "La Red Publica", "Manante", "Pozo", "Riachuelo"
];

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
                  }
                } else if (target.src.includes('lh3.googleusercontent.com')) {
                  target.src = 'https://via.placeholder.com/80?text=Foto';
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

export const Diagnostico = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const sigCanvas = useRef<SignatureCanvas>(null);
  const { user } = useAuth();

  const [formData, setFormData] = useState<Partial<SyncRequest>>(() => {
    const now = new Date();
    const defaultFecha = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
    const defaultHora = now.toTimeString().split(' ')[0].substring(0, 5);
    
    return {
      tipo: 'diagnostico',
      estado: 'Activo',
      aguaPropio: 'No',
      bombasAgua: 'No',
      bombasOperativas: 'No',
      reservorio: 'No',
      tipoMaterialReservorio: '',
      reservorioElevado: 'No',
      reservorioOperativo: 'No',
      cisterna: 'No',
      cisternaOperativa: 'No',
      tratamientoAgua: 'No',
      unidadEjecutora: user?.red && user.rol !== 'Administra todas las Redes' ? user.red : UNIDADES_EJECUTORAS[0],
      fuenteAgua: FUENTES_AGUA[0],
      fecha: defaultFecha,
      hora: defaultHora,
    };
  });
  const [initialData, setInitialData] = useState<Partial<SyncRequest>>(formData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [signatureError, setSignatureError] = useState(false);
  const [isSignatureDirty, setIsSignatureDirty] = useState(false);

  const [ipressList, setIpressList] = useState<IpressRecord[]>([]);
  const [ccppList, setCcppList] = useState<CcppRecord[]>([]);
  const [isOtroUnidad, setIsOtroUnidad] = useState(false);
  const [isOtroCcpp, setIsOtroCcpp] = useState(false);
  const [isSignatureEmpty, setIsSignatureEmpty] = useState(true);
  const [hasExistingSignatureUrl, setHasExistingSignatureUrl] = useState(false);
  const [isSignatureLoading, setIsSignatureLoading] = useState(true);

  useEffect(() => {
    const list = getCachedIpressList();
    setIpressList(list);
    
    const ccpp = getCachedCcppList();
    setCcppList(ccpp);

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
            codigoRenipress: String(matched.codigo).padStart(8, '0'),
            provincia: matched.provincia,
            distrito: matched.distrito
          }));
        } else {
          // Fallback to username matching
          const matchedByName = list.find(i => String(i.nombre).trim().toLowerCase() === String(user.usuario).trim().toLowerCase());
          if (matchedByName) {
            setFormData(prev => ({
              ...prev,
              nombreIpress: matchedByName.nombre,
              codigoRenipress: String(matchedByName.codigo).padStart(8, '0'),
              provincia: matchedByName.provincia,
              distrito: matchedByName.distrito
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
            codigoRenipress: String(matchedByName.codigo).padStart(8, '0'),
            provincia: matchedByName.provincia,
            distrito: matchedByName.distrito
          }));
        }
      }
    }
  }, [id, user]);

  useEffect(() => {
    if (id) {
      const existing = getRecordById(id);
      if (existing && existing.tipo === 'diagnostico') {
        const now = new Date();
        const fallbackFecha = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
        const fallbackHora = now.toTimeString().split(' ')[0].substring(0, 5);
        
        let fechaLimpia: any = existing.fecha || fallbackFecha;
        // Fix for timestamps coming from google sheets
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
        if (existing.firma) {
          if (existing.firma.startsWith('http')) {
            setHasExistingSignatureUrl(true);
            setIsSignatureEmpty(false);
          } else {
            setIsSignatureEmpty(false);
            setTimeout(() => {
              // Asegurarnos de que tenga el prefijo data URI para que el canvas pueda dibujarlo
              const dataUrl = existing.firma!.startsWith('data:') 
                ? existing.firma! 
                : `data:${existing.firmaMime || 'image/png'};base64,${existing.firma}`;
              sigCanvas.current?.fromDataURL(dataUrl);
            }, 100);
          }
        }
      }
    } else {
      // New record defaults to first option, check if it's 'Otro'
      setIsOtroUnidad(UNIDADES_EJECUTORAS[0] === 'Otro');
    }
  }, [id]);

  // Check if the loaded centroPoblado is 'Otro' (not in the list)
  useEffect(() => {
    if (id && formData.centroPoblado && formData.distrito && ccppList.length > 0) {
      const isKnown = ccppList.find(
        c => c.centroPoblado === formData.centroPoblado && c.distrito === formData.distrito
      );
      if (!isKnown) {
        setIsOtroCcpp(true);
      }
    }
  }, [id, formData.centroPoblado, formData.distrito, ccppList]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const finalValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    
    setFormData(prev => {
      let nextState = { ...prev, [name]: finalValue };

      // Handle Map Coordinates manually
      if (name === 'latitud' || name === 'longitud') {
        let val = value;
        if (val !== '' && !val.startsWith('-')) {
          val = '-' + val;
        }
        nextState[name] = val;
      }

      // Handle Unidad Ejecutora changes
      if (name === 'unidadEjecutora') {
        const isOtro = value === 'Otro' || value === '';
        setIsOtroUnidad(isOtro);
        nextState.nombreIpress = '';
        nextState.codigoRenipress = '';
        nextState.provincia = '';
        nextState.distrito = '';
        nextState.centroPoblado = '';
        nextState.ubigeo = '';
        setIsOtroCcpp(false);
      }

      // Handle IPRESS selection
      if (name === 'nombreIpress') {
        if (value === 'OTRO') {
          setIsOtroUnidad(true);
          nextState.nombreIpress = '';
          nextState.codigoRenipress = '';
          nextState.provincia = '';
          nextState.distrito = '';
          nextState.centroPoblado = '';
          nextState.ubigeo = '';
          setIsOtroCcpp(false);
        } else if (!isOtroUnidad) {
          const selected = ipressList.find(i => i.nombre === value && i.red === prev.unidadEjecutora);
          if (selected) {
            nextState.codigoRenipress = String(selected.codigo).padStart(8, '0');
            nextState.provincia = selected.provincia;
            nextState.distrito = selected.distrito;
            nextState.centroPoblado = '';
            nextState.ubigeo = '';
            setIsOtroCcpp(false);
          }
        }
      }

      // Handle CCPP selection
      if (name === 'centroPobladoSelect') {
        if (value === 'OTRO') {
          setIsOtroCcpp(true);
          nextState.centroPoblado = '';
          nextState.ubigeo = '';
        } else {
          setIsOtroCcpp(false);
          nextState.centroPoblado = value;
          const matchedCcpp = ccppList.find(c => c.centroPoblado === value && c.distrito === prev.distrito);
          if (matchedCcpp) {
            nextState.ubigeo = matchedCcpp.ubigeo;
          }
        }
      }

      // Format Ubigeo if typed manually (add leading zero if not present and is manual input)
      if (name === 'ubigeo' && value) {
        if (value.length > 0 && !value.startsWith('0')) {
          nextState.ubigeo = '0' + value;
        }
      }

      return nextState;
    });
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
          [`${fieldName}Mime`]: 'image/jpeg',
        }));
      } catch (err) {
        alert('Error al procesar la imagen');
      }
    }
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
    setIsSignatureEmpty(true);
    setHasExistingSignatureUrl(false);
    setSignatureError(false);
    setIsSignatureDirty(true);
    setFormData(prev => ({ ...prev, firma: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSignatureError(false);
    setIsSubmitting(true);

    try {
      let firmaBase64 = formData.firma || '';
      let firmaMime = formData.firmaMime || '';
      const dynamicFirmaName = `${formData.dni || 'sin_dni'} - ${formData.responsable || 'sin_nombre'}.jpeg`;

      if (sigCanvas.current && !sigCanvas.current.isEmpty()) {
        let trimmedCanvas;
        try {
          trimmedCanvas = sigCanvas.current.getTrimmedCanvas();
        } catch (e) {
          console.warn("getTrimmedCanvas falló (error de vite/dev), usando getCanvas", e);
          trimmedCanvas = sigCanvas.current.getCanvas();
        }
        
        const whiteCanvas = document.createElement('canvas');
        whiteCanvas.width = trimmedCanvas.width;
        whiteCanvas.height = trimmedCanvas.height;
        const ctx = whiteCanvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, whiteCanvas.width, whiteCanvas.height);
          ctx.drawImage(trimmedCanvas, 0, 0);
          const dataUrl = whiteCanvas.toDataURL('image/jpeg', 0.9);
          firmaBase64 = dataUrl.split(',')[1];
          firmaMime = 'image/jpeg';
        } else {
          const dataUrl = trimmedCanvas.toDataURL('image/png');
          firmaBase64 = dataUrl.split(',')[1];
          firmaMime = 'image/png';
        }
      } else if (hasExistingSignatureUrl) {
        firmaBase64 = formData.firma || '';
      }

      if (formData.latitud && !String(formData.latitud).startsWith('-')) {
        setErrorMsg('La latitud para la región Cusco debe comenzar con el signo -');
        setIsSubmitting(false);
        setTimeout(() => document.getElementsByName('latitud')[0]?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
        return;
      }

      if (formData.longitud && !String(formData.longitud).startsWith('-')) {
        setErrorMsg('La longitud para la región Cusco debe comenzar con el signo -');
        setIsSubmitting(false);
        setTimeout(() => document.getElementsByName('longitud')[0]?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
        return;
      }

      if (!firmaBase64 && !hasExistingSignatureUrl) {
        setSignatureError(true);
        setIsSubmitting(false);
        setTimeout(() => document.querySelector('.signature-container')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
        return;
      }

      const payload: SyncRequest = {
        ...(formData as SyncRequest),
        uuid: formData.uuid || generateUUID(),
        fechaRegistro: formData.fechaRegistro || new Date().toISOString(),
        firma: firmaBase64,
        firmaName: dynamicFirmaName,
        firmaMime,
        foto1Base64: formData.foto1Base64 || formData.urlFoto1 || '',
        foto2Base64: formData.foto2Base64 || formData.urlFoto2 || '',
        foto3Base64: formData.foto3Base64 || formData.urlFoto3 || '',
      };

      // Try to sync to Google Apps Script
      const isSynced = await syncEntry(payload);

      // Save locally regardless of sync success
      const localRecord: LocalRecord = {
        ...payload,
        id: id || generateUUID(),
        isSynced
      };

      saveRecord(localRecord);
      setIsSubmitting(false);

      if (!isSynced) {
        alert('Se guardó localmente, pero hubo un error al sincronizar con el servidor.');
      }

      navigate('/diagnostico');
    } catch (err: any) {
      console.error(err);
      alert('Error inesperado al guardar: ' + (err.message || String(err)));
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container animate-fade-in">
      <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
        <button type="button" onClick={() => navigate('/diagnostico')} className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ArrowLeft size={16} /> Volver
        </button>
        <h2 className="section-title" style={{ margin: 0, border: 'none' }}>
          {id ? 'Actualizar Diagnóstico' : 'Nuevo Registro Diagnóstico de la IPRESS'}
        </h2>
      </div>

      {errorMsg && (
        <div className="glass-panel" style={{ padding: '1rem', marginBottom: '1rem', borderColor: 'var(--danger)' }}>
          <p style={{ color: 'var(--danger)' }}>{errorMsg}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ padding: '0 0 2rem 0' }}>

        {/* SECCIÓN 1: IDENTIFICACIÓN Y UBICACIÓN */}
        <div className="form-section">
          <h3 className="section-heading">Datos de Ubicación de la IPRESS</h3>

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
                {ipressList
                  .filter(i => i.red === formData.unidadEjecutora)
                  .sort((a, b) => a.nombre.localeCompare(b.nombre))
                  .map((ipress, idx) => (
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
            <label className="form-label">Codigo RENIPRESS</label>
            <input required type="text" name="codigoRenipress" className="form-control" value={formData.codigoRenipress || ''} onChange={handleChange} readOnly={!isOtroUnidad} style={!isOtroUnidad ? { backgroundColor: '#f1f5f9' } : {}} />
          </div>

          <div className="form-group">
            <label className="form-label">Provincia</label>
            <input required type="text" name="provincia" className="form-control" value={formData.provincia || ''} onChange={handleChange} readOnly={!isOtroUnidad} style={!isOtroUnidad ? { backgroundColor: '#f1f5f9' } : {}} />
          </div>
          <div className="form-group">
            <label className="form-label">Distrito</label>
            <input required type="text" name="distrito" className="form-control" value={formData.distrito || ''} onChange={handleChange} readOnly={!isOtroUnidad} style={!isOtroUnidad ? { backgroundColor: '#f1f5f9' } : {}} />
          </div>
          <div className="form-group">
            <label className="form-label">Centro Poblado donde esta ubicado la IPRESS</label>
            <select
              className="form-control"
              name="centroPobladoSelect"
              value={isOtroCcpp ? 'OTRO' : (formData.centroPoblado || '')}
              onChange={handleChange}
              required
            >
              <option value="">Seleccione un Centro Poblado</option>
              {ccppList
                .filter(c => c.distrito === formData.distrito)
                .sort((a, b) => a.centroPoblado.localeCompare(b.centroPoblado))
                .map((ccpp, idx) => (
                  <option key={idx} value={ccpp.centroPoblado}>{ccpp.centroPoblado}</option>
              ))}
              <option value="OTRO">OTRO</option>
            </select>
          </div>
          
          {isOtroCcpp && (
            <div className="form-group">
              <label className="form-label">Especifique el Centro Poblado</label>
              <input required type="text" name="centroPoblado" className="form-control" value={formData.centroPoblado || ''} onChange={handleChange} />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Ubigeo del CCPP</label>
            <input required type="text" name="ubigeo" className="form-control" value={formData.ubigeo || ''} onChange={handleChange} readOnly={!isOtroCcpp} style={!isOtroCcpp ? { backgroundColor: '#f1f5f9' } : {}} />
          </div>

        </div>

        {/* SECCIÓN 1.5: GEOREFERENCIA */}
        <div className="form-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 className="section-heading" style={{ margin: 0 }}>Georeferencia de La IPRESS</h3>
            <button type="button" className="btn btn-secondary btn-sm" onClick={handleGetLocation}>
              <MapPin size={16} /> Obtener Ubicación
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
            <div>
              <div className="form-group">
                <label className="form-label" style={{ color: 'var(--text-muted)' }}>latitud (x.y °)</label>
                <input required type="number" step="any" name="latitud" className="form-control" value={formData.latitud || ''} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label className="form-label" style={{ color: 'var(--text-muted)' }}>longitud (x.y °)</label>
                <input required type="number" step="any" name="longitud" className="form-control" value={formData.longitud || ''} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label className="form-label" style={{ color: 'var(--text-muted)' }}>altitud (m)</label>
                <input required type="number" step="any" name="altitud" className="form-control" value={formData.altitud || ''} onChange={handleChange} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ color: 'var(--text-muted)' }}>precisión (m)</label>
                <input required type="number" step="any" name="precision" className="form-control" value={formData.precision || ''} onChange={handleChange} />
              </div>
            </div>

            <div style={{ minHeight: '300px', backgroundColor: '#e2e8f0', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border)', position: 'relative' }}>
              {formData.latitud && formData.longitud ? (
                <MapContainer
                  center={[parseFloat(formData.latitud) || 0, parseFloat(formData.longitud) || 0]}
                  zoom={15}
                  style={{ height: '100%', width: '100%' }}
                >
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <Marker
                    draggable={true}
                    eventHandlers={{
                      dragend: (e) => {
                        const marker = e.target;
                        const position = marker.getLatLng();
                        setFormData(prev => ({
                          ...prev,
                          latitud: position.lat.toFixed(6),
                          longitud: position.lng.toFixed(6)
                        }));
                      }
                    }}
                    position={[parseFloat(formData.latitud) || 0, parseFloat(formData.longitud) || 0]}
                  />
                  <RecenterMap lat={parseFloat(formData.latitud) || 0} lng={parseFloat(formData.longitud) || 0} />
                </MapContainer>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
                  <MapPin size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                  <p style={{ textAlign: 'center', padding: '0 2rem' }}>Haga clic en "Obtener Ubicación" o escriba las coordenadas para ver el punto en el mapa</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* SECCIÓN 2: SISTEMA DE AGUA */}
        <div className="form-section">
          <h3 className="section-heading">Datos de la fuente de agua de la IPRESS</h3>

          <div className="form-group">
            <label className="form-label">La IPRESS cuenta con sistema de abastecimiento de agua propio</label>
            <select required name="aguaPropio" className="form-control" value={formData.aguaPropio || 'No'} onChange={handleChange}>
              <option value="Si">Si</option>
              <option value="No">No</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">La Fuente de agua de la IPRESS es mediante</label>
            <select required name="fuenteAgua" className="form-control" value={formData.fuenteAgua || ''} onChange={handleChange}>
              <option value="">Seleccione...</option>
              {FUENTES_AGUA.map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">El Sistema de abastecimiento de agua contempla bombas de agua</label>
            <select required name="bombasAgua" className="form-control" value={formData.bombasAgua || 'No'} onChange={handleChange}>
              <option value="Si">Si</option>
              <option value="No">No</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Las bombas de agua se encuentran operativas</label>
            <select required name="bombasOperativas" className="form-control" value={formData.bombasOperativas || 'No'} onChange={handleChange}>
              <option value="Si">Si</option>
              <option value="No">No</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">La IPRESS cuenta con reservorio de agua</label>
            <select required name="reservorio" className="form-control" value={formData.reservorio || 'No'} onChange={handleChange}>
              <option value="Si">Si</option>
              <option value="No">No</option>
            </select>
          </div>
          {formData.reservorio === 'Si' && (
            <>
              <div className="form-group">
                <label className="form-label">Tipo de material del Reservorio</label>
                <input required type="text" name="tipoMaterialReservorio" className="form-control" value={formData.tipoMaterialReservorio || ''} onChange={handleChange} placeholder="Ej. Concreto, Geomembrana, etc." />
              </div>
              <div className="form-group">
                <label className="form-label">Volumen del Reservorio (m3)</label>
                <input required type="number" step="any" name="volumenReservorio" className="form-control" value={formData.volumenReservorio || ''} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label className="form-label">El reservorio es elevado</label>
                <select required name="reservorioElevado" className="form-control" value={formData.reservorioElevado || 'No'} onChange={handleChange}>
                  <option value="Si">Si</option>
                  <option value="No">No</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">El reservorio se encuentra operativo</label>
                <select required name="reservorioOperativo" className="form-control" value={formData.reservorioOperativo || 'No'} onChange={handleChange}>
                  <option value="Si">Si</option>
                  <option value="No">No</option>
                </select>
              </div>
            </>
          )}
          <div className="form-group">
            <label className="form-label">La IPRESS cuenta con cisterna de agua</label>
            <select required name="cisterna" className="form-control" value={formData.cisterna || 'No'} onChange={handleChange}>
              <option value="Si">Si</option>
              <option value="No">No</option>
            </select>
          </div>
          {formData.cisterna === 'Si' && (
            <>
              <div className="form-group">
                <label className="form-label">Volumen de la Cisterna (m3)</label>
                <input required type="number" step="any" name="volumenCisterna" className="form-control" value={formData.volumenCisterna || ''} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label className="form-label">La cisterna de agua se encuentra operativo</label>
                <select required name="cisternaOperativa" className="form-control" value={formData.cisternaOperativa || 'No'} onChange={handleChange}>
                  <option value="Si">Si</option>
                  <option value="No">No</option>
                </select>
              </div>
            </>
          )}
          <div className="form-group">
            <label className="form-label">Se realiza algun tipo de tratamiento al agua en la IPRESS</label>
            <select required name="tratamientoAgua" className="form-control" value={formData.tratamientoAgua || 'No'} onChange={handleChange}>
              <option value="Si">Si</option>
              <option value="No">No</option>
            </select>
          </div>

          <PhotoInput label="Foto Observacion 1" fieldName="foto1" formData={formData} handleFileChange={handleFileChange} />
          <PhotoInput label="Foto Observacion 2" fieldName="foto2" formData={formData} handleFileChange={handleFileChange} />
          <PhotoInput label="Foto Observacion 3" fieldName="foto3" formData={formData} handleFileChange={handleFileChange} />
          <div className="form-group">
            <label className="form-label">Fecha</label>
            <input required type="date" name="fecha" className="form-control" value={formData.fecha || ''} min={(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })()} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label className="form-label">Hora</label>
            <input required type="time" name="hora" className="form-control" value={formData.hora || ''} onChange={handleChange} />
          </div>
        </div>

        {/* SECCIÓN 3: RESPONSABLE Y FINALIZACIÓN */}
        <div className="form-section">
          <h3 className="section-heading">Datos del responsable</h3>

          <div className="form-group">
            <label className="form-label">Nombre del responsable de la vigilancia de la calidad del agua</label>
            <input required type="text" name="responsable" className="form-control" value={formData.responsable || ''} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label className="form-label">DNI</label>
            <input required type="number" name="dni" className="form-control" value={formData.dni || ''} onChange={handleChange} />
          </div>

          <div className="form-group">
            <label className="form-label">Observaciones</label>
            <textarea name="observaciones" className="form-control" rows={3} value={formData.observaciones || ''} onChange={handleChange}></textarea>
          </div>

          <div className="form-group" style={{ marginTop: '1.5rem' }}>
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
                      /* 
                       * TÉCNICA DE EVASIÓN CORS: 
                       * 'no-referrer' evita que el navegador envíe la cabecera HTTP Referer. 
                       * Esto engaña a Google Drive haciéndole creer que la petición es directa 
                       * y no originada desde un dominio externo (localhost/github pages), previniendo el bloqueo CORS. 
                       */
                      referrerPolicy="no-referrer"
                      style={{ maxWidth: '100%', maxHeight: '120px', objectFit: 'contain', display: isSignatureLoading ? 'none' : 'block' }} 
                      onLoad={() => setIsSignatureLoading(false)}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        
                        /* SISTEMA DE TRIPLE FALLBACK */
                        
                        // 1. Si falla la URL original (uc?export=view), intentamos con el CDN directo (lh3)
                        // lh3.googleusercontent.com es una red de entrega de contenido (CDN) de Google que a menudo 
                        // tiene políticas CORS más relajadas para servir imágenes públicamente.
                        if (target.src.includes('uc?export=view')) {
                          const fileId = formData.firma!.split('id=')[1];
                          if (fileId) {
                            target.src = `https://lh3.googleusercontent.com/d/${fileId}`;
                            return;
                          }
                        }
                        
                        // 2. Si lh3 falla, intentamos con la API de generación de miniaturas (thumbnail)
                        // Esta API genera una previsualización dinámica y suele evadir bloqueos persistentes.
                        if (target.src.includes('lh3.googleusercontent.com')) {
                          const fileId = formData.firma!.split('id=')[1];
                          if (fileId) {
                            target.src = `https://drive.google.com/thumbnail?id=${fileId}&sz=w800`;
                            return;
                          }
                        }
                        
                        // 3. Si todos los métodos automáticos fallan (restricciones extremas del navegador como 
                        // bloqueo de cookies de terceros), mostramos un fallback seguro con un botón.
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

        <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate('/diagnostico')}
            disabled={isSubmitting}
          >
            Cancelar
          </button>
          <button 
            type="submit" 
            className="btn btn-primary" 
            disabled={isSubmitting || (JSON.stringify(formData) === JSON.stringify(initialData) && !isSignatureDirty)}
          >
            {isSubmitting ? <RefreshCw className="animate-spin" size={20} /> : <Save size={20} />}
            {isSubmitting ? 'Guardando...' : 'Guardar Registro'}
          </button>
        </div>

      </form>
    </div>
  );
};
