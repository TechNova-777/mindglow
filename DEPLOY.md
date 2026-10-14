# IA externa de Mind Glow

Mind Glow responde con una IA externa mediante `api/ai.js`. La clave se lee solo en el servidor desde `AI_API_KEY`; nunca se incluye en `script.js` ni se envía al navegador.

## Desarrollo local con Gemini

1. Copia `.env.local.example` como `.env.local`.
2. Pega tu clave de Google AI Studio en `AI_API_KEY`.
3. Ejecuta `node server.js`; Mind Glow se abrirá automáticamente en el navegador. No abras `index.html` con Live Server: ese servidor no ejecuta `/api/ai`.

La interfaz ya llama a `/api/ai` para el chat, Game Studio y Glow Art.

## Producción en Vercel

En el proyecto de Vercel agrega estas variables en Settings → Environment Variables:

- `AI_API_KEY`: tu clave de Gemini.
- `AI_API_URL`: `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions`.
- `AI_MODEL`: `gemini-3.1-flash-lite`.
- `AI_MAX_TOKENS`: `1200`.

Para que el endpoint acepte solo el sitio público, agrega también `ALLOWED_ORIGIN` con el dominio de Mind Glow.

Para Glow Art agrega también `AI_IMAGE_URL` y `AI_IMAGE_MODEL` como aparecen en `.env.local.example`.

Después de guardar las variables, vuelve a desplegar. No pongas la clave en `index.html`, `script.js` ni en ninguna variable `VITE_*`/`NEXT_PUBLIC_*`.

## Importante sobre Firebase Hosting

El workflow actual de Firebase publica los archivos estáticos, pero Firebase Hosting por sí solo no ejecuta `api/ai.js`. Para que el chat use Gemini en producción, despliega este proyecto en Vercel o mueve `api/ai.js` a una Firebase Cloud Function y configura un rewrite. La configuración incluida en `vercel.json` deja lista la primera opción.

El workflow `.github/workflows/deploy-vercel.yml` deja preparado el despliegue automático desde GitHub. Solo requiere crear el secreto `VERCEL_TOKEN` en Settings → Secrets and variables → Actions del repositorio.
