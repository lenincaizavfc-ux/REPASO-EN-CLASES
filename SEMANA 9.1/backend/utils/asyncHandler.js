// ============================================================
// utils/asyncHandler.js
// Envuelve controladores async: si la promesa falla, envía el error
// al middleware global con next(err) (Express 4 no lo hace solo).
// ============================================================
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

module.exports = asyncHandler;
