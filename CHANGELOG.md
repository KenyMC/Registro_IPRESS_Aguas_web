# Changelog
Todos los cambios notables de este proyecto serán documentados en este archivo.

## [1.2.0] - 2026-09-01
### Añadido
- **Descarga de Informes en PDF:** Se ha implementado un nuevo botón dorado con icono de descarga (`Download`) en la columna "Acciones" de las listas de Diagnóstico y Monitoreo.
- **Generación Nativa de PDF (`@react-pdf/renderer`):** Al hacer clic en descargar, la aplicación genera localmente un PDF de estilo ejecutivo profesional. El texto es 100% seleccionable.
- **Prevención de Bloqueos CORS para Imágenes en PDF:** Se creó la utilidad `imageUtils.ts` que implementa un sistema de triple fallback para capturar las fotos desde Google Drive antes de inyectarlas en el PDF. Si falla la petición directa, usa el Thumbnail API y, en último caso, un Proxy público para asegurar que la descarga no se rompa por restricciones del navegador.
- **Hook `usePdfDownloader`:** Centraliza la lógica asíncrona de generación del archivo y muestra un spinner de carga (`Loader2`) mientras se procesa.

### Solucionado
- **Imágenes invisibles en PDF:** Se implementó una técnica basada en Canvas y un proxy visual (`lh3.googleusercontent.com`) replicando el motor de previsualización para forzar la incrustación a Base64 sin error de Tainted Canvas.

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
