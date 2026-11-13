# Arquitectura del backend -- Node.js, Express y PostgreSQL

## 1. Objetivo

Este documento describe la arquitectura propuesta para construir un
backend con **Node.js**, **Express** y **PostgreSQL**. La solución
expone una API REST, organiza el código por responsabilidades y aplica
prácticas de seguridad, validación, manejo de errores y mantenimiento.

La arquitectura se plantea como una base reutilizable. Los nombres y
ejemplos de recursos (`usuarios`, `productos`, etc.) son ilustrativos;
deben sustituirse por los modelos reales del sistema.

## 2. Tecnologías y responsabilidades

  -----------------------------------------------------------------------
  Tecnología o componente             Responsabilidad
  ----------------------------------- -----------------------------------
  Node.js                             Entorno de ejecución del backend.

  Express                             Servidor HTTP, rutas y middleware.

  PostgreSQL                          Persistencia relacional de los
                                      datos.

  `pg`                                Cliente de Node.js para conectarse
                                      a PostgreSQL mediante un pool de
                                      conexiones.

  `dotenv`                            Carga de variables de entorno desde
                                      `.env` en desarrollo.

  `cors`                              Configuración del acceso desde
                                      orígenes autorizados.

  `helmet`                            Cabeceras HTTP de seguridad.

  `express-rate-limit`                Limitación de solicitudes para
                                      reducir abusos.

  `zod` o `joi`                       Validación de parámetros, query
                                      strings y cuerpos JSON.

  `express-validator`                 Alternativa para validación
                                      integrada con Express.
  -----------------------------------------------------------------------

Se recomienda escoger una sola biblioteca principal de validación para
mantener criterios uniformes.

## 3. Estilos y patrones arquitectónicos

### 3.1 Arquitectura en N capas

La aplicación separa responsabilidades en capas. Cada capa se comunica
con la siguiente mediante contratos definidos:

1.  **Presentación / HTTP:** recibe solicitudes y devuelve respuestas.
    En esta propuesta corresponde a `route`, `middleware` y
    `controller`.
2.  **Lógica de aplicación y dominio:** contiene reglas de negocio y
    coordina operaciones. Puede incorporarse una carpeta `services`
    cuando la lógica deje de ser sencilla.
3.  **Acceso a datos:** encapsula consultas y operaciones de
    persistencia. Corresponde a `models` y sus repositorios.
4.  **Base de datos:** PostgreSQL almacena la información.

La separación evita que las rutas ejecuten consultas SQL directamente o
que los controladores concentren toda la lógica.

### 3.2 Cliente-servidor

El cliente (por ejemplo, una aplicación web o móvil) realiza solicitudes
HTTP al servidor Express. El servidor valida la solicitud, ejecuta la
operación requerida, consulta PostgreSQL cuando corresponde y devuelve
una respuesta JSON.

El cliente no debe conectarse directamente a PostgreSQL ni recibir
credenciales de la base de datos.

### 3.3 REST

La API utiliza recursos identificados mediante URL y métodos HTTP.
Ejemplo para el recurso `usuarios`:

  ------------------------------------------------------------------------
  Método                  Endpoint                 Acción
  ----------------------- ------------------------ -----------------------
  GET                     `/api/v1/usuarios`       Listar usuarios, con
                                                   paginación.

  GET                     `/api/v1/usuarios/:id`   Consultar un usuario.

  POST                    `/api/v1/usuarios`       Crear un usuario.

  PUT                     `/api/v1/usuarios/:id`   Reemplazar los datos
                                                   editables del usuario.

  PATCH                   `/api/v1/usuarios/:id`   Modificar parcialmente
                                                   un usuario.

  DELETE                  `/api/v1/usuarios/:id`   Eliminar o desactivar
                                                   un usuario, según las
                                                   reglas del sistema.
  ------------------------------------------------------------------------

Los endpoints deben usar sustantivos en plural, mantener una convención
uniforme y versionarse, por ejemplo, mediante `/api/v1`.

### 3.4 Patrón arquitectónico MVC

-   **Model:** representa el acceso y la persistencia de los datos. En
    esta propuesta, los modelos/repositorios consultan PostgreSQL.
-   **View:** la API no genera vistas HTML; su representación de salida
    son respuestas JSON.
