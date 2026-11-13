// ============================================================
// middleware/validate.middleware.js — Valida params, query y body con esquemas zod
// Deja los datos validados (y convertidos) en req.validated
//   - params/query inválidos => 400 Bad Request
//   - body inválido          => 422 Unprocessable Content
// ============================================================
const ApiError = require("../utils/ApiError");

// Convierte los errores de zod en una lista legible { campo, mensaje }
function formatearErrores(issues) {
  return issues.flatMap((issue) => {
    if (issue.code === "unrecognized_keys") {
      return issue.keys.map((clave) => ({ campo: clave, mensaje: "campo no permitido" }));
    }
    return [{ campo: issue.path.join(".") || "(cuerpo)", mensaje: issue.message }];
  });
}

/**
 * @param {{ params?: import("zod").ZodType, query?: import("zod").ZodType, body?: import("zod").ZodType }} schemas
 */
function validate(schemas) {
  return (req, res, next) => {
    req.validated = req.validated || {};
    const fuentes = {
      params: req.params,
      query: req.sanitizedQuery ?? req.query,
      body: req.body ?? {},
    };

    for (const parte of ["params", "query", "body"]) {
      const schema = schemas[parte];
      if (!schema) continue;
      const resultado = schema.safeParse(fuentes[parte]);
      if (!resultado.success) {
        const detalles = formatearErrores(resultado.error.issues);
        return next(
          parte === "body"
            ? ApiError.unprocessable("Los datos del cuerpo no son válidos", detalles)
            : ApiError.badRequest(`Los parámetros de ${parte === "params" ? "la ruta" : "la consulta"} no son válidos`, detalles)
        );
      }
      req.validated[parte] = resultado.data;
    }
    next();
  };
}

module.exports = validate;
