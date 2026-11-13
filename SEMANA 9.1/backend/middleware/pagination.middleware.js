// ============================================================
// middleware/pagination.middleware.js
// GET /api/v1/productos?page=2&limit=10
//   page  : entero >= 1            (por defecto 1)
//   limit : entero 1..MAX_LIMIT    (por defecto PAGINATION_DEFAULT_LIMIT)
//   offset: (page - 1) * limit
// ============================================================
const ApiError = require("../utils/ApiError");

const DEFAULT_LIMIT = Number(process.env.PAGINATION_DEFAULT_LIMIT) || 10;
const MAX_LIMIT = Number(process.env.PAGINATION_MAX_LIMIT) || 100;
const ENTERO = /^\d+$/;

function pagination(req, res, next) {
  const query = req.sanitizedQuery ?? req.query;
  const detalles = [];

  const page = query.page === undefined ? 1 : ENTERO.test(query.page) ? Number(query.page) : NaN;
  const limit = query.limit === undefined ? DEFAULT_LIMIT : ENTERO.test(query.limit) ? Number(query.limit) : NaN;

  if (!Number.isSafeInteger(page) || page < 1) detalles.push({ campo: "page", mensaje: "debe ser un entero mayor o igual a 1" });
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
    detalles.push({ campo: "limit", mensaje: `debe ser un entero entre 1 y ${MAX_LIMIT}` });
  }
  if (detalles.length) return next(ApiError.badRequest("Parámetros de paginación inválidos", detalles));

  req.pagination = { page, limit, offset: (page - 1) * limit };
  next();
}

module.exports = pagination;
module.exports.DEFAULT_LIMIT = DEFAULT_LIMIT;
module.exports.MAX_LIMIT = MAX_LIMIT;
