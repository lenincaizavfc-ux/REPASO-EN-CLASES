// ============================================================
// route/producto.routes.js — Endpoints del recurso productos
// Rutas delgadas: método + URL + middleware + controlador. Sin SQL.
// ============================================================
const { Router } = require("express");
const controller = require("../controller/producto.controller");
const validate = require("../middleware/validate.middleware");
const pagination = require("../middleware/pagination.middleware");
const { methodNotAllowed } = require("../middleware/not-found.middleware");
const schema = require("../schemas/producto.schema");

const router = Router();

router
  .route("/")
  .get(validate({ query: schema.listQuery }), pagination, controller.list)
  .post(validate({ body: schema.createBody }), controller.create)
  .all(methodNotAllowed(["GET", "POST"]));

router
  .route("/categorias")
  .get(controller.listCategories)
  .all(methodNotAllowed(["GET"]));

router
  .route("/:id")
  .get(validate({ params: schema.idParam }), controller.getById)
  .put(validate({ params: schema.idParam, body: schema.replaceBody }), controller.replace)
  .patch(validate({ params: schema.idParam, body: schema.patchBody }), controller.patch)
  .delete(validate({ params: schema.idParam }), controller.remove)
  .all(methodNotAllowed(["GET", "PUT", "PATCH", "DELETE"]));

module.exports = router;
