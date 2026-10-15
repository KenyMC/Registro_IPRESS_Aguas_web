# Guía de Versionamiento y Actualización Forzada de la Aplicación (PWA)

Este documento detalla el procedimiento oficial para **actualizar la versión del aplicativo** cuando se implementan cambios significativos (nuevos campos, corrección de errores críticos, cambios de base de datos o interfaces), garantizando que **todos los dispositivos de los usuarios (móviles y computadoras) se actualicen automáticamente** a la última versión sin quedarse bloqueados en memorias caché antiguas ni mostrar pantallas en blanco.

---

## 1. ¿Por qué es necesario forzar la actualización?

El sistema está desarrollado como una **PWA (Progressive Web App)** con capacidades offline. Los navegadores (especialmente en teléfonos móviles como Chrome, Safari o navegadores integrados):
1. Guardan copias fijas de los archivos JavaScript, CSS y HTML en el almacenamiento interno (`CacheStorage` y `ServiceWorker`).
2. En teléfonos móviles no existe la combinación de teclas `Ctrl + F5` para refrescar forzadamente.
3. Si el código cambia en el servidor pero el celular sigue ejecutando el JavaScript antiguo en caché, el usuario puede experimentar errores graves como **pantalla en blanco** o datos desfasados.

Para resolver esto, el aplicativo cuenta con un **sistema de autodetección y purgado forzado de caché**.

---

## 2. Dónde se configura la versión

La versión de la aplicación está sincronizada en dos puntos clave del código fuente:

1. **[`src/main.tsx`](file:///C:/Users/nemes/.gemini/antigravity-ide/scratch/Registro_IPRESS_Aguas/src/main.tsx)**:
   ```typescript
   const APP_VERSION = '1.4.3';
   ```
2. **[`src/App.tsx`](file:///C:/Users/nemes/.gemini/antigravity-ide/scratch/Registro_IPRESS_Aguas/src/App.tsx)**:
   ```typescript
   const CURRENT_APP_VERSION = '1.4.3';
   ```

---

## 3. ¿Qué ocurre automáticamente cuando incrementas la versión?

Cuando un usuario abre el aplicativo y su dispositivo detecta que la versión del servidor es diferente a la versión que tenía guardada en `localStorage`:

1. **Protección de Datos Locales**: Se conservan en memoria los registros que el usuario haya guardado sin conexión (`aguas_ipress_records`), evitando cualquier pérdida de trabajo.
2. **Eliminación de Caché Obsoleta**: Se ejecutan llamadas a `caches.keys()` para eliminar por completo todos los cachés antiguos de la PWA (`caches.delete`).
3. **Desregistro de Service Workers**: Se desregistran los Service Workers antiguos (`registration.unregister()`) para impedir que sigan sirviendo archivos viejos.
4. **Verificación Inmediata**: En lugar de esperar 60 minutos, el nuevo Service Worker verifica de inmediato si hay código nuevo en el servidor (`r.update()`).
5. **Recarga Limpia Automática**: La página se reinicia sola (`window.location.reload()`), cargando inmediatamente el nuevo código compilado sin que el usuario tenga que hacer nada manual.
6. **Protector de Fallos (`ErrorBoundary`)**: Si por alguna lentitud de red un archivo viejo falla antes de recargar, el componente [`ErrorBoundary.tsx`](file:///C:/Users/nemes/.gemini/antigravity-ide/scratch/Registro_IPRESS_Aguas/src/components/ErrorBoundary.tsx) intercepta el error, borra la caché y muestra un botón directo de **"Limpiar Caché y Actualizar"** en lugar de dejar la pantalla en blanco.

---

## 4. Procedimiento paso a paso ante Cambios Significativos

Cada vez que realices cambios de impacto (nuevas vistas, modificaciones de columnas, corrección de bugs visuales o de cálculo):

### Paso 1: Incrementar el número de versión
Aumenta el número de versión (por ejemplo, de `1.4.0` a `1.4.1` para correcciones, o `1.5.0` para nuevas funciones) en:
- `src/main.tsx` (`APP_VERSION`)
- `src/App.tsx` (`CURRENT_APP_VERSION`)

### Paso 2: Registrar en el CHANGELOG
Agrega la nueva versión y el resumen de lo realizado en [`CHANGELOG.md`](file:///C:/Users/nemes/.gemini/antigravity-ide/scratch/Registro_IPRESS_Aguas/CHANGELOG.md):
```markdown
## [1.4.1] - YYYY-MM-DD
### Añadido / Arreglado
- Descripción clara de la nueva funcionalidad o corrección.
```

### Paso 3: Compilar y Desplegar
Ejecuta la secuencia estándar de despliegue en la consola:
```powershell
npm run deploy
git add .
git commit -m "feat(o fix): descripción de cambios y subida a versión X.X.X"
git push origin main
```

> **Nota:** `npm run deploy` ejecuta internamente `npm run build` y publica la carpeta `dist` en la rama `gh-pages` de GitHub Pages.

---

## 5. Resumen de Buenas Prácticas

| Situación | ¿Subir Versión? | Impacto en el Usuario |
|---|:---:|---|
| Corrección de ortografía menor o estilos cosméticos locales | Opcional | Los usuarios lo verán gradualmente al renovar caché natural. |
| Corrección de error crítico / pantalla en blanco | **SÍ (Obligatorio)** | Fuerzan a los teléfonos y PCs a purgar archivos rotos al instante. |
| Nuevos módulos, gráficos, o filtros por rol (como Redes) | **SÍ (Obligatorio)** | Todos los usuarios reciben la nueva lógica de forma sincronizada. |
| Nuevas columnas en Google Sheets o sincronización | **SÍ (Obligatorio)** | Previene errores de discrepancia entre formularios y base de datos. |
