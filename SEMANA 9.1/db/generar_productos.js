// ============================================================
// Generador del script 02_tabla_y_datos.sql
// Crea 10 000 productos reales (marcas, modelos y precios del mercado)
// a partir de db/catalogo.js.
// Uso:  node db/generar_productos.js
// La semilla es fija, así que siempre genera los mismos datos.
// ============================================================
const fs = require("fs");
const path = require("path");
const CATALOGO = require("./catalogo");

const TOTAL = 10000;

// Generador pseudoaleatorio con semilla (mulberry32) => datos reproducibles
let semilla = 20261112;
function aleatorio() {
  semilla |= 0;
  semilla = (semilla + 0x6d2b79f5) | 0;
  let t = Math.imul(semilla ^ (semilla >>> 15), 1 | semilla);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const entre = (min, max) => min + aleatorio() * (max - min);
const elegir = (lista) => lista[Math.floor(aleatorio() * lista.length)];

// 1) Arma todas las combinaciones posibles: tipo + marca + variante
const combinaciones = [];
for (const [categoria, tipos] of Object.entries(CATALOGO)) {
  for (const [tipo, min, max, marcas, variantes] of tipos) {
    for (const marca of marcas) {
      // La marca puede traer su propio rango de precio: ["Apple iPhone 15", 900, 1150]
      const [nombreMarca, pMin, pMax] = Array.isArray(marca) ? marca : [marca, min, max];
      for (const variante of variantes) {
        combinaciones.push({ categoria, nombre: `${tipo} ${nombreMarca} ${variante}`, min: pMin, max: pMax });
      }
    }
  }
}

// 2) Las mezcla (Fisher-Yates con semilla) y toma 10 000 => nombres únicos
for (let i = combinaciones.length - 1; i > 0; i--) {
  const j = Math.floor(aleatorio() * (i + 1));
  [combinaciones[i], combinaciones[j]] = [combinaciones[j], combinaciones[i]];
}
if (combinaciones.length < TOTAL) {
  throw new Error(`Solo hay ${combinaciones.length} combinaciones, se necesitan ${TOTAL}`);
}
const elegidos = combinaciones.slice(0, TOTAL);

// Precios "de percha": terminan en .99, .49, .90, .00, etc.
function precioReal(min, max) {
  const base = entre(min, max);
  if (base < 10) return (Math.floor(base) + elegir([0.25, 0.49, 0.75, 0.99])).toFixed(2);
  return (Math.floor(base) + elegir([0.99, 0.99, 0.49, 0.9, 0])).toFixed(2);
}
// Stock: la mayoría con existencias, algunos pocos y algunos agotados
function stockReal() {
  const r = aleatorio();
  if (r < 0.05) return 0;
  if (r < 0.25) return Math.floor(entre(1, 15));
  return Math.floor(entre(15, 500));
}
// Imagen: búsqueda en Google Imágenes con el nombre exacto del producto
const urlImagen = (nombre) => `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(nombre)}`;
const sql = (texto) => `'${texto.replace(/'/g, "''")}'`;

// 3) Escribe el script SQL
const filas = elegidos.map(
  (p) => `(${sql(p.nombre)}, ${sql(p.categoria)}, ${precioReal(p.min, p.max)}, ${stockReal()}, ${sql(urlImagen(p.nombre))})`
);

const LOTE = 1000;
let inserts = "";
for (let i = 0; i < filas.length; i += LOTE) {
  inserts += "INSERT INTO productos (nombre, categoria, precio_venta, stock, url_imagen) VALUES\n";
  inserts += filas.slice(i, i + LOTE).join(",\n") + ";\n\n";
}

const salida = `-- ============================================================
-- 2) Tabla "productos" + ${TOTAL} productos con datos reales
-- Ejecutar conectado a la base "bad_prod".
-- Archivo GENERADO por db/generar_productos.js (no editar a mano).
-- ============================================================

DROP TABLE IF EXISTS productos;

CREATE TABLE productos (
  id_producto  SERIAL         PRIMARY KEY,
  nombre       VARCHAR(150)   NOT NULL UNIQUE,
  categoria    VARCHAR(60)    NOT NULL,
  precio_venta NUMERIC(10,2)  NOT NULL CHECK (precio_venta >= 0),
  stock        INTEGER        NOT NULL DEFAULT 0 CHECK (stock >= 0),
  url_imagen   VARCHAR(500)
);

COMMENT ON COLUMN productos.precio_venta IS 'Precio de venta al público (USD)';
COMMENT ON COLUMN productos.url_imagen   IS 'Enlace de Google Imágenes del producto';

CREATE INDEX idx_productos_categoria ON productos (categoria);

BEGIN;

${inserts}COMMIT;

-- Verificación: debe devolver ${TOTAL}
SELECT COUNT(*) AS total_productos FROM productos;
`;

const destino = path.join(__dirname, "02_tabla_y_datos.sql");
fs.writeFileSync(destino, salida, "utf8");
console.log(`Generado ${destino}: ${TOTAL} productos (de ${combinaciones.length} combinaciones posibles).`);
