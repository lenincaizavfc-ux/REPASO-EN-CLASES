// ============================================================
// controller/producto.controller.js — Controlador (la "C" de MVC)
// 1. Lee los datos ya validados de req.validated / req.pagination
// 2. Invoca el servicio
// 3. Elige el código HTTP
// 4. Devuelve JSON uniforme (la "V" de MVC en una API REST)
// No contiene SQL ni reglas de negocio.
// ============================================================
const asyncHandler = require("../utils/asyncHandler");
const ProductoService = require("../services/producto.service");
const { createRepository } = require("../factories/repository.factory");

// Composición: Factory => Repository => Service
const service = new ProductoService(createRepository("productos"));

// GET /api/v1/productos
const list = asyncHandler(async (req, res) => {
  const { orden, dir, page, limit, ...filters } = req.validated.query;
  const resultado = await service.list(req.pagination, filters, { by: orden, dir });
  res.status(200).json(resultado);
});

// GET /api/v1/productos/categorias
const listCategories = asyncHandler(async (req, res) => {
  res.status(200).json({ data: await service.listCategories() });
});

// GET /api/v1/productos/:id
const getById = asyncHandler(async (req, res) => {
  res.status(200).json({ data: await service.getById(req.validated.params.id) });
});

// POST /api/v1/productos
const create = asyncHandler(async (req, res) => {
  const producto = await service.create(req.validated.body);
  res.status(201).location(`${req.baseUrl}/${producto.id_producto}`).json({ data: producto });
});

// PUT /api/v1/productos/:id
const replace = asyncHandler(async (req, res) => {
  res.status(200).json({ data: await service.replace(req.validated.params.id, req.validated.body) });
});

// PATCH /api/v1/productos/:id
const patch = asyncHandler(async (req, res) => {
  res.status(200).json({ data: await service.patch(req.validated.params.id, req.validated.body) });
});

// DELETE /api/v1/productos/:id  => 204 sin cuerpo
const remove = asyncHandler(async (req, res) => {
  await service.remove(req.validated.params.id);
  res.status(204).end();
});

module.exports = { list, listCategories, getById, create, replace, patch, remove };
