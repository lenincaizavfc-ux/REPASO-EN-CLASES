// Pruebas UNITARIAS del servicio: usan un repositorio falso en memoria,
// así no se toca PostgreSQL. (Esto es posible gracias a la inyección
// del repositorio en el constructor del servicio.)
const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const ProductoService = require("../services/producto.service");
const ApiError = require("../utils/ApiError");

function repositorioFalso() {
  const filas = [
    { id_producto: 1, nombre: "Arroz Real 1 kg", categoria: "Alimentos", precio_venta: 1.49, stock: 10, url_imagen: null },
    { id_producto: 2, nombre: "Leche Vita Entera 1 L", categoria: "Alimentos", precio_venta: 0.99, stock: 0, url_imagen: null },
  ];
  return {
    findAll: async ({ limit, offset }) => filas.slice(offset, offset + limit),
    count: async () => filas.length,
    findById: async (id) => filas.find((f) => f.id_producto === id) || null,
    create: async (data) => ({ id_producto: 3, ...data }),
    update: async (id, data) => (id <= 2 ? { id_producto: id, ...data } : null),
    patch: async (id, data) => {
      const fila = filas.find((f) => f.id_producto === id);
      return fila ? { ...fila, ...data } : null;
    },
    delete: async (id) => id <= 2,
    findCategories: async () => [{ categoria: "Alimentos", total: 2 }],
  };
}

describe("ProductoService", () => {
  const service = new ProductoService(repositorioFalso());

  test("list devuelve data y pagination", async () => {
    const r = await service.list({ page: 1, limit: 1, offset: 0 });
    assert.equal(r.data.length, 1);
    assert.deepEqual(r.pagination, { page: 1, limit: 1, total: 2, totalPages: 2 });
  });

  test("list rechaza precio_min > precio_max", async () => {
    await assert.rejects(service.list({ page: 1, limit: 10, offset: 0 }, { precio_min: 10, precio_max: 5 }), {
      statusCode: 400,
    });
  });

  test("getById devuelve el producto o lanza 404", async () => {
    assert.equal((await service.getById(1)).nombre, "Arroz Real 1 kg");
    await assert.rejects(service.getById(99), (err) => err instanceof ApiError && err.statusCode === 404);
  });

  test("create aplica valores por defecto de stock y url_imagen", async () => {
    const p = await service.create({ nombre: "Café Sí Café 500 g", categoria: "Alimentos", precio_venta: 5.99 });
    assert.equal(p.stock, 0);
    assert.equal(p.url_imagen, null);
  });

  test("replace, patch y remove lanzan 404 si no existe", async () => {
    await assert.rejects(service.replace(99, {}), { statusCode: 404 });
    await assert.rejects(service.patch(99, { stock: 1 }), { statusCode: 404 });
    await assert.rejects(service.remove(99), { statusCode: 404 });
  });

  test("patch solo cambia los campos enviados", async () => {
    const p = await service.patch(1, { stock: 50 });
    assert.equal(p.stock, 50);
    assert.equal(p.nombre, "Arroz Real 1 kg");
  });
});
