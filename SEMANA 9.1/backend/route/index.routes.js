// ============================================================
// route/index.routes.js — Router de la versión (se monta en /api/v1)
// Para un recurso nuevo: crear su archivo de rutas y registrarlo aquí.
// ============================================================
const { Router } = require("express");
const swaggerUi = require("swagger-ui-express");
const openapi = require("../docs/openapi.json");
const productoRoutes = require("./producto.routes");

const router = Router();

router.get("/", (req, res) => {
  res.json({
    data: {
      version: process.env.API_VERSION || "v1",
      recursos: { productos: `${req.baseUrl}/productos` },
      documentacion: `${req.baseUrl}/docs`,
    },
  });
});

router.use("/productos", productoRoutes);

// Documentación OpenAPI / Swagger
router.get("/docs.json", (req, res) => res.json(openapi));
router.use("/docs", swaggerUi.serve, swaggerUi.setup(openapi, { customSiteTitle: "API BAD_PROD" }));

module.exports = router;
