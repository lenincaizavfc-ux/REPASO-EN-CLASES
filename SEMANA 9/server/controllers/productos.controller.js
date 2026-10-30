// server/controllers/productos.controller.js
// ---------------------------------------------------------------------------------
// Controlador de "productos":
// - Lee el archivo JSON con la lista de productos.
// - Normaliza la salida a los campos esperados (id, nombre, precio, stock).
// - Responde con { status: "success", data: [...] }.
// NOTA CLAVE: usamos ruta ABSOLUTA a data/productos.json basada en __dirname,
// para que funcione sin importar desde qué carpeta ejecute Node (CWD).
// ---------------------------------------------------------------------------------
import { readFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
// __dirname equivalente para ESM (import/export)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Ruta ABSOLUTA hacia ../data/productos.json
const DATA_PATH = path.join(__dirname, "..", "data", "productos.json");
export async function listarProductos(req, res) {
 try {
 // Leer el archivo como string (UTF-8)
 const content = await readFile(DATA_PATH, "utf8");
 // Parsear JSON (si está corrupto, lanzará SyntaxError)
 const data = JSON.parse(content);
 // Normalización: solo campos necesarios y con nombres consistentes
 const out = (Array.isArray(data) ? data : []).map(
 ({ id, nombre, precio, stock }) => ({ id, nombre, precio, stock })
 );
 // Responder en formato estándar (útil para clientes)
 res.status(200).json({ status: "success", data: out });
 } catch (err) {
 // Errores comunes: ENOENT (no existe archivo) / SyntaxError (JSON inválido)
 console.error(`[${req.correlationId}] Error listando productos:`, err);
 res.status(500).json({
 status: "error",
 message:
 err.code === "ENOENT"
 ? `No se encontró el archivo de datos: ${DATA_PATH}`
 : `No se pudo leer el archivo de datos (${err.message})`,
 });
 }
}