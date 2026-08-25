# Changelog
Todos los cambios notables de este proyecto serán documentados en este archivo.

## [Unreleased]
### Añadido
- **Técnica de Evasión de CORS para Imágenes de Google Drive:** Se ha implementado un mecanismo robusto para renderizar la firma digital almacenada en Google Drive directamente en el recuadro de previsualización (componente `Diagnostico.tsx`).
  - **Uso de `referrerPolicy="no-referrer"`:** Esto previene que el navegador envíe la cabecera `Referer`, evitando que Google Drive bloquee la carga de la imagen al detectar que proviene de un origen cruzado (CORS).
  - **Sistema de Triple Fallback (Carga Escalonada):**
    1. **Intento 1 (Original):** Carga nativa mediante la URL `uc?export=view`.
    2. **Intento 2 (CDN lh3):** Si falla (disparando el evento `onError`), la URL muta al dominio CDN de alta disponibilidad de Google (`lh3.googleusercontent.com/d/ID`).
    3. **Intento 3 (Thumbnail API):** Si lh3 también falla, se recurre a la API pública de miniaturas (`drive.google.com/thumbnail?id=ID&sz=w800`).
    4. **Intento 4 (Fallback Final):** Si todos los métodos automáticos son bloqueados por restricciones extremas del navegador, se renderiza de forma elegante un enlace para abrir la firma en una nueva pestaña.
