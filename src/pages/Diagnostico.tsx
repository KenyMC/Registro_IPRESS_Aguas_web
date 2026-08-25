import { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import SignatureCanvas from 'react-signature-canvas';
import { syncEntry, SyncRequest } from '../services/api';
import { saveRecord, getRecordById, LocalRecord } from '../services/storage';
import { getCachedIpressList, IpressRecord } from '../services/ipressData';
import { MapPin, Save, RefreshCw, ArrowLeft, PenTool } from 'lucide-react';
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
  "Red Cusco Norte", "Red Cusco Sur", "Red Cusco VRAEM", 
  "Red CCE", "Red Chumbivilcas", "Red La Convencion", "Hospital", "Otro"
];

const FUENTES_AGUA = [
  "La Red Publica", "Manante", "Riachuelo", "Pozo", 
  "Camion Cisterna", "Agua de lluvia"
];

export const Diagnostico = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const sigCanvas = useRef<SignatureCanvas>(null);
  
  const [formData, setFormData] = useState<Partial<SyncRequest>>({
    tipo: 'diagnostico',
    estado: 'Activo',
    aguaPropio: 'No',
    bombasAgua: 'No',
    bombasOperativas: 'No',
    reservorio: 'No',
    reservorioElevado: 'No',
    reservorioOperativo: 'No',
    cisterna: 'No',
    cisternaOperativa: 'No',
    tratamientoAgua: 'No',
    unidadEjecutora: UNIDADES_EJECUTORAS[0],
    fuenteAgua: FUENTES_AGUA[0],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  const [ipressList, setIpressList] = useState<IpressRecord[]>([]);
  const [isOtroUnidad, setIsOtroUnidad] = useState(false);
  const [isSignatureEmpty, setIsSignatureEmpty] = useState(true);
  const [hasExistingSignatureUrl, setHasExistingSignatureUrl] = useState(false);

  useEffect(() => {
    const list = getCachedIpressList();
    setIpressList(list);
  }, []);

  useEffect(() => {
    if (id) {
      const existing = getRecordById(id);
      if (existing && existing.tipo === 'diagnostico') {
        setFormData(existing);
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
              sigCanvas.current?.fromDataURL(existing.firma!);
            }, 100);
          }
        }
      }
    } else {
      // New record defaults to first option, check if it's 'Otro'
      setIsOtroUnidad(UNIDADES_EJECUTORAS[0] === 'Otro');
    }
  }, [id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;

    if (name === 'unidadEjecutora') {
      const isOtro = value === 'Otro' || value === '';
      setIsOtroUnidad(isOtro);
      setFormData(prev => ({ 
        ...prev, 
        unidadEjecutora: value,
        nombreIpress: '',
        codigoRenipress: '',
        provincia: '',
        distrito: ''
      }));
      return;
    }

    if (name === 'nombreIpress' && !isOtroUnidad) {
      const selected = ipressList.find(i => i.nombre === value && i.red === formData.unidadEjecutora);
      if (selected) {
        setFormData(prev => ({
          ...prev,
          nombreIpress: value,
          codigoRenipress: selected.codigo,
          provincia: selected.provincia,
          distrito: selected.distrito
        }));
        return;
      }
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
    setFormData(prev => ({ ...prev, firma: '' }));
    setIsSignatureEmpty(true);
    setHasExistingSignatureUrl(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg('');

    let firmaBase64 = formData.firma || '';
    let firmaName = formData.firmaName || '';
    let firmaMime = formData.firmaMime || '';
    
    if (sigCanvas.current && !sigCanvas.current.isEmpty()) {
      const dataUrl = sigCanvas.current.toDataURL('image/png');
      firmaBase64 = dataUrl.split(',')[1];
      firmaName = 'firma.png';
      firmaMime = 'image/png';
    } else if (hasExistingSignatureUrl) {
      firmaBase64 = formData.firma || '';
    }

    if (!firmaBase64 && !hasExistingSignatureUrl) {
      setErrorMsg('Debe ingresar la firma del responsable.');
      setIsSubmitting(false);
      window.scrollTo(0, document.body.scrollHeight);
      return;
    }

    const payload: SyncRequest = {
      ...(formData as SyncRequest),
      uuid: formData.uuid || crypto.randomUUID(),
      fechaRegistro: formData.fechaRegistro || new Date().toISOString(),
      firma: firmaBase64,
      firmaName,
      firmaMime,
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
            <label className="form-label">Codigo RENIPRESS</label>
            <input required type="number" name="codigoRenipress" className="form-control" value={formData.codigoRenipress || ''} onChange={handleChange} readOnly={!isOtroUnidad} style={!isOtroUnidad ? { backgroundColor: '#f1f5f9' } : {}} />
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
            <input required type="text" name="centroPoblado" className="form-control" value={formData.centroPoblado || ''} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label className="form-label">Ubigeo del CCPP</label>
            <input required type="number" name="ubigeo" className="form-control" value={formData.ubigeo || ''} onChange={handleChange} />
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
          <div className="form-group">
            <label className="form-label">La IPRESS cuenta con cisterna de agua</label>
            <select required name="cisterna" className="form-control" value={formData.cisterna || 'No'} onChange={handleChange}>
              <option value="Si">Si</option>
              <option value="No">No</option>
            </select>
          </div>
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
          <div className="form-group">
            <label className="form-label">Se realiza algun tipo de tratamiento al agua en la IPRESS</label>
            <select required name="tratamientoAgua" className="form-control" value={formData.tratamientoAgua || 'No'} onChange={handleChange}>
              <option value="Si">Si</option>
              <option value="No">No</option>
            </select>
          </div>
          
          <div className="form-group">
            <label className="form-label">Foto Observacion 1</label>
            <input type="file" accept="image/*" className="form-control" onChange={(e) => handleFileChange(e, 'foto1')} />
            {formData.foto1Name && <small style={{ color: 'var(--primary)' }}>Cargado: {formData.foto1Name}</small>}
          </div>
          <div className="form-group">
            <label className="form-label">Foto Observacion 2</label>
            <input type="file" accept="image/*" className="form-control" onChange={(e) => handleFileChange(e, 'foto2')} />
            {formData.foto2Name && <small style={{ color: 'var(--primary)' }}>Cargado: {formData.foto2Name}</small>}
          </div>
          <div className="form-group">
            <label className="form-label">Foto Observacion 3</label>
            <input type="file" accept="image/*" className="form-control" onChange={(e) => handleFileChange(e, 'foto3')} />
            {formData.foto3Name && <small style={{ color: 'var(--primary)' }}>Cargado: {formData.foto3Name}</small>}
          </div>
          <div className="form-group">
            <label className="form-label">Fecha</label>
            <input required type="date" name="fecha" className="form-control" value={formData.fecha || ''} onChange={handleChange} />
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
            <textarea required name="observaciones" className="form-control" rows={3} value={formData.observaciones || ''} onChange={handleChange}></textarea>
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
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%', padding: '2rem' }}>
                  <div style={{ backgroundColor: 'rgba(76, 175, 80, 0.1)', color: '#4caf50', padding: '1rem', borderRadius: '50%', marginBottom: '1rem' }}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"></path></svg>
                  </div>
                  <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text)' }}>Firma Registrada</h4>
                  <p style={{ margin: '0 0 1rem 0', color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center' }}>Por seguridad, Google Drive no permite incrustar la imagen directamente.</p>
                  <a href={formData.firma} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', backgroundColor: 'var(--primary)', color: 'white', padding: '0.5rem 1rem', borderRadius: '4px', textDecoration: 'none', fontSize: '0.9rem' }}>
                    Abrir Firma en Nueva Pestaña
                  </a>
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
                    onBegin={() => setIsSignatureEmpty(false)} 
                    penColor="black" 
                    canvasProps={{ className: 'signature-canvas' }} 
                  />
                </>
              )}
            </div>
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
