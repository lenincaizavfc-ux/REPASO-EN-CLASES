// ============================================================
// middleware/sanitize.middleware.js — Normalización con reglas claras
// Solo aplica transformaciones seguras que no alteran datos legítimos:
//   1. Normaliza Unicode (NFC) => "é" siempre se guarda igual
//   2. Elimina caracteres de control invisibles
//   3. Quita espacios al inicio/fin y colapsa espacios repetidos
// NO borra HTML ni otros caracteres: eso lo RECHAZA el esquema de validación.
// Los campos no admitidos también los rechaza el esquema (.strict()).
// ============================================================

// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u001F\u007F]/g;

function normalizarTexto(texto) {
  return texto.normalize("NFC").replace(CONTROL, "").replace(/\s+/g, " ").trim();
}

function normalizar(valor) {
  if (typeof valor === "string") return normalizarTexto(valor);
  if (Array.isArray(valor)) return valor.map(normalizar);
  if (valor && typeof valor === "object") {
    return Object.fromEntries(Object.entries(valor).map(([clave, v]) => [clave, normalizar(v)]));
  }
  return valor;
}

function sanitize(req, res, next) {
  if (req.body && typeof req.body === "object") req.body = normalizar(req.body);
  // ?a=1&a=2 llega como arreglo: nos quedamos con el primer valor para evitar ambigüedad
  req.sanitizedQuery = Object.fromEntries(
    Object.entries(req.query).map(([clave, valor]) => [clave, normalizar(Array.isArray(valor) ? valor[0] : valor)])
  );
  next();
}

module.exports = sanitize;
