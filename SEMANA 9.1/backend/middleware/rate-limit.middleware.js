// ============================================================
// middleware/rate-limit.middleware.js — Limita solicitudes por IP (429)
// ============================================================
const { rateLimit } = require("express-rate-limit");
const ApiError = require("../utils/ApiError");

const rateLimiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  limit: Number(process.env.RATE_LIMIT_MAX) || 100,
  standardHeaders: "draft-8", // cabeceras RateLimit y RateLimit-Policy
  legacyHeaders: false,
  handler: (req, res, next) => next(ApiError.tooManyRequests()),
});

module.exports = rateLimiter;