-   **Controller:** recibe la solicitud ya encaminada, coordina la
    operación y construye la respuesta HTTP.

En una API REST, MVC se adapta usando JSON como representación de los
recursos. Para evitar controladores demasiado grandes, las reglas de
negocio complejas deben trasladarse a servicios.

### 3.5 Patrón Repository

El repositorio encapsula las consultas a PostgreSQL y ofrece métodos
orientados al dominio, por ejemplo:

-   `findAll({ limit, offset })`
-   `findById(id)`
-   `create(data)`
-   `update(id, data)`
-   `patch(id, data)`
-   `delete(id)`

El controlador no escribe SQL ni conoce detalles del driver. Esto
facilita probar la lógica y cambiar la implementación de persistencia
sin modificar las rutas.

### 3.6 Patrón Singleton

La conexión a PostgreSQL se administra mediante una única instancia
compartida de `Pool` durante la ejecución del proceso. El módulo de
conexión exporta esa instancia y los repositorios la reutilizan.

En Node.js, el sistema de módulos normalmente mantiene en caché el
módulo cargado, por lo que se comparte la instancia exportada. No se
debe crear un pool nuevo por cada solicitud.

### 3.7 Patrón Factory

La Factory centraliza la creación de objetos que implementan una misma
interfaz o contrato. En esta arquitectura puede crear repositorios según
el recurso o configuración, o construir servicios con sus dependencias.

La Factory no debe convertirse en una capa innecesaria: si solo existe
una implementación fija, una función de composición sencilla puede ser
suficiente. Su propósito es desacoplar la selección y creación de
dependencias, no ocultar la lógica de negocio.

## 4. Estructura del proyecto

La estructura mínima solicitada es `server.js`, `route`, `middleware`,
`controller` y `models`. Se recomienda agregar `config`, `factories`,
`services` y `utils` para mantener las responsabilidades ordenadas.

``` text
backend/
├── server.js
├── .env
├── .env.example
├── .gitignore
├── package.json
├── config/
│   └── database.js
├── route/
│   ├── index.routes.js
│   └── usuario.routes.js
├── middleware/
│   ├── cors.middleware.js
│   ├── validate.middleware.js
│   ├── sanitize.middleware.js
│   ├── json.middleware.js
│   ├── pagination.middleware.js
│   ├── error.middleware.js
│   └── not-found.middleware.js
├── controller/
│   └── usuario.controller.js
├── models/
│   └── usuario.repository.js
├── factories/
│   └── repository.factory.js
├── services/
│   └── usuario.service.js
├── schemas/
│   └── usuario.schema.js
└── utils/
    ├── ApiError.js
    └── asyncHandler.js
```

Para cada nuevo modelo o recurso se crea, como mínimo, su archivo de
rutas, controlador, repositorio y esquema de validación. Si el proyecto
tiene reglas de negocio específicas, también se crea su servicio.

### 4.1 `server.js`

Es el punto de entrada. Sus responsabilidades son:

-   Cargar las variables de entorno.
-   Crear la aplicación Express.
-   Configurar cabeceras y middleware globales.
-   Configurar CORS y el límite de tamaño del JSON.
-   Registrar las rutas versionadas.
-   Registrar el middleware de rutas inexistentes y el manejador global
    de errores.
-   Iniciar el servidor en el puerto `5050`.
-   Gestionar el cierre ordenado del servidor y del pool cuando el
    proceso recibe señales de terminación.

No debe contener consultas SQL ni reglas de negocio.

### 4.2 `route/`

Define los endpoints y asocia cada método y URL con el middleware de
validación y el controlador correspondiente. Se recomienda un archivo
por recurso, por ejemplo `usuario.routes.js`.

Las rutas deben ser delgadas: no deben contener consultas a la base de
datos ni lógica de negocio.

### 4.3 `middleware/`

Contiene funciones que se ejecutan durante el ciclo de una solicitud
HTTP:

-   **CORS:** permite únicamente los orígenes configurados.
-   **Validación:** comprueba parámetros, query strings y cuerpos según
    esquemas.
-   **Sanitización:** normaliza entradas permitidas y elimina o rechaza
    campos no admitidos. Debe evitar transformaciones indiscriminadas
    que alteren datos legítimos.
