// server/routes/productos.js
// ------------------------------------------------------
// Router de productos (solo GET en este demo).
// Prefijo que se usa en server.js: /api/productos
// ------------------------------------------------------
import { Router } from "express";
import { listarProductos } from "../controllers/productos.controller.js";
const router = Router();
// GET /api/productos
router.get("/", listarProductos);
export default router;