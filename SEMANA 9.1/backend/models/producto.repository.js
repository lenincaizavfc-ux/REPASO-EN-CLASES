// ============================================================
// models/producto.repository.js — Patrón REPOSITORY (capa de acceso a datos)
// Única capa que conoce SQL. Siempre consultas parametrizadas ($1, $2...).
// ============================================================

const COLUMNAS = "id_producto, nombre, categoria, precio_venta, stock, url_imagen";
const EDITABLES = ["nombre", "categoria", "precio_venta", "stock", "url_imagen"];

// Lista blanca de ordenamiento: el cliente elige una clave, nunca escribe SQL
const ORDENAMIENTOS = {
  id_producto: "id_producto",
  nombre: "nombre",
  categoria: "categoria",
  precio_venta: "precio_venta",
  stock: "stock",
};
const DIRECCIONES = { asc: "ASC", desc: "DESC" };

class ProductoRepository {
  /** @param {{ query: Function }} db  módulo de conexión (pool Singleton) */
  constructor(db) {
    this.db = db;
  }

  // Construye el WHERE con parámetros a partir de los filtros validados
  #where({ categoria, buscar, precio_min, precio_max } = {}) {
    const condiciones = [];
    const valores = [];
    const agregar = (sql, valor) => {
      valores.push(valor);
      condiciones.push(sql.replace("?", `$${valores.length}`));
    };
    if (categoria) agregar("categoria ILIKE ?", categoria);
    if (buscar) agregar("nombre ILIKE ?", `%${buscar}%`);
    if (precio_min !== undefined) agregar("precio_venta >= ?", precio_min);
    if (precio_max !== undefined) agregar("precio_venta <= ?", precio_max);
    return { sql: condiciones.length ? `WHERE ${condiciones.join(" AND ")}` : "", valores };
  }

  async findAll({ limit, offset, filters = {}, sort = {} }) {
    const { sql, valores } = this.#where(filters);
    const columna = ORDENAMIENTOS[sort.by] || "id_producto";
    const direccion = DIRECCIONES[sort.dir] || "ASC";
    const { rows } = await this.db.query(
      `SELECT ${COLUMNAS} FROM productos ${sql}
       ORDER BY ${columna} ${direccion}, id_producto ASC
       LIMIT $${valores.length + 1} OFFSET $${valores.length + 2}`,
      [...valores, limit, offset]
    );
    return rows;
  }

  async count(filters = {}) {
    const { sql, valores } = this.#where(filters);
    const { rows } = await this.db.query(`SELECT COUNT(*)::int AS total FROM productos ${sql}`, valores);
    return rows[0].total;
  }

  async findById(id) {
    const { rows } = await this.db.query(`SELECT ${COLUMNAS} FROM productos WHERE id_producto = $1`, [id]);
    return rows[0] || null;
  }

  async create({ nombre, categoria, precio_venta, stock, url_imagen }) {
    const { rows } = await this.db.query(
      `INSERT INTO productos (nombre, categoria, precio_venta, stock, url_imagen)
       VALUES ($1, $2, $3, $4, $5) RETURNING ${COLUMNAS}`,
      [nombre, categoria, precio_venta, stock, url_imagen]
    );
    return rows[0];
  }

  // PUT: reemplaza todos los campos editables
  async update(id, { nombre, categoria, precio_venta, stock, url_imagen }) {
    const { rows } = await this.db.query(
      `UPDATE productos
          SET nombre = $1, categoria = $2, precio_venta = $3, stock = $4, url_imagen = $5
        WHERE id_producto = $6
      RETURNING ${COLUMNAS}`,
      [nombre, categoria, precio_venta, stock, url_imagen, id]
    );
    return rows[0] || null;
  }

  // PATCH: actualiza solo los campos recibidos (nombres de columna de la lista blanca)
  async patch(id, data) {
    const campos = EDITABLES.filter((campo) => data[campo] !== undefined);
    if (campos.length === 0) return this.findById(id);
    const sets = campos.map((campo, i) => `${campo} = $${i + 1}`).join(", ");
    const { rows } = await this.db.query(
      `UPDATE productos SET ${sets} WHERE id_producto = $${campos.length + 1} RETURNING ${COLUMNAS}`,
      [...campos.map((campo) => data[campo]), id]
    );
    return rows[0] || null;
  }

  async delete(id) {
    const { rowCount } = await this.db.query("DELETE FROM productos WHERE id_producto = $1", [id]);
    return rowCount > 0;
  }

  async findCategories() {
    const { rows } = await this.db.query(
      "SELECT categoria, COUNT(*)::int AS total FROM productos GROUP BY categoria ORDER BY categoria"
    );
    return rows;
  }
}

module.exports = ProductoRepository;
