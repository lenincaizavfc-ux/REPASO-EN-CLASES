// server/middleware/correlation.js
// -------------------------------------------------------------
// Middleware que garantiza que cada request tenga un "Correlation-ID".
// - Si el cliente envía el header "x-correlation-id", lo reutilizamos.
// - Si no, generamos uno (para trazabilidad en logs y debugging).
// - Lo colocamos también en la respuesta como "x-correlation-id".
// - Guardamos el id en req.correlationId para que otros middlewares/controladores lo usen.
// -------------------------------------------------------------
// Generador simple de IDs. Para producción podrías usar crypto.randomUUID()
function cryptoRandom() {
 return "cid-" + Math.random().toString(36).slice(2, 10);
}
export function correlation(req, res, next) {
 // 1) Tomar el correlation-id del cliente si existe, caso contrario generar uno
 const id = req.headers["x-correlation-id"] || cryptoRandom();
 // 2) Incluirlo en la respuesta para que el cliente lo vea/guarde
 res.setHeader("x-correlation-id", id);
 // 3) Guardarlo en el objeto request para que el resto de la app pueda loguearlo
 req.correlationId = id;
 // 4) Log sencillo: imprime método, ruta y el correlation-id
 console.log(`[${id}] ${req.method} ${req.url}`);
 // 5) Continuar con el siguiente middleware
 next();
}