-   **JSON:** analiza cuerpos JSON y responde adecuadamente cuando el
    formato es inválido.
-   **Control de excepciones:** captura errores y los convierte en
    respuestas consistentes sin revelar detalles internos.
-   **Paginación:** valida `page` y `limit`, aplica límites máximos y
    calcula `offset`.
-   **Versionamiento:** se implementa preferentemente en el montaje de
    rutas (`/api/v1`). El middleware puede comprobar encabezados si el
    contrato del proyecto lo exige, pero no es necesario duplicar la
    versión de la URL.
-   **Seguridad adicional:** `helmet` y limitación de solicitudes pueden
    registrarse como middleware global.

### 4.4 `controller/`

Contiene un archivo por recurso, por ejemplo `usuario.controller.js`.
Sus funciones:

1.  Leer los datos ya validados de `req`.
2.  Invocar el servicio o repositorio correspondiente.
3.  Elegir el código HTTP adecuado.
4.  Devolver una respuesta JSON uniforme.

No debe contener SQL, credenciales, ni reglas complejas de negocio.

### 4.5 `models/`

Contiene los repositorios que encapsulan el acceso a PostgreSQL. Deben
usar consultas parametrizadas, nunca concatenar directamente valores
recibidos del cliente en una consulta SQL.

### 4.6 `config/database.js`

Crea y exporta un único `Pool` de PostgreSQL. Centraliza la
configuración de conexión y permite reutilizar el pool desde los
repositorios.

### 4.7 `factories/`

Construye repositorios o servicios a partir de dependencias. Por
ejemplo, `repository.factory.js` puede devolver el repositorio del
recurso solicitado. La Factory debe trabajar con una lista controlada de
recursos y no aceptar nombres de módulos arbitrarios provenientes del
cliente.

## 5. Flujo de una solicitud

Ejemplo: `POST /api/v1/usuarios`.

1.  El cliente envía una solicitud HTTP con un cuerpo JSON.
2.  Express recibe la solicitud.
3.  Se ejecutan los middleware globales: seguridad, CORS y análisis
    JSON.
4.  El router identifica `/api/v1/usuarios`.
5.  El middleware valida y sanitiza los datos permitidos.
6.  El controlador recibe la solicitud validada.
7.  El controlador llama al servicio o repositorio.
8.  El repositorio ejecuta una consulta parametrizada en PostgreSQL
    mediante el pool Singleton.
9.  PostgreSQL devuelve el resultado.
10. El controlador responde con JSON y el código HTTP correspondiente.
11. Si ocurre un error, se envía al middleware global de errores.

``` text
Cliente
  |
  | HTTP / JSON
  v
Express - server.js
  |
  v
Middleware global
(CORS, seguridad, JSON, errores)
  |
  v
Route /api/v1
  |
  v
Middleware del recurso
(validación, sanitización, paginación)
  |
  v
Controller
  |
  v
Service (si aplica)
  |
  v
Factory / Repository
  |
  v
Pool Singleton
  |
  v
PostgreSQL
```

## 6. Configuración global mediante `.env`

Todas las configuraciones que cambian entre entornos deben definirse
mediante variables de entorno. El archivo `.env` se mantiene fuera del
control de versiones.

Ejemplo de `.env`:

``` env
NODE_ENV=development
PORT=5050
API_VERSION=v1

DB_HOST=localhost
DB_PORT=5432
DB_NAME=nombre_base
DB_USER=usuario
DB_PASSWORD=clave_segura
DB_SSL=false
DB_POOL_MAX=10

CORS_ORIGINS=http://localhost:3000,http://localhost:5173
JSON_LIMIT=1mb
PAGINATION_DEFAULT_LIMIT=10
PAGINATION_MAX_LIMIT=100
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
```

El archivo `.env.example` debe contener las mismas variables con valores
de ejemplo no sensibles. No se deben subir contraseñas, tokens ni claves
reales al repositorio. En producción, se recomienda utilizar el gestor
de secretos de la plataforma de despliegue.

