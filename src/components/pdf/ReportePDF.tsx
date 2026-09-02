import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import { LocalRecord } from '../../services/storage';

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 10,
    fontFamily: 'Helvetica',
    backgroundColor: '#ffffff',
  },
  borderWrapper: {
    padding: 20,
    paddingBottom: 40,
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
  },
  headerLogos: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  headerInstitution: {
    textAlign: 'center',
    flex: 1,
  },
  instText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 2,
  },
  headerLogoImg: {
    height: 45,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 15,
  },
  headerTitle: {
    fontSize: 16,
    color: '#1e3a8a',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    backgroundColor: '#f8fafc',
    padding: 6,
    marginTop: 15,
    marginBottom: 10,
    color: '#0f172a',
    borderLeftWidth: 4,
    borderLeftColor: '#d4af37',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e2e8f0',
    paddingBottom: 4,
  },
  label: {
    width: '45%',
    fontWeight: 'bold',
    color: '#475569',
  },
  value: {
    width: '55%',
    color: '#0f172a',
  },
  imageRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  imageBlock: {
    width: '48%',
    marginBottom: 15,
  },
  photo: {
    width: '100%',
    height: 180,
    objectFit: 'cover',
    borderRadius: 4,
    border: '1pt solid #cbd5e1',
  },
  photoLabel: {
    marginTop: 5,
    textAlign: 'center',
    fontSize: 9,
    color: '#64748b',
  },
  firmaContainer: {
    marginTop: 'auto', // Empujar al fondo
    alignItems: 'center',
    paddingTop: 30,
  },
  firmaImage: {
    width: 140,
    height: 70,
    objectFit: 'contain',
  },
  firmaLine: {
    borderTopWidth: 1,
    borderTopColor: '#000',
    width: 200,
    marginTop: 5,
    marginBottom: 5,
  },
  firmaName: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  footer: {
    position: 'absolute',
    bottom: 12,
    left: 30,
    right: 30,
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 0.5,
    borderTopColor: '#cbd5e1',
    paddingTop: 10,
  },
  footerLogo: {
    height: 25,
    width: 25,
    marginRight: 8,
    objectFit: 'contain',
  },
  footerText: {
    fontSize: 8,
    color: '#64748b',
  }
});

const getAssetUrl = (filename: string) => {
  // En producción (GitHub Pages) el pathname incluye el subdirectorio del repo.
  // Resolvemos la ruta de la imagen en base a eso para que no de 404.
  let basePath = window.location.pathname;
  if (!basePath.endsWith('/')) {
    basePath += '/';
  }
  return new URL(filename, window.location.origin + basePath).href;
};

const getReportTitle = (tipo: string, ipressName: string) => {
  const name = (ipressName || '').toUpperCase();
  const titleBase = tipo === 'diagnostico' ? 'INFORME DE DIAGNÓSTICO' : 'INFORME DE MONITOREO';
  if (name.includes('HOSPITAL')) {
    return `${titleBase} DEL ${name}`;
  }
  return `${titleBase} DE LA IPRESS ${name}`;
};

interface PdfProps {
  record: LocalRecord;
  images: {
    foto1: string;
    foto2: string;
    foto3: string;
    firma: string;
  };
}

const renderValue = (val: any) => {
  return (val !== undefined && val !== null && val !== '') ? String(val) : '-';
};

const formatRenipress = (val: any) => {
  if (!val || val === '-') return '-';
  return String(val).padStart(8, '0');
};

