// server/server.js
// --------------------------------------------------------------------------------------
// Servidor Express principal:
// - Usa ESM (import).
// - Monta middlewares globales: JSON parser, CORS (configurable), Correlation-ID.
// - Define un endpoint raíz "/" para ver si la API responde.
// - Monta rutas: /api/productos y /api/pedidos.
// - Escucha en el puerto 3000 y loguea el estado.
// NOTA: Asegúrate de tener en package.json -> { "type": "module" } para habilitar
// 'import'.
// --------------------------------------------------------------------------------------
// --------------------------------------------------------------------------------------
import express from "express";
import productos from "./routes/productos.js";
import pedidos from "./routes/pedidos.js";
import { setupCORS } from "./middleware/cors.js";
import { correlation } from "./middleware/correlation.js";
const app = express();
// 1) Middleware para parsear JSON de los cuerpos de las requests
app.use(express.json());
// 2) CORS: ajusta el origen al de tu cliente (por ejemplo Vite: http://localhost:5173,
// Live Server: http://127.0.0.1:5500 o http://localhost:5500)
app.use(setupCORS("http://127.0.0.1:5500"));
// 3) Correlation-ID: agrega o reutiliza un x-correlation-id por request
app.use(correlation);
// 4) Raíz informativa para comprobar rápido que el backend responde
app.get("/", (req, res) => {
 res.status(200).send("API Demo Flujo Cliente-Servidor ✅");
});
// 5) Montar routers de la API
app.use("/api/productos", productos);
app.use("/api/pedidos", pedidos);
// 6) Arrancar servidor
const PORT = 3000;
app.listen(PORT, () => console.log(`API activa en http://localhost:${PORT}`));