## 7. Métodos HTTP y códigos de respuesta

  ------------------------------------------------------------------------------
  Método                  Uso                     Respuestas frecuentes
  ----------------------- ----------------------- ------------------------------
  GET                     Consultar uno o varios  `200 OK`, `404 Not Found`.
                          recursos.               

  POST                    Crear un recurso.       `201 Created`,
                                                  `400 Bad Request`,
                                                  `409 Conflict`,
                                                  `422 Unprocessable Content`.

  PUT                     Reemplazar el estado    `200 OK` o `204 No Content`,
                          editable de un recurso. `404 Not Found`,
                                                  `400 Bad Request`.

  PATCH                   Actualizar parcialmente `200 OK` o `204 No Content`,
                          un recurso.             `404 Not Found`,
                                                  `400 Bad Request`,
                                                  `422 Unprocessable Content`.

  DELETE                  Eliminar un recurso.    `204 No Content`,
                                                  `404 Not Found`,
                                                  `409 Conflict`.
  ------------------------------------------------------------------------------

Otros códigos relevantes:

-   `401 Unauthorized`: no hay autenticación válida.
-   `403 Forbidden`: el usuario autenticado no tiene permisos.
-   `405 Method Not Allowed`: método no admitido para la ruta.
-   `413 Content Too Large`: cuerpo mayor al límite configurado.
-   `415 Unsupported Media Type`: tipo de contenido no admitido.
-   `429 Too Many Requests`: se superó el límite de solicitudes.
-   `500 Internal Server Error`: error inesperado del servidor.
-   `503 Service Unavailable`: servicio temporalmente no disponible.

No se debe devolver `200` para todos los casos. El código debe describir
el resultado real de la operación. En una respuesta `204`, no se envía
cuerpo.

## 8. Validación, sanitización y manejo de JSON

-   Validar `req.body`, `req.params` y `req.query` con esquemas
    explícitos.
-   Comprobar tipos, longitudes, formatos, rangos y campos obligatorios.
-   Rechazar campos inesperados cuando el contrato del recurso sea
    estricto.
-   Definir `express.json({ limit: process.env.JSON_LIMIT || '1mb' })`.
-   Responder con `400` cuando el JSON no pueda analizarse.
-   Usar `415` cuando el tipo de contenido no esté soportado.
-   Normalizar únicamente los datos para los que exista una regla clara.
-   No confiar en validaciones realizadas exclusivamente en el frontend.

La validación de entrada no reemplaza las restricciones de PostgreSQL:
se deben definir claves primarias, claves foráneas, `NOT NULL`, `UNIQUE`
y restricciones `CHECK` cuando correspondan.

## 9. Paginación

Para colecciones grandes, la API debe evitar devolver todos los
registros en una sola solicitud.

Ejemplo:

`GET /api/v1/usuarios?page=2&limit=10`

-   `page`: número de página, mínimo 1.
-   `limit`: cantidad de registros por página, por defecto 10.
-   `maxLimit`: máximo permitido, por ejemplo 100.
-   `offset`: `(page - 1) * limit`.

Respuesta sugerida:

``` json
{
  "data": [],
  "pagination": {
    "page": 2,
    "limit": 10,
    "total": 35,
    "totalPages": 4
  }
}
```

Los valores de `limit` y `offset` deben validarse como enteros. Para
grandes volúmenes de datos o listados que cambian con frecuencia, se
puede considerar paginación por cursor.

## 10. Seguridad y buenas prácticas

1.  **Consultas parametrizadas:** utilizar parámetros `$1`, `$2`, etc.
    en PostgreSQL para reducir el riesgo de inyección SQL.
2.  **Credenciales:** guardar secretos en variables de entorno o
    gestores de secretos; nunca en el código fuente.
3.  **CORS:** autorizar solo los orígenes necesarios. CORS no sustituye
    la autenticación ni la autorización.
4.  **Helmet:** establecer cabeceras HTTP de seguridad.
5.  **Rate limiting:** limitar solicitudes, especialmente en endpoints
    de autenticación y operaciones sensibles.
6.  **Autenticación y autorización:** si el sistema maneja cuentas,
    verificar identidad y permisos en el servidor.
7.  **Contraseñas:** almacenar contraseñas con algoritmos de hash
    adecuados, como Argon2id o bcrypt; nunca en texto plano.
8.  **Validación:** validar todos los datos recibidos y aplicar límites
    de tamaño.
