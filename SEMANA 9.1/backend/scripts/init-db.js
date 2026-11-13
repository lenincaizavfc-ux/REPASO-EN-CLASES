// ============================================================
// scripts/init-db.js — Crea la base (si no existe) y carga los 10 000 productos
// Uso: npm run db:init
// ============================================================
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

const conexion = {
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
};
const DB = process.env.DB_NAME || "bad_prod";

async function main() {
  if (!/^[a-z_][a-z0-9_]*$/.test(DB)) throw new Error(`Nombre de base inválido: ${DB}`);

  // 1) Crear la base si no existe (conectados a "postgres")
  const admin = new Client({ ...conexion, database: "postgres" });
  await admin.connect();
  const existe = await admin.query("SELECT 1 FROM pg_database WHERE datname = $1", [DB]);
  if (existe.rowCount === 0) {
    await admin.query(`CREATE DATABASE ${DB} WITH ENCODING 'UTF8' TEMPLATE template0`);
    console.log(`Base de datos "${DB}" creada`);
  } else {
    console.log(`La base de datos "${DB}" ya existe`);
  }
  await admin.end();

  // 2) Crear la tabla e insertar los productos (el script usa BEGIN/COMMIT)
  const sql = fs.readFileSync(path.join(__dirname, "..", "..", "db", "02_tabla_y_datos.sql"), "utf8");
  const db = new Client({ ...conexion, database: DB });
  await db.connect();
  await db.query(sql);
  const { rows } = await db.query("SELECT COUNT(*)::int AS total FROM productos");
  console.log(`Tabla productos lista con ${rows[0].total} registros`);
  await db.end();
}

main().catch((err) => {
  console.error("Error inicializando la base:", err.message);
  process.exit(1);
});
