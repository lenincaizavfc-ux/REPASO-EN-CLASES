// Pruebas de INTEGRACIÓN de los endpoints contra la base real (bad_prod).
// Crea su propio producto de prueba y lo elimina al final.
const { test, describe, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { app } = require("../server");
const database = require("../config/database");

let server;
let BASE;
const JSON_HEADERS = { "Content-Type": "application/json" };

const pedir = async (ruta, opciones = {}) => {
  const res = await fetch(BASE + ruta, opciones);
  const texto = await res.text();
  return { status: res.status, headers: res.headers, body: texto ? JSON.parse(texto) : null };
};
const enviar = (metodo, ruta, cuerpo) =>
  pedir(ruta, { method: metodo, headers: JSON_HEADERS, body: typeof cuerpo === "string" ? cuerpo : JSON.stringify(cuerpo) });

before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, resolve);
  });
  BASE = `http://localhost:${server.address().port}/api/v1`;
  // Limpia restos de una ejecución anterior interrumpida
  await database.query("DELETE FROM productos WHERE nombre LIKE 'ZZ Prueba API%'");
});

after(async () => {
  await database.query("DELETE FROM productos WHERE nombre LIKE 'ZZ Prueba API%'");
  await new Promise((resolve) => server.close(resolve));
  await database.closePool();
});

describe("GET /productos", () => {
  test("pagina con valores por defecto", async () => {
    const r = await pedir("/productos");
    assert.equal(r.status, 200);
    assert.equal(r.body.data.length, 10);
    assert.equal(r.body.pagination.page, 1);
    assert.equal(r.body.pagination.limit, 10);
    assert.ok(r.body.pagination.total >= 10000);
  });

  test("filtra, ordena y respeta page/limit", async () => {
    const r = await pedir(`/productos?categoria=${encodeURIComponent("Computación")}&orden=precio_venta&dir=desc&page=2&limit=5`);
    assert.equal(r.status, 200);
    assert.equal(r.body.data.length, 5);
    assert.ok(r.body.data.every((p) => p.categoria === "Computación"));
    const precios = r.body.data.map((p) => p.precio_venta);
    assert.deepEqual(precios, [...precios].sort((a, b) => b - a));
  });

  test("rechaza limit mayor al máximo y page inválido", async () => {
    assert.equal((await pedir("/productos?limit=500")).status, 400);
    assert.equal((await pedir("/productos?page=0")).status, 400);
    assert.equal((await pedir("/productos?page=abc")).status, 400);
  });

  test("no permite inyectar SQL por orden ni por buscar", async () => {
    assert.equal((await pedir("/productos?orden=nombre;DROP TABLE productos")).status, 400);
    const r = await pedir(`/productos?buscar=${encodeURIComponent("' OR 1=1 --")}`);
    assert.equal(r.status, 200);
    assert.equal(r.body.pagination.total, 0);
  });

  test("rechaza parámetros desconocidos", async () => {
    assert.equal((await pedir("/productos?admin=true")).status, 400);
  });

  test("GET por id inexistente => 404 e id inválido => 400", async () => {
    assert.equal((await pedir("/productos/999999999")).status, 404);
    assert.equal((await pedir("/productos/abc")).status, 400);
  });
});

