# Changelog
Todos los cambios notables de este proyecto serán documentados en este archivo.

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
