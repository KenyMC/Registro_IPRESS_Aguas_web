# Regla de Documentación y Flujo de Desarrollo Ágil

## Contexto
El usuario ha establecido como regla obligatoria que, para hacer los cambios de forma rápida y precisa sin leer miles de líneas a ciegas, el modelo debe consultar la documentación técnica central y mantenerla permanentemente actualizada con los fragmentos de código de las mejoras implementadas.

## Reglas Obligatorias de Flujo de Trabajo

1. **Lectura Previa Obligatoria (`DOCUMENTACION_TECNICA.md`)**:
   - Cada vez que el usuario pida un ajuste, corrección o nueva funcionalidad, el modelo **DEBE leer primero** el archivo [`DOCUMENTACION_TECNICA.md`](file:///c:/Users/nemes/.gemini/antigravity-ide/scratch/Registro_IPRESS_Aguas/DOCUMENTACION_TECNICA.md).
   - En dicho archivo encontrará el mapa exacto de archivos, funciones, estados de React, rangos de líneas y la lógica técnica para ubicar el código de inmediato.

2. **Actualización de Fragmentos de Código en `DOCUMENTACION_TECNICA.md`**:
   - Siempre que se implemente una mejora o ajuste, se debe agregar el resumen y los **fragmentos de código clave** en [`DOCUMENTACION_TECNICA.md`](file:///c:/Users/nemes/.gemini/antigravity-ide/scratch/Registro_IPRESS_Aguas/DOCUMENTACION_TECNICA.md) en la sección correspondiente.

3. **Comentarios en el Código Fuente**:
   - Agregar comentarios breves y concisos en los fragmentos afectados explicando el "por qué" y el "qué" del cambio.

4. **Registro en `CHANGELOG.md` y Versionamiento**:
   - Todo cambio debe quedar registrado en [`CHANGELOG.md`](file:///c:/Users/nemes/.gemini/antigravity-ide/scratch/Registro_IPRESS_Aguas/CHANGELOG.md).
   - Incrementar la versión en `package.json`, `src/main.tsx` (`APP_VERSION`) y `src/App.tsx` (`CURRENT_APP_VERSION`) según la guía de [`VERSIONAMIENTO_Y_ACTUALIZACIONES.md`](file:///c:/Users/nemes/.gemini/antigravity-ide/scratch/Registro_IPRESS_Aguas/VERSIONAMIENTO_Y_ACTUALIZACIONES.md) para forzar la actualización de caché en los dispositivos móviles y navegadores.

5. **Cierre de Tarea**:
   - Nunca finalices una tarea de modificación de código sin haber actualizado tanto el código como la documentación técnica con sus fragmentos.
