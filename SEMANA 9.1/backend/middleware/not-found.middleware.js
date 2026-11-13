// ============================================================
// middleware/not-found.middleware.js
// - notFound: la ruta no existe (404)
// - methodNotAllowed: la ruta existe pero no admite ese método (405)
// ============================================================
const ApiError = require("../utils/ApiError");

function notFound(req, res, next) {
  next(ApiError.notFound(`No existe la ruta ${req.method} ${req.originalUrl}`));
}

// Se usa con router.route(...).all(methodNotAllowed(["GET", "POST"]))
function methodNotAllowed(permitidos) {
  return (req, res, next) => {
    res.set("Allow", permitidos.join(", "));
    next(ApiError.methodNotAllowed(`El método ${req.method} no está permitido en ${req.baseUrl}${req.path}. Permitidos: ${permitidos.join(", ")}`));
  };
}

module.exports = { notFound, methodNotAllowed };
