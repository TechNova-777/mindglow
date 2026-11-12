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

La interfaz publicada en `web.app` llama a `https://web-emprendimiento-eight.vercel.app/api/ai`.
Configura en Vercel estas variables:

- `AI_API_KEY`
- `AI_API_URL`
- `AI_MODEL`
- `AI_MAX_TOKENS`
- `ALLOWED_ORIGINS` con `https://midglow.web.app,https://midglow.firebaseapp.com`

Para Glow Art configura también `AI_IMAGE_URL` y `AI_IMAGE_MODEL`.

Los workflows `.github/workflows/deploy-firebase.yml` y `.github/workflows/deploy-vercel.yml` publican al actualizar `main`. No pongas claves en `index.html`, `script.js` ni en variables `VITE_*` o `NEXT_PUBLIC_*`.
