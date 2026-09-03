# Changelog
Todos los cambios notables de este proyecto serán documentados en este archivo.

## [1.3.0] - 2026-09-03
### Añadido
- **Exportación Masiva a Excel (XLSX):** 
  - Se implementó un nuevo botón "Exportar Excel" en las tablas de Diagnóstico y Monitoreo, ubicado estratégicamente junto a la paginación inferior.
  - La exportación está profundamente integrada con el sistema de Roles (RBAC), garantizando que los usuarios de nivel IPRESS, Hospital o Red solo puedan exportar y descargar los datos que tienen permitidos visualizar.
  - El archivo resultante extrae y limpia dinámicamente campos técnicos pesados (como cadenas Base64 de las fotos y firmas), omitiendo también columnas redundantes como `tipo` y `estado`, produciendo un reporte analítico puro, liviano y listo para tabular.
  - **Formato Optimizado:** La columna identificadora interna (`uuid`) fue renombrada amigablemente a `id` y fijada como la primera columna del documento.
  - El orden de las filas del Excel se configuró como Cronológico Ascendente y las hojas de cálculo se renombraron dinámicamente a "Diagnósticos" y "Monitoreos".

## [1.2.2] - 2026-09-02
### Añadido / Cambiado
- **Rediseño Institucional de Informes PDF:** 
  - **Cabecera Oficial:** Se eliminó el recuadro azul genérico. Ahora incluye el logo rojo del Gobierno Regional del Cusco (izquierda) y el logo de la Gerencia Regional de Salud (derecha), ocupando dinámicamente todo el ancho disponible. En el centro se muestra el texto institucional subrayado elegantemente en color dorado.
  - **Pie de Página Oficial:** Se incorporó el logo de PVCACH (gota) junto con el texto "Generado por Sistema de Calidad de Agua IPRESS...", manteniendo una distancia prudente (`paddingBottom`) con la sección de firmas para evitar superposiciones en caso de que el documento crezca.
  - **Títulos Inteligentes y Adaptables:** Se eliminó la palabra "EJECUTIVO" y ahora los títulos integran el nombre de la IPRESS. Se corrigió un problema visual donde textos muy largos se desbordaban y se implementó lógica inteligente para usar el prefijo gramatical adecuado (ej. *DEL HOSPITAL* en lugar de *DE LA IPRESS HOSPITAL*).
  - **Remoción de UUID:** Se ocultó el campo interno "Nro. Registro / UUID" en la impresión física del PDF para mayor limpieza visual.

## [1.2.1] - 2026-09-02
### Añadido
- **Cascada Distritos a Centros Poblados (CCPP):** Se agregó una pestaña adicional y lógica para autocompletar la lista de Centros Poblados según el Distrito de la IPRESS seleccionada. El selector de CCPP permanece bloqueado (deshabilitado) hasta que se elija una IPRESS válida.
- **Normalización de Textos en Búsquedas:** El cruce entre el Distrito de la IPRESS y el Distrito del CCPP ahora ignora mayúsculas, minúsculas y acentos (tildes), lo que evita errores de consistencia (ej: "UNIÓN ASHANINKA" === "UNION ASHANINKA").
- **Conservación de Ceros a la Izquierda para Ubigeos:** 
  - Al seleccionar un CCPP desde el CSV, el sistema asegura de rellenar el Ubigeo con ceros a la izquierda (longitud de 10).
  - Al enviar a la API (Google Sheets), se fuerza como texto anteponiendo un apóstrofe (`'`) para evitar que la hoja de cálculo recorte los ceros (ej: `'0808010001`).
  - Al imprimir el reporte PDF, se remueve inteligentemente el apóstrofe para limpiar la visualización.
- **Centrado Dinámico de Fotos en PDF:** La lógica de generación de cuadrículas en el PDF de `ReportePDF.tsx` ahora detecta si la cantidad de fotos es impar (1 o 3 fotos) y centra el bloque inferior para lograr simetría, aplicando perfectamente para los reportes de Monitoreo (1 foto) o los de Diagnóstico que no tengan las 3 completas.
- **Robustez Extrema contra CORS en `localhost`:** El script `imageUtils.ts` fue modificado para usar la URL directa de la API de Miniaturas de Google Drive (`drive.google.com/thumbnail`) que es más amigable a ser pasada por proxies (`corsproxy.io`, `api.codetabs.com`). Además, se agregó verificación del MIME Type (`blob.type.startsWith('image/')`) para descartar que los proxies estén devolviendo páginas de error de Google, garantizando que el PDF cargue fotos de manera consistente incluso en entornos restringidos locales.

## [1.2.0] - 2026-09-01
### Añadido
- **Descarga de Informes en PDF:** Se ha implementado un nuevo botón dorado con icono de descarga (`Download`) en la columna "Acciones" de las listas de Diagnóstico y Monitoreo.
- **Generación Nativa de PDF (`@react-pdf/renderer`):** Al hacer clic en descargar, la aplicación genera localmente un PDF de estilo ejecutivo profesional. El texto es 100% seleccionable.
- **Prevención de Bloqueos CORS para Imágenes en PDF:** Se creó la utilidad `imageUtils.ts` que implementa un sistema de triple fallback para capturar las fotos desde Google Drive antes de inyectarlas en el PDF. Si falla la petición directa, usa el Thumbnail API y, en último caso, un Proxy público para asegurar que la descarga no se rompa por restricciones del navegador.
- **Hook `usePdfDownloader`:** Centraliza la lógica asíncrona de generación del archivo y muestra un spinner de carga (`Loader2`) mientras se procesa.