const formatDateStr = (dateStr: any) => {
  if (!dateStr || dateStr === '-') return '-';
  const str = String(dateStr);
  if (str.includes('T')) {
    const parts = str.split('T')[0].split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  const parts = str.split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return str;
};

const formatTimeStr = (timeStr: any) => {
  if (!timeStr || timeStr === '-') return '';
  const str = String(timeStr);
  if (str.includes('T')) {
    return str.split('T')[1].substring(0, 5);
  }
  return str.substring(0, 5);
};

export const ReporteDocument: React.FC<PdfProps> = ({ record, images }) => {
  const isDiag = record.tipo === 'diagnostico';

  const renderHeaderAndTitle = () => (
    <>
      <View style={styles.headerLogos}>
        <Image src={getAssetUrl('logo-cusco.jpg')} style={styles.headerLogoImg} />
        <View style={styles.headerInstitution}>
          <View style={{ borderBottomWidth: 1.5, borderBottomColor: '#d4af37', paddingBottom: 4, alignItems: 'center' }}>
            <Text style={styles.instText}>GOBIERNO REGIONAL DEL CUSCO</Text>
            <Text style={styles.instText}>GERENCIA REGIONAL DE SALUD CUSCO</Text>
          </View>
        </View>
        <Image src={getAssetUrl('logo-diresa.png')} style={styles.headerLogoImg} />
      </View>
      <View style={styles.titleContainer}>
        <Text style={styles.headerTitle}>
          {getReportTitle(record.tipo, record.nombreIpress)}
        </Text>
      </View>
    </>
  );

  const renderFooter = () => (
    <View style={styles.footer} fixed>
      <Image src={getAssetUrl('logo-pvcach.png')} style={styles.footerLogo} />
      <Text style={styles.footerText}>Generado por Sistema de Calidad de Agua IPRESS - PVCACH Cusco</Text>
    </View>
  );

  return (
    <Document>
      {/* PÁGINA 1: DATOS */}
      <Page size="A4" style={styles.page}>
        <View style={styles.borderWrapper}>
          {renderHeaderAndTitle()}

          <View style={styles.sectionTitle}><Text>1. IDENTIFICACIÓN Y UBICACIÓN</Text></View>
          <View style={styles.row}><Text style={styles.label}>Fecha y Hora:</Text><Text style={styles.value}>{formatDateStr(record.fecha)} {formatTimeStr(record.hora)}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Unidad Ejecutora / Red:</Text><Text style={styles.value}>{renderValue(record.unidadEjecutora)}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Nombre de IPRESS:</Text><Text style={styles.value}>{renderValue(record.nombreIpress)}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Código RENIPRESS:</Text><Text style={styles.value}>{formatRenipress(record.codigoRenipress)}</Text></View>
          
          {isDiag && (
            <>
              <View style={styles.row}><Text style={styles.label}>Provincia:</Text><Text style={styles.value}>{renderValue(record.provincia)}</Text></View>
              <View style={styles.row}><Text style={styles.label}>Distrito:</Text><Text style={styles.value}>{renderValue(record.distrito)}</Text></View>
              <View style={styles.row}><Text style={styles.label}>Centro Poblado:</Text><Text style={styles.value}>{renderValue(record.centroPoblado)}</Text></View>
              <View style={styles.row}>
                <Text style={styles.label}>Ubigeo del CCPP:</Text>
                <Text style={styles.value}>
                  {(() => {
                    let u = renderValue(record.ubigeo);
                    if (u.startsWith("'")) u = u.substring(1);
                    if (u !== '-' && u.length > 0 && !u.startsWith('0')) u = '0' + u;
                    return u;
                  })()}
                </Text>
              </View>
              <View style={styles.row}><Text style={styles.label}>Coordenadas:</Text><Text style={styles.value}>{renderValue(record.latitud)}, {renderValue(record.longitud)}</Text></View>
            </>
          )}

          {isDiag ? (
            <>
              <View style={styles.sectionTitle}><Text>2. DATOS TÉCNICOS</Text></View>
              <View style={styles.row}><Text style={styles.label}>Abastecimiento Propio:</Text><Text style={styles.value}>{renderValue(record.aguaPropio)}</Text></View>
              <View style={styles.row}><Text style={styles.label}>Fuente de Agua:</Text><Text style={styles.value}>{renderValue(record.fuenteAgua)}</Text></View>
              <View style={styles.row}><Text style={styles.label}>¿Tiene Bombas de Agua?:</Text><Text style={styles.value}>{renderValue(record.bombasAgua)}</Text></View>
              <View style={styles.row}><Text style={styles.label}>¿Están Operativas?:</Text><Text style={styles.value}>{renderValue(record.bombasOperativas)}</Text></View>
              <View style={styles.row}><Text style={styles.label}>¿Tiene Reservorio?:</Text><Text style={styles.value}>{renderValue(record.reservorio)}</Text></View>
              <View style={styles.row}><Text style={styles.label}>Material de Reservorio:</Text><Text style={styles.value}>{renderValue(record.tipoMaterialReservorio)}</Text></View>
              <View style={styles.row}><Text style={styles.label}>¿Reservorio Operativo?:</Text><Text style={styles.value}>{renderValue(record.reservorioOperativo)}</Text></View>
              <View style={styles.row}><Text style={styles.label}>¿Tiene Cisterna?:</Text><Text style={styles.value}>{renderValue(record.cisterna)}</Text></View>
              <View style={styles.row}><Text style={styles.label}>¿Cisterna Operativa?:</Text><Text style={styles.value}>{renderValue(record.cisternaOperativa)}</Text></View>
              <View style={styles.row}><Text style={styles.label}>¿Realiza Tratamiento?:</Text><Text style={styles.value}>{renderValue(record.tratamientoAgua)}</Text></View>
            </>
          ) : (
            <>
              <View style={styles.sectionTitle}><Text>2. PARÁMETROS DE MONITOREO</Text></View>
              <View style={styles.row}><Text style={styles.label}>Punto de Monitoreo:</Text><Text style={styles.value}>{renderValue(record.puntosMonitoreo)}</Text></View>
              <View style={styles.row}><Text style={styles.label}>Cloro Residual (mg/L):</Text><Text style={styles.value}>{renderValue(record.cloro)}</Text></View>
              <View style={styles.row}><Text style={styles.label}>Temperatura (°C):</Text><Text style={styles.value}>{renderValue(record.temperatura)}</Text></View>
              <View style={styles.row}><Text style={styles.label}>pH:</Text><Text style={styles.value}>{renderValue(record.ph)}</Text></View>
              <View style={styles.row}><Text style={styles.label}>Turbiedad (UNT):</Text><Text style={styles.value}>{renderValue(record.turbiedad)}</Text></View>
              <View style={styles.row}><Text style={styles.label}>Conductividad (µS/cm):</Text><Text style={styles.value}>{renderValue(record.conductividad)}</Text></View>
              <View style={styles.row}><Text style={styles.label}>Sólidos Totales (STD):</Text><Text style={styles.value}>{renderValue(record.std)}</Text></View>
              <View style={styles.row}><Text style={styles.label}>Análisis Bacteriológico:</Text><Text style={styles.value}>{renderValue(record.analisisBacteriologico)}</Text></View>
            </>
          )}

          <View style={styles.sectionTitle}><Text>3. OBSERVACIONES</Text></View>
          <View style={{ marginBottom: 10 }}>
            <Text style={{ color: '#0f172a' }}>{renderValue(record.observaciones)}</Text>
          </View>

          {/* FIRMA (si cabe, se pone al fondo. Sino pasará a otra página) */}
          <View style={styles.firmaContainer} wrap={false}>
            {images.firma ? (
              <Image src={images.firma} style={styles.firmaImage} />
            ) : (
              <View style={{ height: 50 }} />
            )}
            <View style={styles.firmaLine} />
            <Text style={styles.firmaName}>{renderValue(record.responsable)}</Text>
            <Text style={{ fontSize: 9, color: '#64748b' }}>DNI: {renderValue(record.dni)}</Text>
            <Text style={{ fontSize: 9, color: '#64748b' }}>Responsable de Inspección</Text>
          </View>
        </View>
        {renderFooter()}
      </Page>

      {/* PÁGINA 2: EVIDENCIAS FOTOGRÁFICAS (solo si hay fotos) */}
      {(images.foto1 || images.foto2 || images.foto3) && (
        <Page size="A4" style={styles.page}>
          <View style={styles.borderWrapper}>
            {renderHeaderAndTitle()}
            <View style={[styles.sectionTitle, { marginTop: 15 }]}><Text>ANEXO: EVIDENCIAS FOTOGRÁFICAS</Text></View>
            
            {(() => {
              const validImages = [
                { src: images.foto1, label: 'Foto 1' },
                { src: images.foto2, label: 'Foto 2' },
                { src: images.foto3, label: 'Foto 3' }
              ].filter(i => i.src);

              if (validImages.length === 1) {
                return (
                  <View style={[styles.imageRow, { justifyContent: 'center' }]}>
                    <View style={styles.imageBlock}>
                      <Image src={validImages[0].src} style={styles.photo} />
                      <Text style={styles.photoLabel}>{validImages[0].label}</Text>
                    </View>
                  </View>
                );
              }
              
              if (validImages.length === 2) {
                return (
                  <View style={styles.imageRow}>
                    <View style={styles.imageBlock}>
                      <Image src={validImages[0].src} style={styles.photo} />
                      <Text style={styles.photoLabel}>{validImages[0].label}</Text>
                    </View>
                    <View style={styles.imageBlock}>
                      <Image src={validImages[1].src} style={styles.photo} />
                      <Text style={styles.photoLabel}>{validImages[1].label}</Text>
                    </View>
                  </View>
                );
              }

              if (validImages.length === 3) {
                return (
                  <>
                    <View style={styles.imageRow}>
                      <View style={styles.imageBlock}>
                        <Image src={validImages[0].src} style={styles.photo} />
                        <Text style={styles.photoLabel}>{validImages[0].label}</Text>
                      </View>
                      <View style={styles.imageBlock}>
                        <Image src={validImages[1].src} style={styles.photo} />
                        <Text style={styles.photoLabel}>{validImages[1].label}</Text>
                      </View>
                    </View>
                    <View style={[styles.imageRow, { justifyContent: 'center' }]}>
                      <View style={styles.imageBlock}>
                        <Image src={validImages[2].src} style={styles.photo} />
                        <Text style={styles.photoLabel}>{validImages[2].label}</Text>
                      </View>
                    </View>
                  </>
                );
              }

              return null;
            })()}
          </View>
          {renderFooter()}
        </Page>
      )}
    </Document>
  );
};
