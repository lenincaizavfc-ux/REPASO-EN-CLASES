// ============================================================
// factories/repository.factory.js — Patrón FACTORY
// Crea repositorios a partir de una lista CONTROLADA de recursos.
// Nunca recibe nombres de módulos desde el cliente.
// ============================================================
const database = require("../config/database");
const ProductoRepository = require("../models/producto.repository");

const REGISTRO = {
  productos: ProductoRepository,
  // usuarios: UsuarioRepository,  <- así se registran nuevos recursos
};

const instancias = new Map();

/**
 * Devuelve el repositorio del recurso indicado.
 * @param {keyof typeof REGISTRO} recurso
 * @param {{ query: Function }} [db] permite inyectar otra conexión (p. ej. en pruebas)
 */
function createRepository(recurso, db = database) {
  const Repositorio = REGISTRO[recurso];
  if (!Repositorio) throw new Error(`Repositorio no registrado: ${recurso}`);
  if (db !== database) return new Repositorio(db); // conexión personalizada => instancia nueva
  if (!instancias.has(recurso)) instancias.set(recurso, new Repositorio(db));
  return instancias.get(recurso);
}

module.exports = { createRepository, RECURSOS: Object.keys(REGISTRO) };
