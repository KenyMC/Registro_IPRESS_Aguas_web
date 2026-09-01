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
    border: '2pt solid #1e3a8a',
    padding: 20,
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    borderBottomWidth: 1.5,
    borderBottomColor: '#d4af37', // Dorado
    paddingBottom: 15,
  },
  headerTitle: {
    fontSize: 16,
    color: '#1e3a8a',
    fontWeight: 'bold',
    textAlign: 'center',
    flex: 1,
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
  footerText: {
    position: 'absolute',
    bottom: 10,
    left: 20,
    right: 20,
    textAlign: 'center',
    fontSize: 8,
    color: '#94a3b8',
  }
});

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

export const ReporteDocument: React.FC<PdfProps> = ({ record, images }) => {
  const isDiag = record.tipo === 'diagnostico';

  return (
    <Document>
      {/* PÁGINA 1: DATOS */}
      <Page size="A4" style={styles.page}>
        <View style={styles.borderWrapper}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>
              {isDiag ? 'INFORME EJECUTIVO DE DIAGNÓSTICO' : 'INFORME EJECUTIVO DE MONITOREO'}
            </Text>
          </View>

          <View style={styles.sectionTitle}><Text>1. IDENTIFICACIÓN Y UBICACIÓN</Text></View>
          <View style={styles.row}><Text style={styles.label}>Nro. Registro / UUID:</Text><Text style={styles.value}>{record.uuid?.split('-')[0] || '-'}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Fecha y Hora:</Text><Text style={styles.value}>{renderValue(record.fecha)} {renderValue(record.hora)}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Unidad Ejecutora / Red:</Text><Text style={styles.value}>{renderValue(record.unidadEjecutora)}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Nombre de IPRESS:</Text><Text style={styles.value}>{renderValue(record.nombreIpress)}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Código RENIPRESS:</Text><Text style={styles.value}>{renderValue(record.codigoRenipress)}</Text></View>
          
          {isDiag && (
            <>
              <View style={styles.row}><Text style={styles.label}>Provincia:</Text><Text style={styles.value}>{renderValue(record.provincia)}</Text></View>
              <View style={styles.row}><Text style={styles.label}>Distrito:</Text><Text style={styles.value}>{renderValue(record.distrito)}</Text></View>
              <View style={styles.row}><Text style={styles.label}>Centro Poblado:</Text><Text style={styles.value}>{renderValue(record.centroPoblado)}</Text></View>
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
        <Text style={styles.footerText} fixed>Generado por Sistema de Calidad de Agua IPRESS - GERESA Cusco</Text>
      </Page>

      {/* PÁGINA 2: EVIDENCIAS FOTOGRÁFICAS (solo si hay fotos) */}
      {(images.foto1 || images.foto2 || images.foto3) && (
        <Page size="A4" style={styles.page}>
          <View style={styles.borderWrapper}>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>ANEXO: EVIDENCIAS FOTOGRÁFICAS</Text>
            </View>
            
            <View style={styles.imageRow}>
              {images.foto1 && (
                <View style={styles.imageBlock}>
                  <Image src={images.foto1} style={styles.photo} />
                  <Text style={styles.photoLabel}>Foto 1</Text>
                </View>
              )}
              {images.foto2 && (
                <View style={styles.imageBlock}>
                  <Image src={images.foto2} style={styles.photo} />
                  <Text style={styles.photoLabel}>Foto 2</Text>
                </View>
              )}
              {images.foto3 && (
                <View style={styles.imageBlock}>
                  <Image src={images.foto3} style={styles.photo} />
                  <Text style={styles.photoLabel}>Foto 3</Text>
                </View>
              )}
            </View>
          </View>
          <Text style={styles.footerText} fixed>Generado por Sistema de Calidad de Agua IPRESS - GERESA Cusco</Text>
        </Page>
      )}
    </Document>
  );
};
