document.getElementById("salida").textContent = "Entorno listo.";
console.log("Entorno listo.");
// Modelo: los datos de la aplicación
const productos = [
  { id: 1, nombre: "Teclado" },
  { id: 2, nombre: "Mouse" },
];

// Controlador: función que procesa la petición usando el modelo
function listarProductos() {
  return productos;
}

console.log("Productos (modelo):", listarProductos());
document.getElementById("salida").textContent = JSON.stringify(listarProductos(), null, 1);

function crearProducto(nombre) {
  const nuevoId = productos.reduce(function (max, p) {
    return p.id > max ? p.id : max;
  }, 0) + 1;
  const nuevo = { id: nuevoId, nombre: nombre };
  productos.push(nuevo);
  return nuevo;
}

// READ (uno solo) -> GET /productos/:id
function obtenerProducto(id) {
  return productos.find(function (p) { return p.id === id; });
}

// UPDATE -> PUT
function actualizarProducto(id, nombreNuevo) {
  const producto = obtenerProducto(id);
  if (producto) producto.nombre = nombreNuevo;
  return producto;
}

// DELETE -> DELETE
function eliminarProducto(id) {
  const indice = productos.findIndex(function (p) { return p.id === id; });
  if (indice !== -1) productos.splice(indice, 1);
}

console.log("Crear:", crearProducto("hola"));
console.log("Actualizar:", actualizarProducto(1, "Teclado mecánico"));
console.log("Todos después de los cambios:", listarProductos());
eliminarProducto(1);
console.log("Después de eliminar el id 1:", listarProductos());

// Middleware de validación
function validarProducto(req, res, next) {
  if (!req.body || !req.body.nombre) {
    next({ status: 400, mensaje: "El nombre es obligatorio" });
    return;
  }
  next();
}

// Manejador de errores: responde con el código y mensaje adecuados
function manejarError(err, res) {
  res.status = err.status || 500;
  res.cuerpo = { error: err.mensaje || "Error interno" };
}

// Simulación de una petición POST /productos pasando por el middleware
function simularPeticionPOST(body) {
  const req = { body: body };
  const res = { status: 200, cuerpo: null };

  function next(err) {
    if (err) {
      manejarError(err, res);
      return;
    }
    // Esto es el "controlador": solo se ejecuta si el middleware llamó next() sin error
    const nuevo = crearProducto(body.nombre);
    res.status = 201;
    res.cuerpo = nuevo;
  }

  validarProducto(req, res, next);
  return res;
}

console.log("POST válido:", simularPeticionPOST({ nombre: "Audífonos" }));
console.log("POST inválido:", simularPeticionPOST({}));
