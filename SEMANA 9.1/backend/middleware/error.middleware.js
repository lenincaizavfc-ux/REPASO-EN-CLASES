// ============================================================
// middleware/error.middleware.js — Control global de excepciones
// Convierte cualquier error en una respuesta JSON consistente:
// { statusCode, error, message, details?, timestamp, path }
// Nunca envía trazas, SQL ni datos de infraestructura al cliente.
// ============================================================
const ApiError = require("../utils/ApiError");

// Errores de PostgreSQL / conexión => errores HTTP sin detalles internos
function desdePostgres(err) {
  switch (err.code) {
    case "23505": // unique_violation
      return ApiError.conflict("Ya existe un producto con ese nombre");
    case "23503": // foreign_key_violation
      return ApiError.conflict("El recurso está relacionado con otros registros");
    case "23502": // not_null_violation
    case "23514": // check_violation
    case "22001": // texto demasiado largo
    case "22003": // número fuera de rango
      return ApiError.unprocessable("Los datos no cumplen las restricciones de la base de datos");
    case "ECONNREFUSED":
    case "ETIMEDOUT":
    case "ENOTFOUND":
    case "EHOSTUNREACH":
    case "28P01": // autenticación fallida
    case "3D000": // la base no existe
    case "57P01": // servidor apagándose
      return ApiError.serviceUnavailable("La base de datos no está disponible en este momento");
    default:
      return null;
  }
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const apiError = err instanceof ApiError ? err : desdePostgres(err) || ApiError.internal();

  // Se registra el error real en el servidor (no en la respuesta)
  if (apiError.statusCode >= 500) {
    console.error(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`, err);
  }

  if (res.headersSent) return next(err);

  res.status(apiError.statusCode).json({
    statusCode: apiError.statusCode,
    error: apiError.error,
    message: apiError.message,
    ...(apiError.details && { details: apiError.details }),
    timestamp: new Date().toISOString(),
    path: req.originalUrl,
  });
}

module.exports = errorHandler;
