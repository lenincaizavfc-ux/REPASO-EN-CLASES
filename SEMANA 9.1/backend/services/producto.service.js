// ============================================================
// services/producto.service.js — Lógica de aplicación / reglas de negocio
// No conoce Express (req/res) ni SQL: recibe datos validados y usa el repositorio.
// ============================================================
const ApiError = require("../utils/ApiError");

class ProductoService {
  /** @param {import("../models/producto.repository")} repository */
  constructor(repository) {
    this.repository = repository;
  }

  async list({ page, limit, offset }, filters = {}, sort = {}) {
    if (filters.precio_min !== undefined && filters.precio_max !== undefined && filters.precio_min > filters.precio_max) {
      throw ApiError.badRequest("precio_min no puede ser mayor que precio_max");
    }
    const [data, total] = await Promise.all([
      this.repository.findAll({ limit, offset, filters, sort }),
      this.repository.count(filters),
    ]);
    return {
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async listCategories() {
    return this.repository.findCategories();
  }

  async getById(id) {
    const producto = await this.repository.findById(id);
    if (!producto) throw ApiError.notFound(`No existe el producto con id ${id}`);
    return producto;
  }

  async create(data) {
    return this.repository.create({ stock: 0, url_imagen: null, ...data });
  }

  async replace(id, data) {
    const producto = await this.repository.update(id, { url_imagen: null, ...data });
    if (!producto) throw ApiError.notFound(`No existe el producto con id ${id}`);
    return producto;
  }

  async patch(id, data) {
    const producto = await this.repository.patch(id, data);
    if (!producto) throw ApiError.notFound(`No existe el producto con id ${id}`);
    return producto;
  }

  async remove(id) {
    const eliminado = await this.repository.delete(id);
    if (!eliminado) throw ApiError.notFound(`No existe el producto con id ${id}`);
  }
}

module.exports = ProductoService;
