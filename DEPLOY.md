# Despliegue de Mind Glow

Mind Glow tiene el frontend público en Firebase Hosting y conserva la API de IA en Vercel.

## Desarrollo local

1. Copia `.env.local.example` como `.env.local`.
2. Configura `AI_API_KEY`.
3. Ejecuta `node server.js`.

No abras `index.html` con Live Server si quieres probar la IA: ese servidor local no ejecuta `/api/ai`.

## Frontend principal: Firebase Hosting

El sitio tradicional es `https://midglow.web.app`. La configuración está en `firebase.json` y `.firebaserc`.

```powershell
firebase deploy --only hosting:midglow --project santos7store
```

Firebase publica solo los archivos estáticos del frontend. La API, archivos de desarrollo, secretos, herramientas y fuentes 3D quedan excluidos.

## API de IA: Vercel

La interfaz publicada en Firebase o en un dominio propio llama a `https://midglow.vercel.app/api/ai`. Así la IA sigue funcionando aunque cambies el dominio del frontend.

Configura estas variables en el proyecto de Vercel que contiene `api/ai.js`:

- `AI_API_KEY`
- `AI_API_URL`
- `AI_MODEL`
- `AI_MAX_TOKENS`
- `ALLOWED_ORIGINS` con `https://midglow.web.app,https://midglow.firebaseapp.com`
- Opcionales para búsqueda: `SEARCH_API_KEY` y `SEARCH_API_URL`

### Secretos de GitHub Actions

En GitHub abre `Settings` → `Secrets and variables` → `Actions` → `New repository secret`. Para que los dos workflows puedan publicar, crea estos secretos:

- `VERCEL_TOKEN` — token de despliegue de Vercel.
- `FIREBASE_SERVICE_ACCOUNT` — JSON de la cuenta de servicio de Firebase.
- `AI_API_KEY` — clave privada del proveedor de IA.

Los demás valores (`AI_API_URL`, `AI_MODEL`, `AI_MAX_TOKENS`, `AI_IMAGE_URL`, `AI_IMAGE_MODEL`, `SEARCH_API_KEY`, `SEARCH_API_URL` y `ALLOWED_ORIGINS`) son opcionales. Si los guardas como secretos de GitHub, el workflow los sincroniza con Vercel en el siguiente despliegue.

Si usas un dominio propio, añádelo a la misma variable, separado por comas. Ejemplo:

```text
https://midglow.web.app,https://midglow.firebaseapp.com,https://tu-dominio.com,https://www.tu-dominio.com
```

No pegues `AI_API_KEY` en `script.js`, `index.html`, Firebase Hosting ni en un dominio público. La clave debe quedar únicamente como variable de entorno privada de Vercel. Si prefieres administrarla desde GitHub, crea el secreto `AI_API_KEY`; el workflow de Vercel lo sincroniza automáticamente cuando se ejecute. También puedes crear allí `AI_API_URL`, `AI_MODEL`, `AI_MAX_TOKENS`, `AI_IMAGE_URL`, `AI_IMAGE_MODEL`, `SEARCH_API_KEY`, `SEARCH_API_URL` y `ALLOWED_ORIGINS`.

Para Glow Art configura también `AI_IMAGE_URL` y `AI_IMAGE_MODEL`.

Los workflows `.github/workflows/deploy-firebase.yml` y `.github/workflows/deploy-vercel.yml` publican al actualizar `main`. No pongas claves en `index.html`, `script.js` ni en variables `VITE_*` o `NEXT_PUBLIC_*`.
