# Sistema de Control de Calidad de Agua en IPRESS

Aplicativo web progresivo (PWA) para el registro, diagnóstico y monitoreo de la calidad de agua en las Instituciones Prestadoras de Servicios de Salud (IPRESS), Hospitales y Redes de Salud de la Región Cusco.

---

## Documentación Clave
- **[Guía de Versionamiento y Actualización Forzada de la Aplicación](VERSIONAMIENTO_Y_ACTUALIZACIONES.md)**: Procedimiento obligatorio ante cambios significativos para garantizar que los dispositivos de los usuarios descarguen la versión más reciente y purguen la caché automáticamente.
- **[Historial de Cambios (CHANGELOG.md)](CHANGELOG.md)**: Bitácora de versiones, nuevas funciones y correcciones aplicadas.

---

## Desarrollo local

```bash
npm install
npm run dev
```

Para desplegar a producción (GitHub Pages):
```bash
npm run deploy
git add .
git commit -m "mensaje del cambio"
git push origin main
```

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type aware lint rules:

- Configure the top-level `parserOptions` property like this:

```js
export default tseslint.config({
  languageOptions: {
    // other options...
    parserOptions: {
      project: ['./tsconfig.node.json', './tsconfig.app.json'],
      tsconfigRootDir: import.meta.dirname,
    },
  },
})
```

- Replace `tseslint.configs.recommended` to `tseslint.configs.recommendedTypeChecked` or `tseslint.configs.strictTypeChecked`
- Optionally add `...tseslint.configs.stylisticTypeChecked`
- Install [eslint-plugin-react](https://github.com/jsx-eslint/eslint-plugin-react) and update the config:

```js
// eslint.config.js
import react from 'eslint-plugin-react'

export default tseslint.config({
  // Set the react version
  settings: { react: { version: '18.3' } },
  plugins: {
    // Add the react plugin
    react,
  },
  rules: {
    // other rules...
    // Enable its recommended rules
    ...react.configs.recommended.rules,
    ...react.configs['jsx-runtime'].rules,
  },
})
```
