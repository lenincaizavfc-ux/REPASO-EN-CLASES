// ============================================================
// server.js — Punto de entrada
// Carga .env, crea Express, registra middleware global, monta las rutas
// versionadas, maneja errores, escucha en el puerto 5050 y cierra en orden.
// No contiene SQL ni reglas de negocio.
// ============================================================
require("dotenv").config();
const express = require("express");
const helmet = require("helmet");

const corsMiddleware = require("./middleware/cors.middleware");
const rateLimiter = require("./middleware/rate-limit.middleware");
const { requireJson, jsonParser, jsonErrorHandler } = require("./middleware/json.middleware");
const sanitize = require("./middleware/sanitize.middleware");
const { notFound } = require("./middleware/not-found.middleware");
const errorHandler = require("./middleware/error.middleware");
const indexRoutes = require("./route/index.routes");
const database = require("./config/database");

const PORT = Number(process.env.PORT) || 5050;
const API_VERSION = process.env.API_VERSION || "v1";

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", 1); // IP real del cliente si hay un proxy delante (para el rate limit)

// ---------- Middleware global ----------
app.use(helmet()); // cabeceras HTTP de seguridad
app.use(corsMiddleware); // orígenes autorizados
app.use(rateLimiter); // 429 si se abusa
app.use(requireJson); // 415 si POST/PUT/PATCH no es JSON
app.use(jsonParser); // analiza JSON con límite de tamaño
app.use(jsonErrorHandler); // 400 JSON mal formado / 413 muy grande
app.use(sanitize); // normalización segura de body y query

// ---------- Rutas ----------
app.get("/", (req, res) => {
  res.json({ data: { nombre: "API BAD_PROD", api: `/api/${API_VERSION}` } });
});

// Estado del servicio y de la base de datos
app.get("/health", async (req, res) => {
  try {
    await database.query("SELECT 1");
    res.json({ data: { status: "ok", database: "ok" } });
  } catch {
    res.status(503).json({ data: { status: "degraded", database: "unavailable" } });
  }
});

// Versionamiento en el montaje de rutas: /api/v1
app.use(`/api/${API_VERSION}`, indexRoutes);

// ---------- Errores (siempre al final) ----------
app.use(notFound);
app.use(errorHandler);

// ---------- Arranque y cierre ordenado ----------
function start() {
  const server = app.listen(PORT, () => {
    console.log(`API escuchando en http://localhost:${PORT}/api/${API_VERSION}`);
    console.log(`Documentación en http://localhost:${PORT}/api/${API_VERSION}/docs`);
  });

  database
    .query("SELECT 1")
    .then(() => console.log(`Conectado a PostgreSQL ${process.env.DB_HOST}/${process.env.DB_NAME}`))
    .catch((err) => console.error("No se pudo conectar a PostgreSQL:", err.message));

  let cerrando = false;
  const shutdown = (senal) => {
    if (cerrando) return;
    cerrando = true;
    console.log(`\n${senal} recibido: cerrando el servidor...`);
    // Si algo se queda colgado, forzar la salida a los 10 s
    setTimeout(() => process.exit(1), 10000).unref();
    server.close(async () => {
      await database.closePool();
      console.log("Servidor y pool de PostgreSQL cerrados");
      process.exit(0);
    });
  };
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));

  return server;
}

// Solo escucha si se ejecuta directamente (node server.js); en las pruebas se importa app
if (require.main === module) start();

module.exports = { app, start };
