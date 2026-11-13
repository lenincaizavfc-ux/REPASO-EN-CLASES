// ============================================================
// middleware/json.middleware.js — Análisis de cuerpos JSON
// - requireJson: POST/PUT/PATCH deben enviar Content-Type: application/json (415)
// - jsonParser:  analiza el JSON con límite de tamaño (413 si se excede)
// - jsonErrorHandler: JSON mal formado => 400
// ============================================================
const express = require("express");
const ApiError = require("../utils/ApiError");

const METODOS_CON_CUERPO = ["POST", "PUT", "PATCH"];

function requireJson(req, res, next) {
  if (METODOS_CON_CUERPO.includes(req.method) && !req.is("application/json")) {
    return next(ApiError.unsupportedMediaType("El cuerpo debe enviarse con Content-Type: application/json"));
  }
  next();
}

const jsonParser = express.json({ limit: process.env.JSON_LIMIT || "1mb", strict: true });

// eslint-disable-next-line no-unused-vars
function jsonErrorHandler(err, req, res, next) {
  if (err.type === "entity.parse.failed") return next(ApiError.badRequest("El cuerpo de la solicitud no es un JSON válido"));
  if (err.type === "entity.too.large") return next(ApiError.payloadTooLarge());
  if (err.type === "charset.unsupported" || err.type === "encoding.unsupported") {
    return next(ApiError.unsupportedMediaType("Codificación no admitida, usa UTF-8"));
  }
  next(err);
}

module.exports = { requireJson, jsonParser, jsonErrorHandler };
