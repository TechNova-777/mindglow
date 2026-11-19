/*
 * Configuracion publica de Mind Glow.
 *
 * Este archivo se descarga en el navegador: nunca pongas aqui API keys,
 * tokens ni secretos. Solo sirve para indicar donde vive la API de Mind Glow
 * cuando el frontend y la API estan publicados en dominios distintos.
 */
window.MINDGLOW_CONFIG = window.MINDGLOW_CONFIG || {
  // Ejemplo: "https://tu-api.vercel.app/api/ai"
  // Vacio = usa automaticamente /api/ai en el mismo dominio.
  aiEndpoint: ""
};
