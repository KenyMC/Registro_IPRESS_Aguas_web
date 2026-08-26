# Regla de Despliegue Seguro a GitHub Pages

Cuando el usuario pida "desplegar", "deploy", o "subir a producción", **DEBES** ejecutar la siguiente secuencia de comandos en la terminal (usando punto y coma `;` para compatibilidad en Windows PowerShell) para asegurar que GitHub Actions despierte correctamente:

1. Primero, construye y despliega normalmente la aplicación (ajusta el mensaje del commit según los cambios):
   `npm run build; git add .; git commit -m "feat: actualizaciones"; npm run deploy`
   
2. Segundo, fuerza el despertar de GitHub Actions con un commit vacío en la rama gh-pages:
   `git fetch origin gh-pages; git checkout gh-pages; git commit --allow-empty -m "trigger GitHub Actions"; git push origin gh-pages; git checkout main`

Sigue esta regla estrictamente en este proyecto de Registro_IPRESS_Aguas para evitar problemas de caché o que GitHub ignore el despliegue.
