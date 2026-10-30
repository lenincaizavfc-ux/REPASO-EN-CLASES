// client/app.js
// ---------------------------------------------------------------------------------
// Frontend mínimo que:
// - Obtiene el catálogo desde el backend (GET /api/productos).
// - Renderiza tarjetas accesibles con botón "Agregar".
// - Mantiene un carrito en memoria del navegador.
// - Envía un pedido (POST /api/pedidos) con { items: [{id, qty}] }.
// - Muestra mensajes de estado de forma accesible (aria-live).
// ---------------------------------------------------------------------------------
const API = "http://localhost:3000"; // Ajusta si cambiaste el puerto del backend
const catalogo = document.querySelector("#catalogo");
const carritoUL = document.querySelector("#carrito");
const statusEl = document.querySelector("#status");
const btnEnviar = document.querySelector("#enviar");
// Carrito en memoria (no persistimos en LocalStorage en este demo)
let carrito = [];
init();
// Carga inicial del catálogo desde la API
async function init() {
 announce("Cargando productos...");
 try {
 const res = await fetch(`${API}/api/productos`, {
 // Enviamos un correlation-id para trazabilidad end-to-end
 headers: { "x-correlation-id": cid() }
 });
 if (!res.ok) throw new Error("No se pudo obtener el catálogo");
 const json = await res.json();
 // json.data debe ser un array de { id, nombre, precio, stock }
 renderCatalogo(json.data || []);
 announce("Productos cargados");
 } catch (e) {
 announce("Error al cargar productos");
 console.error(e);
 }
}
// Pinta tarjetas del catálogo y conecta los botones "Agregar"
function renderCatalogo(items) {
 catalogo.innerHTML = items.map(p => card(p)).join("");
 catalogo.querySelectorAll("button[data-id]").forEach(btn => {
 btn.addEventListener("click", () => addToCart(btn.dataset));
 });
}
// Tarjeta de producto (usa escapeHTML para evitar XSS)
function card(p) {
 return `
 <article class="card" aria-label="Producto ${escapeHTML(p.nombre)}">
 <h3>${escapeHTML(p.nombre)}</h3>
 <p>Precio: $${Number(p.precio).toFixed(2)}</p>
 <p>Stock: ${p.stock}</p>
 <footer>
 <button
 data-id="${p.id}"
 data-nombre="${escapeHTML(p.nombre)}"
 data-precio="${p.precio}">
 Agregar
 </button>
 </footer>
 </article>`;
}
// Agrega al carrito; si el producto ya existe, incrementa qty
function addToCart({ id, nombre, precio }) {
 const idx = carrito.findIndex(x => x.id == id);
 if (idx >= 0) carrito[idx].qty += 1;
 else carrito.push({ id: Number(id), nombre, precio: Number(precio), qty: 1 });
 renderCart();
 announce(`${nombre} agregado al carrito`);
}
// Renderiza el carrito como lista simple
function renderCart() {
 carritoUL.innerHTML = carrito.map(i => `
 <li>${escapeHTML(i.nombre)} — $${i.precio.toFixed(2)} x ${i.qty}</li>
 `).join("");
}
// Enviar el pedido al backend
btnEnviar.addEventListener("click", async () => {
 if (carrito.length === 0) {
 announce("El carrito está vacío");
 return;
 }
 // Normalizamos payload al esquema que espera el backend
 const items = carrito.map(({ id, qty }) => ({ id, qty }));
 try {
 announce("Enviando pedido...");
 const res = await fetch(`${API}/api/pedidos`, {
 method: "POST",
 headers: {
 "Content-Type": "application/json",
 "x-correlation-id": cid() // correlación con el request de envío
 },
 body: JSON.stringify({ items })
 });
 const json = await res.json();
 if (res.status === 201) {
 announce(`Pedido creado (#${json.orderId})`);
 carrito = [];
 renderCart();
 } else {
 announce(json.message || "No se pudo crear el pedido");
 }
 } catch (e) {
 announce("Error de red al enviar pedido");
 console.error(e);
 }
});
// Utilidades
// Muestra mensajes en el área de estado (accesible)
function announce(msg) { statusEl.textContent = msg; }
// Escapa HTML para evitar inyecciones en el DOM
function escapeHTML(s) {
 return String(s).replace(/[&<>"']/g, m => ({
 "&": "&amp;",
 "<": "&lt;",
 ">": "&gt;",
 "\"": "&quot;",
 "'": "&#039;"
 }[m]));
}
// Genera un correlation-id simple (coincide con el backend)
function cid() { return "cid-" + Math.random().toString(36).slice(2, 10); }