### Solucionado
- **Imágenes invisibles en PDF:** Se refactorizó por completo el sistema de obtención de imágenes para el PDF, usando directamente la API de Miniaturas de Google Drive (`thumbnail`). Esto arregla el problema de carga de fotos en `localhost` y reduce el tiempo de descarga del PDF de más de 1 minuto a solo unos segundos.
- **Firma invisible en PDF:** La firma ahora se procesa exactamente igual que las fotografías (sin usar canvas intermediario). Si la firma original era transparente, podría mostrarse con fondo oscuro si Drive lo provee así, pero garantiza que la imagen *siempre* se cargue de forma segura y veloz al tamaño de la línea.
- **Formato del Código RENIPRESS:** Se estandarizó el uso de 8 dígitos para el código RENIPRESS (ej. `00002465`), implementando auto-completado con ceros a la izquierda (`padStart`) tanto al crear, editar como al generar PDFs.
- **Campos y Fechas en PDF:** Se añadió el campo `Ubigeo del CCPP` al reporte de Diagnóstico. Se mejoró el formato visual de la fecha y hora generada en los PDFs, ocultando el ISO string.

## [1.1.1] - 2026-08-31
### Añadido
- **Botón Cancelar en Formularios:** Se agregó el botón "Cancelar" en la parte inferior de los formularios de Diagnóstico y Monitoreo para mejorar la consistencia UX, permitiendo regresar a la lista de registros de forma explícita.
- **Scroll Segura para Validación Nativa:** Se implementó `scroll-margin-top: 120px` en los elementos `.form-control` (index.css) para evitar que los tooltips nativos de validación de HTML ("Completa este campo") queden ocultos detrás del menú superior flotante.

### Cambiado
- **Corrección de Formato Numérico "0":** Solucionado un problema en `MonitoreoList.tsx` donde los valores de `0` (ej: 0 en cloro residual o pH) se renderizaban erróneamente como un guión (`-`). Ahora se respetan los ceros ingresados.
- **Orden Alfabético en Listas Desplegables:** 
  - Se ordenaron alfabéticamente las opciones estáticas (`UNIDADES_EJECUTORAS`, `FUENTES_AGUA`, `PUNTOS_MONITOREO`) en `Diagnostico.tsx` y `Monitoreo.tsx`, manteniendo "Otro" / "Otros" al final de la lista.
  - El selector dinámico de "Nombre de la IPRESS" ahora se ordena de forma alfabética al vuelo según la unidad ejecutora seleccionada.

## [1.1.0] - 2026-08-27
### Añadido
- **Control de Versiones PWA (Forzado de Caché):** Se ha implementado un mecanismo global en `main.tsx` (`APP_VERSION = '1.1.0'`) que detecta automáticamente si el usuario está en una versión antigua de los datos. En ese caso, purga su Storage, elimina cachés obsoletos, y fuerza una recarga en un entorno prístino (deslogueando automáticamente) para prevenir bugs silenciosos.
- **Auto-Actualización Inteligente del Service Worker:** VitePWA ahora está configurado de forma agresiva (`cleanupOutdatedCaches: true`, `skipWaiting: true`, `clientsClaim: true`) para asegurar que todo dispositivo obtenga el nuevo código tan pronto esté disponible en la red.
- **Sincronización en "Tiempo Real" (Polleo Rápido):** El intervalo de auto-actualización en segundo plano de la aplicación (`App.tsx`) ha sido acelerado de 2 minutos a 15 segundos. Los usuarios verán las ediciones y eliminaciones de otros usuarios de manera casi inmediata en sus pantallas.

### Cambiado
- **Refactorización del Motor de Fusión (`storage.ts > mergeRecords`):** 
  - La lógica de fusión ha cambiado de *añadir/actualizar* a *reemplazar sincronizados*.
  - Ahora, el cliente solo conserva sus registros "pendientes de subida". Todo registro previamente sincronizado se descarta de la memoria local y se adopta la lista pura que devuelve el servidor.
  - **Sincronización de Eliminaciones:** Como resultado de este diseño, si un administrador o usuario elimina un registro en Google Sheets, automáticamente desaparecerá del navegador de todos los clientes (en combinación con el polleo rápido).

## [1.0.0]
### Añadido
- **Técnica de Evasión de CORS para Imágenes de Google Drive:** Se ha implementado un mecanismo robusto para renderizar la firma digital almacenada en Google Drive directamente en el recuadro de previsualización (componente `Diagnostico.tsx`).
  - **Uso de `referrerPolicy="no-referrer"`:** Esto previene que el navegador envíe la cabecera `Referer`, evitando que Google Drive bloquee la carga de la imagen al detectar que proviene de un origen cruzado (CORS).
  - **Sistema de Triple Fallback (Carga Escalonada):**
    1. **Intento 1 (Original):** Carga nativa mediante la URL `uc?export=view`.
    2. **Intento 2 (CDN lh3):** Si falla (disparando el evento `onError`), la URL muta al dominio CDN de alta disponibilidad de Google (`lh3.googleusercontent.com/d/ID`).
    3. **Intento 3 (Thumbnail API):** Si lh3 también falla, se recurre a la API pública de miniaturas (`drive.google.com/thumbnail?id=ID&sz=w800`).
    4. **Intento 4 (Fallback Final):** Si todos los métodos automáticos son bloqueados por restricciones extremas del navegador, se renderiza de forma elegante un enlace para abrir la firma en una nueva pestaña.
