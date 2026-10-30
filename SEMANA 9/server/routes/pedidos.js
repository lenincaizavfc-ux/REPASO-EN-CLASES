// server/routes/pedidos.js
// ------------------------------------------------------
// Router de pedidos (POST en este demo).
// Prefijo que se usa en server.js: /api/pedidos
// ------------------------------------------------------
import { Router } from "express";
import { crearPedido } from "../controllers/pedidos.controller.js";
const router = Router();
// POST /api/pedidos
router.post("/", crearPedido);
export default router;