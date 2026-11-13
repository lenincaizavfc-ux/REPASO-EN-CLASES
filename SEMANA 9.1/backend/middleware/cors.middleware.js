// ============================================================
// middleware/cors.middleware.js — Solo permite los orígenes configurados
// CORS no reemplaza la autenticación: solo controla qué navegadores/orígenes
// pueden leer las respuestas.
// ============================================================
const cors = require("cors");
const ApiError = require("../utils/ApiError");

const origenesPermitidos = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((origen) => origen.trim())
  .filter(Boolean);

const corsMiddleware = cors({
  origin(origin, callback) {
    // Sin cabecera Origin = no es un navegador de otro origen (Postman, curl, mismo servidor)
    if (!origin || origenesPermitidos.includes(origin)) return callback(null, true);
    return callback(ApiError.forbidden(`Origen no permitido por CORS: ${origin}`));
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  exposedHeaders: ["Location", "RateLimit", "RateLimit-Policy"],
  maxAge: 600,
});

module.exports = corsMiddleware;
