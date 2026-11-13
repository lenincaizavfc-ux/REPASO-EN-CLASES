// ============================================================
// utils/ApiError.js — Error HTTP controlado
// Los servicios y middleware lanzan ApiError; el middleware de errores
// lo convierte en una respuesta JSON consistente.
// ============================================================
const { STATUS_CODES } = require("http");

class ApiError extends Error {
  constructor(statusCode, message, details) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.error = STATUS_CODES[statusCode] || "Error";
    this.details = details; // lista opcional de errores de validación
  }

  static badRequest(message = "Solicitud inválida", details) {
    return new ApiError(400, message, details);
  }
  static forbidden(message = "Acceso prohibido") {
    return new ApiError(403, message);
  }
  static notFound(message = "Recurso no encontrado") {
    return new ApiError(404, message);
  }
  static methodNotAllowed(message = "Método no permitido") {
    return new ApiError(405, message);
  }
  static conflict(message = "Conflicto con el estado actual del recurso") {
    return new ApiError(409, message);
  }
  static payloadTooLarge(message = "El cuerpo de la solicitud supera el límite permitido") {
    return new ApiError(413, message);
  }
  static unsupportedMediaType(message = "Tipo de contenido no admitido") {
    return new ApiError(415, message);
  }
  static unprocessable(message = "Los datos enviados no son válidos", details) {
    return new ApiError(422, message, details);
  }
  static tooManyRequests(message = "Demasiadas solicitudes, intenta más tarde") {
    return new ApiError(429, message);
  }
  static internal(message = "Error interno del servidor") {
    return new ApiError(500, message);
  }
  static serviceUnavailable(message = "Servicio temporalmente no disponible") {
    return new ApiError(503, message);
  }
}

module.exports = ApiError;