9.  **Errores:** no enviar al cliente trazas, consultas SQL, contraseñas
    ni detalles de infraestructura.
10. **Transacciones:** agrupar operaciones relacionadas en transacciones
    para mantener la integridad de los datos.
11. **Principio de mínimo privilegio:** el usuario de PostgreSQL de la
    aplicación debe tener solo los permisos requeridos.
12. **TLS:** utilizar HTTPS en producción y configurar correctamente la
    conexión segura a PostgreSQL cuando el entorno lo requiera.
13. **Registros:** registrar errores y eventos importantes sin guardar
    contraseñas, tokens ni datos personales innecesarios.
14. **Dependencias:** mantener paquetes actualizados y revisar
    vulnerabilidades.
15. **Control de acceso a datos:** no devolver campos sensibles ni
    aceptar que el cliente establezca propiedades protegidas, como roles
    o permisos.

## 11. Ejemplo de responsabilidades por archivo

  ---------------------------------------------------------------------------
  Archivo                                 Responsabilidad principal
  --------------------------------------- -----------------------------------
  `server.js`                             Configurar Express y escuchar en el
                                          puerto 5050.

  `config/database.js`                    Crear y exportar el pool Singleton
                                          de PostgreSQL.

  `route/usuario.routes.js`               Definir endpoints del recurso
                                          usuarios.

  `middleware/validate.middleware.js`     Validar entradas usando esquemas.

  `middleware/sanitize.middleware.js`     Aplicar normalización permitida.

  `middleware/pagination.middleware.js`   Validar y calcular paginación.

  `middleware/error.middleware.js`        Convertir errores en respuestas
                                          HTTP consistentes.

  `controller/usuario.controller.js`      Coordinar las operaciones HTTP de
                                          usuarios.

  `models/usuario.repository.js`          Ejecutar operaciones SQL
                                          parametrizadas de usuarios.

  `factories/repository.factory.js`       Construir y entregar repositorios
                                          registrados.

  `services/usuario.service.js`           Aplicar reglas de negocio de
                                          usuarios.

  `schemas/usuario.schema.js`             Definir reglas de validación del
                                          recurso.
  ---------------------------------------------------------------------------

## 12. Criterios de calidad y pruebas

Antes de considerar terminado un recurso, comprobar:

-   Que todos sus endpoints estén documentados.
-   Que GET, POST, PUT, PATCH y DELETE tengan el comportamiento
    esperado.
-   Que las entradas inválidas sean rechazadas.
-   Que los códigos HTTP correspondan al resultado.
-   Que no sea posible inyectar SQL mediante parámetros.
-   Que los permisos se comprueben en el servidor.
-   Que los errores no filtren información interna.
-   Que la paginación respete los límites configurados.
-   Que las operaciones que requieren atomicidad utilicen transacciones.
-   Que existan pruebas unitarias para servicios/repositorios y pruebas
    de integración para endpoints.
-   Que la API tenga documentación, por ejemplo mediante
    OpenAPI/Swagger.

## 13. Instalación inicial sugerida

Inicializar el proyecto e instalar dependencias:

``` bash
npm init -y
npm install express pg dotenv cors helmet express-rate-limit zod
npm install --save-dev nodemon
```

En `package.json`, se pueden definir scripts como:

``` json
{
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  }
}
```

La configuración de módulos debe ser consistente. Si se utiliza
`import`/`export`, establecer `"type": "module"` en `package.json`; si
se utiliza `require`, mantener CommonJS. No mezclar ambos estilos sin
una configuración explícita.

## 14. Conclusión

La arquitectura propuesta combina N capas, cliente-servidor y REST,
organiza la API mediante MVC y aplica Repository, Singleton y Factory
donde aportan valor. Express gestiona el ciclo HTTP; los controladores
coordinan las solicitudes; los servicios concentran reglas de negocio;
los repositorios encapsulan las consultas; y PostgreSQL conserva los
datos.

Esta separación facilita el mantenimiento, las pruebas, la seguridad y
la ampliación del sistema. El servidor se ejecutará en el puerto `5050`,
la API se expondrá bajo `/api/v1` y las configuraciones dependientes del
entorno se administrarán mediante `.env`.
