# Regla de Documentación Obligatoria

## Contexto
El usuario ha solicitado de forma explícita que todos los cambios o mejoras en el código sean documentados sin excepción, ya que en el pasado se omitieron algunos cambios.

## Reglas
1. **Comentarios en el Código**: Siempre que realices un cambio en la lógica, estilos o estructura del código, debes agregar comentarios breves y concisos en los fragmentos afectados explicando el "por qué" y el "qué" del cambio.
2. **Registro en CHANGELOG.md**: Todo cambio, por más pequeño que sea (bug fixes, refactorizaciones, nuevas features, mejoras de UI/UX), DEBE quedar registrado en el archivo `CHANGELOG.md` del proyecto en su versión correspondiente (o creando un nuevo parche/versión menor si aplica).
3. Nunca finalices una tarea de modificación de código sin antes haber cumplido los puntos 1 y 2.
