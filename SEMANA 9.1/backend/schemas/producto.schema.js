// ============================================================
// schemas/producto.schema.js — Reglas de validación del recurso (zod)
// Contrato estricto: los campos no declarados se rechazan.
// ============================================================
const { z } = require("zod");

const SIN_HTML = /^[^<>]*$/;
const MAX_INT = 2147483647;

// Mensajes de tipo: "es obligatorio" si falta, "debe ser ..." si el tipo es incorrecto
const tipo = (esperado) => ({
  error: (issue) => (issue.input === undefined ? "es obligatorio" : `debe ser ${esperado}`),
});

const esUrlHttp = (valor) => {
  try {
    return ["http:", "https:"].includes(new URL(valor).protocol);
  } catch {
    return false;
  }
};
const dosDecimales = (n) => Math.abs(n * 100 - Math.round(n * 100)) < 1e-6;

// ---------- Campos ----------
const nombre = z
  .string(tipo("texto"))
  .min(3, "debe tener al menos 3 caracteres")
  .max(150, "debe tener máximo 150 caracteres")
  .regex(SIN_HTML, "no puede contener los caracteres < o >");

const categoria = z
  .string(tipo("texto"))
  .min(3, "debe tener al menos 3 caracteres")
  .max(60, "debe tener máximo 60 caracteres")
  .regex(SIN_HTML, "no puede contener los caracteres < o >");

const precio_venta = z
  .number(tipo("un número"))
  .min(0, "no puede ser negativo")
  .max(99999999.99, "debe ser menor o igual a 99999999.99")
  .refine(dosDecimales, "admite máximo 2 decimales");

const stock = z
  .number(tipo("un número"))
  .int("debe ser un número entero")
  .min(0, "no puede ser negativo")
  .max(MAX_INT, `debe ser menor o igual a ${MAX_INT}`);

const url_imagen = z
  .string(tipo("texto o null"))
  .max(500, "debe tener máximo 500 caracteres")
  .refine(esUrlHttp, "debe ser una URL válida que empiece con http:// o https://")
  .nullable();

// ---------- params ----------
const idParam = z.object({
  id: z.coerce
    .number({ error: "debe ser un número" })
    .int("debe ser un número entero")
    .min(1, "debe ser mayor o igual a 1")
    .max(MAX_INT, "está fuera de rango"),
});

// ---------- query de la lista ----------
// page y limit los valida el middleware de paginación; aquí solo se declaran
const precioQuery = z.coerce.number({ error: "debe ser un número" }).min(0, "no puede ser negativo");
const listQuery = z
  .object({
    page: z.string().optional(),
    limit: z.string().optional(),
    categoria: z.string().max(60, "debe tener máximo 60 caracteres").optional(),
    buscar: z.string().max(100, "debe tener máximo 100 caracteres").optional(),
    precio_min: precioQuery.optional(),
    precio_max: precioQuery.optional(),
    orden: z
      .enum(["id_producto", "nombre", "categoria", "precio_venta", "stock"], {
        error: "debe ser id_producto, nombre, categoria, precio_venta o stock",
      })
      .optional(),
    dir: z.enum(["asc", "desc"], { error: "debe ser asc o desc" }).optional(),
  })
  .strict();

// ---------- body ----------
const createBody = z
  .object({ nombre, categoria, precio_venta, stock: stock.optional(), url_imagen: url_imagen.optional() })
  .strict();

const replaceBody = z.object({ nombre, categoria, precio_venta, stock, url_imagen: url_imagen.optional() }).strict();

const patchBody = createBody
  .partial()
  .strict()
  .refine((data) => Object.keys(data).length > 0, "envía al menos un campo para actualizar");

module.exports = { idParam, listQuery, createBody, replaceBody, patchBody };
