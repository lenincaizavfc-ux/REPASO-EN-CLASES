// ============================================================
// config/database.js — Patrón SINGLETON
// Una única instancia de Pool para todo el proceso. Node guarda en caché
// este módulo, así que todos los repositorios reutilizan el mismo pool.
// ============================================================
require("dotenv").config();
const { Pool, types } = require("pg");

// NUMERIC (oid 1700) llega como texto: lo convertimos a número
types.setTypeParser(1700, (valor) => parseFloat(valor));

let pool = null;

function getPool() {
  if (!pool) {
    pool = new Pool({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT) || 5432,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
      max: Number(process.env.DB_POOL_MAX) || 10,
    });
    pool.on("error", (err) => console.error("[database] Error inesperado en el pool:", err.message));
  }
  return pool;
}

// Ejecuta una consulta parametrizada
function query(text, params) {
  return getPool().query(text, params);
}

// Ejecuta varias operaciones dentro de una transacción (BEGIN/COMMIT/ROLLBACK)
async function withTransaction(callback) {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const resultado = await callback(client);
    await client.query("COMMIT");
    return resultado;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

module.exports = { getPool, query, withTransaction, closePool };
