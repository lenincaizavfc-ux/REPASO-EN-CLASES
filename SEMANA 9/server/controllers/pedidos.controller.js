// server/controllers/pedidos.controller.js
// ----------------------------------------------------------------------
// Controlador de "pedidos":
// - Recibe un body con { items: [{id, qty}, ...] }.
// - Valida que items sea un array con al menos un elemento y qty > 0.
// - Simula la creación de un pedido devolviendo un orderId y los items.
// - Responde con 201 Created cuando todo es correcto.
// ----------------------------------------------------------------------
export function crearPedido(req, res) {
 const { items } = req.body || {};
 // Validación básica del payload
 if (!Array.isArray(items) || items.length === 0) {
 return res
 .status(400)
 .json({
 status: "fail",
 message: "Items inválidos (se requiere array con elementos)",
 });
 }
 // Validar cantidades (qty > 0)
 for (const it of items) {
 if (!it || typeof it.id !== "number" || typeof it.qty !== "number" || it.qty <= 0) {
 return res.status(400).json({
 status: "fail",
 message: "Cada item debe tener { id:number, qty:number>0 }",
 });
 }
 }
 // Simulación de creación de pedido: generamos un id "aleatorio"
 const orderId = Math.floor(1000 + Math.random() * 9000);
 // Log opcional con correlation-id para trazabilidad
 console.log(
 `[${req.correlationId}] Pedido creado #${orderId} con ${items.length} ítems`
 );
 // Devolver 201 (created) con el resumen
 res.status(201).json({ status: "created", orderId, items });
}