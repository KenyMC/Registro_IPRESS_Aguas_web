# DOCUMENTACIÓN TÉCNICA Y MAPA DE CÓDIGO FUENTE (SISTEMA DE CONTROL IPRESS)

> **PROPÓSITO DE ESTE DOCUMENTO:**  
> Este documento sirve como **guía maestra de lectura rápida** para el agente y desarrolladores.  
> Cada vez que se solicite un cambio o ajuste, **se debe consultar este archivo primero** para ubicar de inmediato las funciones, estados y bloques de código exactos sin necesidad de escanear miles de líneas a ciegas.  
> **REGLA OBLIGATORIA:** Toda nueva mejora, refactorización o cambio debe registrar sus fragmentos de código y ubicación en este documento.

---

## 1. MAPA DE ARCHIVOS Y RESPONSABILIDADES

| Archivo | Ubicación | Responsabilidad Principal |
|---|---|---|
| **`Home.tsx`** | [`src/pages/Home.tsx`](file:///c:/Users/nemes/.gemini/antigravity-ide/scratch/Registro_IPRESS_Aguas/src/pages/Home.tsx) | Dashboard general, 5 KPIs, 3 gráficos interactivos, filtros superiores, modal de cobertura y función de exportación completa a Excel. |
| **`excelNativeCharts.ts`** | [`src/utils/excelNativeCharts.ts`](file:///c:/Users/nemes/.gemini/antigravity-ide/scratch/Registro_IPRESS_Aguas/src/utils/excelNativeCharts.ts) | Generador de gráficos nativos dinámicos de Excel (OpenXML `<c:chartSpace>`, barras/columnas, dona/anillo) e inyección con `JSZip`. |
| **`ipressData.ts`** | [`src/services/ipressData.ts`](file:///c:/Users/nemes/.gemini/antigravity-ide/scratch/Registro_IPRESS_Aguas/src/services/ipressData.ts) | Catálogo maestro de 371 IPRESS y Hospitales, normalización de códigos RENIPRESS (`normalizeRenipress`, `matchRenipress`). |
| **`storage.ts`** | [`src/services/storage.ts`](file:///c:/Users/nemes/.gemini/antigravity-ide/scratch/Registro_IPRESS_Aguas/src/services/storage.ts) | Persistencia local (`localStorage`), almacenamiento offline, sincronización con backend (`aguas_ipress_records`). |
| **`api.ts`** | [`src/services/api.ts`](file:///c:/Users/nemes/.gemini/antigravity-ide/scratch/Registro_IPRESS_Aguas/src/services/api.ts) | Comunicación HTTP con Google Apps Script (lectura y escritura de Diagnósticos y Monitoreos). |
| **`App.tsx`** | [`src/App.tsx`](file:///c:/Users/nemes/.gemini/antigravity-ide/scratch/Registro_IPRESS_Aguas/src/App.tsx) | Enrutador principal, verificación de versión PWA (`CURRENT_APP_VERSION`), purgado de caché y registro de Service Worker. |
| **`main.tsx`** | [`src/main.tsx`](file:///c:/Users/nemes/.gemini/antigravity-ide/scratch/Registro_IPRESS_Aguas/src/main.tsx) | Punto de entrada, forzado de actualización de versión PWA (`APP_VERSION`) y limpieza selectiva de `localStorage`. |
| **`CHANGELOG.md`** | [`CHANGELOG.md`](file:///c:/Users/nemes/.gemini/antigravity-ide/scratch/Registro_IPRESS_Aguas/CHANGELOG.md) | Historial cronológico de cambios de cara a versiones y funcionalidades. |

---

## 2. ARQUITECTURA DETALLADA DE `src/pages/Home.tsx`

El componente [`Home.tsx`](file:///c:/Users/nemes/.gemini/antigravity-ide/scratch/Registro_IPRESS_Aguas/src/pages/Home.tsx) consta de aproximadamente 2300 líneas estructuradas en bloques bien delimitados:

### A. Estados de Filtros y Control (Líneas ~200 - 310)
- `dashboardRedFilter`: Red o Unidad Ejecutora seleccionada (`'Todas'` o nombre de la Red).
- `dashboardIpressFilter`: Establecimiento específico seleccionado (`'Todos'` o ID/Nombre del establecimiento).
- `dateFrom` y `dateTo`: Rango de fechas activo (`YYYY-MM-DD`).
- `selectedWeekIdx`: Índice de la semana seleccionada para el Gráfico 2 (0-indexed).
- `ipressOptionsList`: Lista calculada de establecimientos (`IPRESS` y `Hospital`) filtrada por `targetRed` y ordenada alfabéticamente.
- `selectedIpressObj`: Objeto del establecimiento seleccionado o `undefined`.
- `scopeLabel`: Etiqueta del ámbito activo (`selectedIpressObj.label` > Red > `'Región Cusco'`).

```typescript
// Fragmento clave: Determinación del Ámbito (Scope)
const ipressOptionsList = Array.from(
  new Map(
    usersList
      .filter(u => (u.rol === 'IPRESS' || u.rol === 'Hospital') && (targetRed === 'Todas' || matchRedName(u.red, targetRed)))
      .map(u => {
        const label = String(u.nombreIpress || u.usuario || '').trim();
        return [label, {
          id: label,
          label,
          red: String(u.red || '').trim(),
          rol: String(u.rol || '').trim(),
          codigoRenipress: String(u.codigoRenipress || '').trim(),
          rawUser: u
        }] as const;
      })
      .filter(([k]) => k !== '')
  ).values()
).sort((a, b) => a.label.localeCompare(b.label, 'es'));

const selectedIpressObj = dashboardIpressFilter !== 'Todos'
  ? ipressOptionsList.find(item => item.id === dashboardIpressFilter)
  : undefined;

const scopeLabel = selectedIpressObj
  ? selectedIpressObj.label
  : (targetRed === 'Todas' ? 'Región Cusco' : targetRed);
```

### B. Cálculo de Estadísticas Semanales y Mensuales (`useEffect`, Líneas ~350 - 900)
1. **Lógica de inicialización de fechas:** Calcula la fecha mínima (`dbMinDate`) y máxima (`dbMaxDate`) de los registros existentes.
2. **Filtrado de Población:** Si `dashboardIpressFilter !== 'Todos'`, se acota la población a ese único establecimiento y se filtran sus registros tanto por RENIPRESS como por coincidencias de nombre.
3. **Generación de Semanas por Mes (`buildWeeksForMonth`):**
   - Semana 1: 01 al 07
   - Semana 2: 08 al 14
   - Semana 3: 15 al 21
   - Semana 4: 22 al 28
   - Semana 5: 29 al fin de mes
4. **Desglose Diario (`dailyBreakdown`):** Mapeo de lunes a domingo computando monitoreos únicos por IPRESS por día (si una IPRESS realiza múltiples monitoreos el mismo día, cuenta como 1).
5. **Generación de `monthlyComplianceList`:** Arreglo con todos los meses comprendidos entre `dateFrom` y `dateTo`, calculando sus semanas y porcentajes.

```typescript
// Fragmento clave: Iteración de meses entre activeDateFrom y activeDateTo
let currIterDate = new Date(fromYear, fromMonth, 1);
const endIterDate = new Date(toYear, toMonth, 1);

while (currIterDate <= endIterDate) {
  const y = currIterDate.getFullYear();
  const m = currIterDate.getMonth();
  const monthTitle = `${monthNamesFull[m]} ${y}`;
  const mWeeks = buildWeeksForMonth(y, m);
  monthlyList.push({
    year: y,
    month: m,
    monthTitle,
    weeks: mWeeks
  });
  currIterDate.setMonth(currIterDate.getMonth() + 1);
}
```

### C. Exportación a Excel con Gráficos Nativos Dinámicos (`exportDashboardExcel`, Líneas ~915 - 1460)
- **Hoja 1 (`Dashboard de Gestión`):**
  - **Banner institucional y parámetros:** `Unidad Ejecutora`, `Establecimiento`, `Rango de Fechas`, `Fecha de Emisión`.
  - **5 Tarjetas KPI:** Celdas B6:F7 con estilos y colores corporativos.
  - **Sección 1 (Cumplimiento Semanal):** Recorre `gestionStats.monthlyComplianceList` imprimiendo una tabla con fórmulas `=MAX(0,D-E)` e `=IF(D>0,E/D,0)` (`numFmt = '0%'`), más el gráfico nativo OpenXML vinculado dinámicamente (`buildNativeBarChartXml`) para **cada mes del rango**.
  - **Sección 2:**
    - Si el ámbito es Regional (`targetRed === 'Todas' && !selectedIpressObj`): Gráfico de barras horizontales por Red (`barDir: 'bar'`).
    - Si es Red o Establecimiento: Gráfico de columnas verticales con el Desglose Diario Lunes a Domingo (`barDir: 'col'`).
    - Gráfico 3: Anillo (*Doughnut*) nativo de Cobertura de Diagnósticos.
  - Inyección de gráficos en el binario `.xlsx` mediante `injectNativeChartsIntoXlsxBuffer(rawBuffer, chartsToInject)`.
- **Hoja 2 (`Detalle de Diagnósticos`):**
  - Exporta los 33 campos analíticos del diagnóstico.
  - Columna final `¿Tiene Diagnóstico?` (SÍ en verde `#DCFCE7`, NO en rojo `#FEE2E2`).
  - Filtrada estrictamente por `targetRed` y `dashboardIpressFilter`.
- **Hoja 3 (`Detalle de Monitoreos`):**
  - Tabla de muestras (Fecha, Red, IPRESS, RENIPRESS, Cloro, pH, Turbiedad, Temp), respetando los filtros activos.

```typescript
// Fragmento clave: Inyección de múltiples gráficos nativos OpenXML
const rawBuffer = await workbook.xlsx.writeBuffer();
const bufferWithNativeCharts = await injectNativeChartsIntoXlsxBuffer(rawBuffer as ArrayBuffer, chartsToInject);
const blob = new Blob([bufferWithNativeCharts], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
```

### D. Renderizado JSX del Dashboard (Líneas ~1500 - 2300)
1. **Barra Superior de Filtros:** Justificada en una sola fila armónica a todo el ancho (`display: flex; justify-content: space-between`):
   - Selector 1: `Filtrar por Unidad Ejecutora` (al cambiar resetea `dashboardIpressFilter` a `'Todos'`).
   - Selector 2: `Establecimiento de salud:` (lista todas las IPRESS/Hospitales del ámbito).
   - Selector 3: `Rango de fecha:` (Inputs nativos tipo `date` con validación de fecha mínima `dbMinDate`).
   - Botón: `Exportar Dashboard Excel` (con estado de carga `isExportingExcel`).
2. **Fila Horizontal de 5 Tarjetas KPI (`.dashboard-kpi-row`):**
   - Establecimientos Región Cusco / Red / Hospital
   - Registros de Monitoreos
   - IPRESS c/ Monitoreo (7d)
   - IPRESS con Diagnósticos
   - Falta Diagnóstico
3. **Gráfico 1 (`#chart-container-weekly`):** Gráfico de barras Recharts de cumplimiento mensual del mes más reciente.
4. **Gráfico 2 (`#chart-container-ipress-red`):** Gráfico con selector de semana; conmuta entre vista regional horizontal o desglose diario de lunes a domingo.
5. **Gráfico 3 (`#chart-container-cobertura`):** Gráfico de dona agrandado sin animaciones intermitentes (`isAnimationActive={false}`), panel de cifras fijo lateral y flecha animada hacia el botón **Ver Detalle**.
6. **Modal de Detalle (`showDetalleModal`):** Lista con buscador y botón para exportar detalle a Excel.

---

## 3. ARQUITECTURA DEL MOTOR DE GRÁFICOS NATIVOS OPENXML (`src/utils/excelNativeCharts.ts`)

En lugar de incrustar imágenes PNG estáticas, este módulo genera archivos OpenXML nativos de Excel dentro del archivo `.zip` (`.xlsx`):

- **`buildNativeBarChartXml(params)`**: Genera el XML `<c:chartSpace>` para gráficos de columnas (`col`) o barras horizontales (`bar`), vinculando categorías (`<c:cat>`) y series (`<c:ser>`) con fórmulas de celdas (`<c:f>`) y cachés de valores (`<c:numCache>`, `<c:strCache>`).
- **`buildNativeDoughnutChartXml(params)`**: Genera el XML para gráficos de dona/anillo nativos con colores personalizados de sectores (`<c:dPt>`).
- **`injectNativeChartsIntoXlsxBuffer(xlsxBuffer, charts)`**:
  - Abre el buffer `.xlsx` con `JSZip`.
  - Inyecta `xl/charts/chart1.xml` ... `xl/charts/chartN.xml`.
  - Modifica `xl/drawings/drawing1.xml` creando un ancla `<xdr:twoCellAnchor>` por cada gráfico con sus coordenadas de celda exactas (`fromCol`, `fromRow`, `toCol`, `toRow`).
  - Añade relaciones en `xl/drawings/_rels/drawing1.xml.rels`.
  - Registra el dibujo en `xl/worksheets/_rels/sheet1.xml.rels`.
  - Modifica `xl/worksheets/sheet1.xml` para incluir `<drawing r:id="rIdDrawing1"/>`.
  - Agrega los `Override` en `[Content_Types].xml`.

---

## 4. HISTORIAL DE MEJORAS CLAVE Y FRAGMENTOS IMPLEMENTADOS

### Versión 1.5.2 (2026-11-02)
- **Sección 3 en Hoja 1 (`Dashboard de Gestión`): 10 Gráficos de Torta/Anillo Nativos Dinámicos de Excel para el Estado Situacional del Sistema de Agua:**
  - Se implementó la nueva sección **`3. CARACTERÍSTICAS Y ESTADO SITUACIONAL DEL SISTEMA DE AGUA (${scopeLabel})`** ubicada debajo de los gráficos de la Sección 2.
  - Se estructuró en pares armónicos de 2 columnas (Bloque Izquierdo en cols B-D y Bloque Derecho en cols G-I), alineados directamente con la Sección 2:
    - **Par 1:** `1. Fuente de Agua` (cols B-D) y `2. Tratamiento de Agua` (cols G-I).
    - **Par 2:** `3. Tiene Reservorio` (cols B-D) y `4. Reservorio Operativo` (cols G-I).
    - **Par 3:** `5. Tipo de Reservorio` (cols B-D) y `6. Reservorio Elevado` (cols G-I).
    - **Par 4:** `7. Tiene Cisterna` (cols B-D) y `8. Cisterna Operativa` (cols G-I).
    - **Par 5:** `9. Bombas de Agua` (cols B-D) y `10. Bombas Operativas` (cols G-I).
  - Cada bloque consta de:
    - Tabla estructurada con encabezados dinámicos (`Categoría`, `Cantidad IPRESS` / `Cantidad Hospital`, `Porcentaje`).
    - Fórmulas de cálculo de porcentaje nativas en Excel: `=IF(SUM($C$start:$C$end)>0, C_r/SUM($C$start:$C$end), 0)` con formato `0%`.
    - Gráfico de anillo (*Doughnut Chart*) nativo OpenXML vinculado dinámicamente a las celdas de la tabla con etiquetas de datos mostrando valor y porcentaje (`<c:showVal val="1"/>`, `<c:showPercent val="1"/>`).
  - Adaptabilidad total según el ámbito: regional (`Región Cusco`), por red ejecutora o por establecimiento de salud individual (`scopeLabel`).

```typescript
// Fragmento clave: Renderizado dinámico de pares de indicadores en Sección 3 de Excel
indicatorPairs.forEach(([leftSpec, rightSpec]) => {
  const pairHeaderRow = currentRow;
  wsDashboard.getCell(`B${pairHeaderRow}`).value = leftSpec.title;
  wsDashboard.getCell(`G${pairHeaderRow}`).value = rightSpec.title;

  const tableHeaderRow = pairHeaderRow + 1;
  // Encabezados y datos con fórmulas dinámicas
  // ...
  const leftChartXml = buildNativeDoughnutChartXml({
    title: `${leftSpec.title} (${scopeLabel})`,
    nameFormula: `'${sheetName}'!$C$${tableHeaderRow}`,
    seriesName: leftSpec.countHeader,
    categoriesFormula: `'${sheetName}'!$B$${dataStartRow}:$B$${leftEndRow}`,
    categories: leftSpec.categories.map(c => c.name),
    valuesFormula: `'${sheetName}'!$C$${dataStartRow}:$C$${leftEndRow}`,
    values: leftSpec.categories.map(c => c.count),
    sliceColors: leftSpec.sliceColors
  });

  chartsToInject.push({
    xml: leftChartXml,
    name: `Gráfico ${leftSpec.title}`,
    fromCol: 1,
    fromRow: chartZeroRowStart,
    toCol: 5,
    toRow: chartZeroRowEnd
  }, {
    xml: rightChartXml,
    name: `Gráfico ${rightSpec.title}`,
    fromCol: 6,
    fromRow: chartZeroRowStart,
    toCol: 9,
    toRow: chartZeroRowEnd
  });

  currentRow = chartZeroRowEnd + 2;
});
```

### Versión 1.5.1 (2026-11-02)
- **Formato Especial para Hospitales y Establecimientos Individuales en Excel:**
  - Cuando se filtra por una Unidad Ejecutora `Hospital` y la cantidad es 1 (o establecimiento individual):
    - La cabecera muestra `Establecimiento: <Nombre>` y fechas en formato `DD-MM-YYYY al DD-MM-YYYY`.
    - Se configuran exactamente 4 tarjetas KPI: `Establecimiento: <Nombre>` (1), `Registros de Monitoreos` (total), `Hospital con Diagnóstico` (1), `Falta Diagnóstico` (0).
    - Encabezados de tabla semanal de sección 1: `Semana`, `Período`, `Cantidad Hospital`, `Cant. Hospital Monitoreado`, `Falta Monitorear`, `% Cumplimiento`, `Total Registros`.
- **Coincidencia Flexible `matchEstablishmentName` y Orden Oficial de Columnas en Diagnósticos:**
  - Se implementó `cleanEstablishmentName` y `matchEstablishmentName` para evitar fallos de coincidencia cuando los nombres presentan prefijos/sufijos institucionales (ej. "Hospital Antonio Lorena" vs "Antonio Lorena del Cusco").
  - Se corrigió el orden de columnas en `wsDiag` y `exportarDetalleExcel`:
    `Tiene Reservorio` → `Tipo Reservorio` → `Volumen Reservorio (m3)` → `Reservorio Elevado` → `Reservorio Operativo` → `Tiene Cisterna` → `Volumen Cisterna (m3)` → `Cisterna Operativa` → `Tratamiento de Agua`.

```typescript
// Fragmento clave: Coincidencia flexible de nombres de establecimientos
const cleanEstablishmentName = (n?: any): string => {
  if (!n) return '';
  return String(n)
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\b(hospital|hosp|c\.s\.|cs|p\.s\.|ps|puesto de salud|centro de salud|del cusco|cusco)\b/gi, '')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const matchEstablishmentName = (nameA?: any, nameB?: any): boolean => {
  if (!nameA || !nameB) return false;
  const sA = String(nameA).trim().toLowerCase();
  const sB = String(nameB).trim().toLowerCase();
  if (sA === sB) return true;
  const cA = cleanEstablishmentName(nameA);
  const cB = cleanEstablishmentName(nameB);
  return Boolean(cA && cB && (cA === cB || cA.includes(cB) || cB.includes(cA)));
};
```

### Versión 1.5.0 (2026-11-02)
- **Filtro por Establecimiento de salud en Dashboard:**
  - Se agregó estado `dashboardIpressFilter` y selector en la barra superior.
  - Al seleccionar un establecimiento, los KPIs, gráficos, títulos y exportaciones se adaptan automáticamente a `scopeLabel`.
- **Desglose Mensual Completo en Excel Descargado:**
  - El Excel ahora genera un cuadro semanal y su gráfico nativo OpenXML correspondiente por cada mes del rango de fechas (por ejemplo Agosto, Setiembre y Octubre sucesivamente).

### Versión 1.4.9 (2026-10-30)
- **Reemplazo de Imágenes por Gráficos Nativos Dinámicos de Excel:**
  - Se desarrolló `src/utils/excelNativeCharts.ts`. Los gráficos en el archivo `.xlsx` ya no son capturas estáticas; son gráficos interactivos nativos de Excel vinculados a las fórmulas de las celdas.

### Versión 1.4.8 (2026-10-27)
- **Simetría y Justificación de Filtros Superiores:** Barra a todo el ancho de la ventana.
- **Estabilización de Gráficos:** Eliminación de desaparición de texto en la dona con `isAnimationActive={false}` y cifras laterales permanentes.
- **Desglose Diario de Lunes a Domingo:** Selector dinámico de semana para el avance diario de IPRESS únicas monitoreadas.

---

## 5. INSTRUCCIÓN OPERATIVA PARA EL MODELO

Cuando el usuario pida cualquier ajuste o mejora:
1. **Leer primero este archivo (`DOCUMENTACION_TECNICA.md`):** Identificar de inmediato qué función, estado o componente debe modificarse.
2. **Aplicar la edición de forma quirúrgica** con `read_file` y `edit_file` en el rango de líneas exacto.
3. **Registrar la nueva versión** en `package.json`, `src/main.tsx` (`APP_VERSION`), `src/App.tsx` (`CURRENT_APP_VERSION`), `CHANGELOG.md` y en este archivo con sus fragmentos de código relevantes.
4. **Compilar y desplegar** verificando código de salida 0.

