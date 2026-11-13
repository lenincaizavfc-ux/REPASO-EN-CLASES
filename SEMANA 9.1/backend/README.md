# API BAD_PROD — Node.js, Express y PostgreSQL

Backend REST del recurso **productos** (base `bad_prod`), construido según
`arquitectura_backend_node_express_postgresql.md`.

## Arranque
```bash
npm install
npm run db:init   # crea bad_prod si no existe y carga 10 000 productos
npm run dev       # http://localhost:5050/api/v1   (nodemon)
npm test          # pruebas unitarias + integración
```
Configuración en `.env` (ver `.env.example`).
Documentación Swagger: http://localhost:5050/api/v1/docs

## Arquitectura
| Patrón | Dónde |
|---|---|
| N capas | route/middleware/controller → services → models → PostgreSQL |
| MVC | Model = `models/`, View = respuesta JSON, Controller = `controller/` |
| Repository | `models/producto.repository.js` (findAll, findById, create, update, patch, delete) |
| Singleton | `config/database.js` (un único `Pool`) |
| Factory | `factories/repository.factory.js` (lista controlada de recursos) |

```
server.js            Express, middleware global, /api/v1, errores, puerto 5050, cierre ordenado
config/database.js   Pool Singleton + withTransaction
route/               index.routes.js, producto.routes.js
middleware/          cors, json, sanitize, validate, pagination, rate-limit, not-found, error
controller/          producto.controller.js
services/            producto.service.js (reglas de negocio)
models/              producto.repository.js (SQL parametrizado)
factories/           repository.factory.js
schemas/             producto.schema.js (zod)
utils/               ApiError.js, asyncHandler.js
docs/                openapi.json
tests/               producto.service.test.js, productos.api.test.js
```

## Endpoints
| Método | Endpoint | Respuesta |
|---|---|---|
| GET | `/api/v1/productos` | 200 lista paginada |
| GET | `/api/v1/productos/categorias` | 200 |
| GET | `/api/v1/productos/:id` | 200 / 404 |
| POST | `/api/v1/productos` | 201 + `Location` / 409 / 415 / 422 |
| PUT | `/api/v1/productos/:id` | 200 / 404 / 422 |
| PATCH | `/api/v1/productos/:id` | 200 / 404 / 422 |
| DELETE | `/api/v1/productos/:id` | 204 / 404 |

Lista: `?page=1&limit=10&categoria=Hogar&buscar=sartén&precio_min=10&precio_max=50&orden=precio_venta&dir=desc`

```json
{ "data": [ ... ], "pagination": { "page": 1, "limit": 10, "total": 10000, "totalPages": 1000 } }
```

## Errores
```json
{
  "statusCode": 422,
  "error": "Unprocessable Entity",
  "message": "Los datos del cuerpo no son válidos",
  "details": [{ "campo": "precio_venta", "mensaje": "no puede ser negativo" }],
  "timestamp": "2026-11-12T17:00:00.000Z",
  "path": "/api/v1/productos"
}
```
400 parámetros/JSON inválido · 403 origen CORS no permitido · 404 · 405 método no permitido ·
409 nombre duplicado · 413 cuerpo muy grande · 415 no es JSON · 422 body inválido · 429 rate limit · 500 · 503 BDD caída.
