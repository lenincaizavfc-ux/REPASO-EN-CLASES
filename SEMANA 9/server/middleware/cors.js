// server/middleware/cors.js
// --------------------------------------------------------------------
// Middleware CORS configurable.
// - allowedOrigin: origen permitido (por ejemplo "http://localhost:5173").
// - Expone métodos y headers comunes (incluye x-correlation-id).
// - Maneja requests preflight (OPTIONS) devolviendo 204 sin contenido.
// --------------------------------------------------------------------
export function setupCORS(allowedOrigin = "*") {
 return (req, res, next) => {
 // Origen autorizado
 res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
 // Métodos permitidos (ajusta si usas PUT/DELETE)
 res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
 // Headers permitidos (incluye el correlation-id)
 res.setHeader(
 "Access-Control-Allow-Headers",
 "Content-Type,Authorization,x-correlation-id"
 );
 // Si es preflight, respondemos de inmediato
 if (req.method === "OPTIONS") {
 return res.status(204).end();
 }
 // Continuar con el siguiente middleware
 next();
 };
}