describe("CRUD completo", () => {
  let id;

  test("POST crea => 201 con Location", async () => {
    const r = await enviar("POST", "/productos", {
      nombre: "  ZZ Prueba API   Ñandú  ",
      categoria: "Pruebas",
      precio_venta: 19.99,
      stock: 5,
    });
    assert.equal(r.status, 201);
    assert.equal(r.body.data.nombre, "ZZ Prueba API Ñandú"); // normalizado por sanitize
    assert.equal(r.body.data.url_imagen, null);
    id = r.body.data.id_producto;
    assert.equal(r.headers.get("location"), `/api/v1/productos/${id}`);
  });

  test("POST duplicado => 409", async () => {
    const r = await enviar("POST", "/productos", { nombre: "ZZ Prueba API Ñandú", categoria: "Pruebas", precio_venta: 1 });
    assert.equal(r.status, 409);
  });

  test("PUT reemplaza => 200", async () => {
    const r = await enviar("PUT", `/productos/${id}`, {
      nombre: "ZZ Prueba API v2",
      categoria: "Pruebas",
      precio_venta: 25,
      stock: 3,
      url_imagen: "https://www.google.com/search?tbm=isch&q=prueba",
    });
    assert.equal(r.status, 200);
    assert.equal(r.body.data.precio_venta, 25);
  });

  test("PUT sin campos obligatorios => 422", async () => {
    const r = await enviar("PUT", `/productos/${id}`, { nombre: "ZZ Prueba API v3" });
    assert.equal(r.status, 422);
  });

  test("PATCH cambia solo lo enviado => 200", async () => {
    const r = await enviar("PATCH", `/productos/${id}`, { stock: 0 });
    assert.equal(r.status, 200);
    assert.equal(r.body.data.stock, 0);
    assert.equal(r.body.data.nombre, "ZZ Prueba API v2");
  });

  test("PATCH vacío => 422", async () => {
    assert.equal((await enviar("PATCH", `/productos/${id}`, {})).status, 422);
  });

  test("DELETE => 204 sin cuerpo y luego 404", async () => {
    const r = await pedir(`/productos/${id}`, { method: "DELETE" });
    assert.equal(r.status, 204);
    assert.equal(r.body, null);
    assert.equal((await pedir(`/productos/${id}`, { method: "DELETE" })).status, 404);
  });
});

describe("Validación, JSON y errores", () => {
  test("body inválido => 422 con detalles por campo", async () => {
    const r = await enviar("POST", "/productos", { nombre: "<b>x</b>", precio_venta: -1, stock: 1.5, rol: "admin" });
    assert.equal(r.status, 422);
    const campos = r.body.details.map((d) => d.campo);
    for (const c of ["nombre", "categoria", "precio_venta", "stock", "rol"]) assert.ok(campos.includes(c), c);
  });

  test("precio como texto => 422 (tipos estrictos)", async () => {
    const r = await enviar("POST", "/productos", { nombre: "ZZ Prueba API tipo", categoria: "Pruebas", precio_venta: "10" });
    assert.equal(r.status, 422);
  });

  test("JSON mal formado => 400", async () => {
    assert.equal((await enviar("POST", "/productos", "{mal")).status, 400);
  });

  test("sin Content-Type JSON => 415", async () => {
    const r = await pedir("/productos", { method: "POST", headers: { "Content-Type": "text/plain" }, body: "hola" });
    assert.equal(r.status, 415);
  });

  test("método no permitido => 405 con cabecera Allow", async () => {
    const r = await pedir("/productos", { method: "DELETE" });
    assert.equal(r.status, 405);
    assert.equal(r.headers.get("allow"), "GET, POST");
  });

  test("ruta o versión inexistente => 404 con formato uniforme", async () => {
    const r = await fetch(BASE.replace("/v1", "/v2") + "/productos");
    const body = await r.json();
    assert.equal(r.status, 404);
    assert.deepEqual(Object.keys(body).sort(), ["error", "message", "path", "statusCode", "timestamp"]);
  });

  test("CORS rechaza orígenes no configurados", async () => {
    const r = await pedir("/productos", { headers: { Origin: "http://sitio-malicioso.com" } });
    assert.equal(r.status, 403);
    const ok = await fetch(BASE + "/productos?limit=1", { headers: { Origin: "http://localhost:5173" } });
    assert.equal(ok.headers.get("access-control-allow-origin"), "http://localhost:5173");
  });

  test("helmet agrega cabeceras de seguridad", async () => {
    const r = await fetch(BASE + "/productos?limit=1");
    assert.equal(r.headers.get("x-content-type-options"), "nosniff");
    assert.equal(r.headers.get("x-powered-by"), null);
  });
});
