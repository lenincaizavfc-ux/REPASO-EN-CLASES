# INFORME: APLICACIÓN WEB PROGRESIVA CON FETCH API E INDEXEDDB

**Asignatura:** Desarrollo en Plataformas
**Proyecto:** Offline Posts (PWA)
**API utilizada:** https://jsonplaceholder.typicode.com/posts/

---

## 1. Objetivo general

Desarrollar una aplicación web progresiva (PWA) que consuma publicaciones de una API pública mediante Fetch API y que mantenga esa información disponible sin conexión, almacenándola en IndexedDB y sincronizando las publicaciones pendientes cuando se recupera el acceso a Internet.

---

## 2. Objetivos específicos

1. Consumir la API de publicaciones mediante Fetch API y mostrar los datos en la interfaz.
2. Almacenar las publicaciones obtenidas en IndexedDB para que puedan consultarse sin conexión.
3. Permitir el funcionamiento offline: abrir la aplicación y crear publicaciones cuando no hay red.
4. Detectar la pérdida y la recuperación de la conexión mediante los eventos `offline` y `online`.
5. Sincronizar mediante Fetch (POST) las publicaciones pendientes cuando se recupera Internet.

---

## 3. Resumen

El proyecto consiste en una aplicación web progresiva llamada **Offline Posts**, desarrollada con HTML5, CSS3 y JavaScript, sin frameworks ni dependencias externas.

La aplicación consume publicaciones desde la API pública JSONPlaceholder (`https://jsonplaceholder.typicode.com/posts/`) mediante Fetch API. Cada vez que se ejecuta correctamente la solicitud, las publicaciones se guardan en **IndexedDB**, que es la base de datos local del navegador, y luego se muestran en la interfaz.

Si la solicitud con Fetch falla por falta de conexión o por un error del servidor, la aplicación no se detiene: recupera los datos almacenados en IndexedDB y los muestra, indicando al usuario que está trabajando con información local. De esta forma la aplicación sigue funcionando sin Internet.

La aplicación también permite crear publicaciones mediante un formulario. Si el usuario no tiene conexión, la publicación se guarda en IndexedDB con el estado **"pendiente"**. Cuando el navegador detecta el evento `online`, la aplicación ejecuta una función de sincronización que envía cada publicación pendiente a la API mediante Fetch con el método POST y, si la petición es correcta, cambia su estado a **"sincronizada"**.

El Service Worker y la Cache API permiten que la aplicación abra sin conexión, ya que guardan en caché los archivos estáticos del proyecto.

Debe aclararse que JSONPlaceholder es una API de prueba: los POST no se almacenan de forma permanente en el servidor. La persistencia real de la aplicación se realiza mediante IndexedDB.

---

## 4. Introducción

Hoy en día las aplicaciones web se usan desde dispositivos móviles, en situaciones donde la conexión a Internet no es estable o directamente no existe. El problema aparece cuando una aplicación depende completamente de un servidor: si la red falla, el usuario se queda sin información. Las PWA nacen para resolver ese problema, porque permiten que una aplicación web siga funcionando sin conexión. Fetch API permite realizar solicitudes HTTP a una API, mientras que IndexedDB permite guardar en el dispositivo la información recibida. Combinando ambas tecnologías, los datos obtenidos mediante Fetch permanecen disponibles aunque el servidor no responda, que es el objetivo principal de la Semana 5 y el propósito de este proyecto.

---

## 5. Fundamentos teóricos

### 5.1 Aplicaciones Web Progresivas (PWA)

Una PWA es una aplicación web construida con tecnologías estándar (HTML, CSS y JavaScript) que puede instalarse en el dispositivo y comportarse como una aplicación nativa. Sus características principales son: funcionar sin conexión, ser instalable y seguir un diseño adaptable.

En este proyecto, la característica que permite trabajar sin conexión es el **Service Worker**, que guarda los archivos de la aplicación en una caché, combinado con IndexedDB, que guarda los datos de las publicaciones.

### 5.2 Fetch API

Fetch API es la interfaz estándar de JavaScript para realizar solicitudes HTTP. Devuelve una Promise y permite usar `async/await`, lo que facilita la lectura del código.

Se utilizó para:

- **GET:** obtener las publicaciones de la API.
- **POST:** enviar publicaciones nuevas o pendientes.

Antes de procesar los datos se verifica `response.ok`, porque es `false` cuando el servidor responde con un error HTTP (por ejemplo, 404 o 500).

### 5.3 API REST

Una API REST es una interfaz que intercambia información mediante URL y métodos HTTP estándar. JSONPlaceholder es una API REST pública y gratuita que devuelve datos de ejemplo con formato JSON. En el proyecto se utilizó el recurso `/posts/`, que devuelve 100 publicaciones de prueba. Al ser una API de prueba, los datos enviados mediante POST no se guardan permanentemente en el servidor.

### 5.4 IndexedDB

IndexedDB es la base de datos incluida en el navegador. Permite almacenar grandes cantidades de datos de forma estructurada y asíncrona, y a diferencia de `localStorage`, trabaja con objetos completos y no bloquea la interfaz.

Se eligió porque es el almacenamiento principal de la aplicación: aquí se guardan las publicaciones descargadas y las creadas por el usuario. Organiza la información en una base de datos llamada `OfflinePostsDB` y un object store llamado `posts`.

### 5.5 Service Worker

El Service Worker es un script que el navegador ejecuta en segundo plano, separado de la página. Su función dentro de la aplicación es interceptar las solicitudes de los archivos del proyecto y decidir si se responden desde la red o desde la caché local, permitiendo que la aplicación abra sin conexión.

### 5.6 Cache API

La Cache API es la interfaz que permite guardar y recuperar respuestas HTTP en el navegador. En el proyecto se utiliza dentro del Service Worker para almacenar los archivos estáticos (`index.html`, `styles.css`, `app.js`, `db.js` y `manifest.json`). Así, cuando no hay red, esos archivos se sirven desde la caché y la aplicación puede arrancar.

Debe aclararse que la Cache API no almacena las publicaciones, sino los archivos del programa. Los datos se almacenan en IndexedDB.

### 5.7 Sincronización offline/online

El flujo principal de la aplicación es el siguiente:

- **Fetch funciona:** se obtiene el JSON, se guarda en IndexedDB y se muestra en el DOM.
- **Fetch falla:** la aplicación captura el error y recupera los datos guardados en IndexedDB, informando al usuario que trabaja con datos locales.

Para la sincronización se utilizan los eventos `online` y `offline` del navegador, junto con la propiedad `navigator.onLine`. Cuando una publicación se crea sin conexión, se guarda con el estado `"pendiente"`. Al recuperar la conexión, la aplicación consulta las publicaciones pendientes, envía cada una mediante POST y actualiza su estado a `"sincronizada"` si la respuesta es correcta.

---

## 6. Metodología

### 6.1 Diseño arquitectónico del software

La aplicación se diseñó con una arquitectura simple de tres capas: interfaz, lógica y datos. El flujo con conexión es:

```
Usuario
   ↓
Interfaz web (HTML + CSS)
   ↓
JavaScript (app.js)
   ↓
Fetch API
   ↓
JSONPlaceholder
```

- **Interfaz web:** muestra las publicaciones, el formulario y el indicador de conexión.
- **JavaScript:** coordina las solicitudes, la interfaz y los eventos del navegador.
- **Fetch API:** realiza las solicitudes HTTP hacia la API.
- **JSONPlaceholder:** entrega los datos de ejemplo.

En el funcionamiento sin conexión, el flujo es:

```
JavaScript (app.js)
   ↓
IndexedDB
   ↓
Interfaz web
```

La Cache API interviene únicamente para los archivos del programa:

```
Service Worker
   ↓
Cache API
   ↓
Archivos estáticos
```

### 6.2 Patrón arquitectónico utilizado

Se utilizó una arquitectura **cliente-servidor**, en la que el navegador actúa como cliente y consume una API externa mediante HTTP. No existe un servidor propio: la parte del servidor está representada por JSONPlaceholder.

Internamente el proyecto sigue un estilo **por capas y de separación de responsabilidades**:

- `index.html` solo define la estructura.
- `styles.css` solo define la presentación.
- `db.js` solo se encarga de los datos (IndexedDB).
- `app.js` coordina la interfaz, Fetch y la sincronización.
- `sw.js` se ocupa del Service Worker y la caché.

De esta forma cada archivo tiene una única responsabilidad y el código es más fácil de explicar y mantener.

### 6.3 Herramientas utilizadas

| Herramienta | Uso |
|---|---|
| Visual Studio Code | Editor de código para crear y organizar los archivos |
| OpenCode | Asistente de programación usado como apoyo para escribir y revisar el código |
| HTML5 | Estructura semántica de la interfaz y formulario accesible |
| CSS3 | Diseño adaptable (Flexbox, Grid y media queries) |
| JavaScript ES6+ | Lógica de la aplicación con `async/await`, `const`, `let` y funciones flecha |
| Fetch API | Solicitudes GET y POST a la API |
| IndexedDB | Almacenamiento local de las publicaciones |
| Service Worker | Control del funcionamiento sin conexión |
| Cache API | Caché de los archivos estáticos |
| JSONPlaceholder | API pública de datos de prueba |
| Navegador web | Ejecución, pruebas y uso de las DevTools |

### 6.4 Comienzo de la programación

1. Crear la estructura HTML del proyecto (`index.html`).
2. Diseñar la interfaz adaptable con CSS3 (mobile-first, una columna en móvil y varias en pantallas grandes).
3. Implementar la solicitud GET con Fetch API y mostrar los datos en el DOM.
4. Crear la base de datos `OfflinePostsDB` y el object store `posts` en `db.js`.
5. Implementar las funciones para guardar y leer publicaciones en IndexedDB.
6. Implementar la recuperación de datos desde IndexedDB cuando Fetch falla.
7. Crear el formulario para crear publicaciones con validación de campos.
8. Crear el Service Worker (`sw.js`) y la caché de los archivos estáticos.
9. Implementar la detección de conexión con `navigator.onLine` y los eventos `online` y `offline`.
10. Implementar la función `sincronizarPendientes()` para enviar las publicaciones pendientes.
11. Realizar pruebas en el navegador con y sin conexión.

---

## 7. Resultados

### 7.1 Resultado de la aplicación

La aplicación se comporta correctamente en las cuatro situaciones previstas:

- **Con conexión:** descarga las publicaciones, las guarda en IndexedDB y las muestra.
- **Sin conexión:** la aplicación abre igual gracias al Service Worker y muestra las publicaciones guardadas en IndexedDB, con el indicador en rojo.
- **Publicación creada sin conexión:** aparece de inmediato con el estado "Pendiente de sincronización".
- **Conexión recuperada:** se ejecuta la sincronización automática y la publicación cambia a "Sincronizada".

Además, cada tarjeta muestra el título, el contenido y el estado de la publicación.

**Figura 1. Resultado de la aplicación web progresiva.**

[Colocar captura de pantalla aquí]

### 7.2 Testing

Las pruebas se realizaron en Google Chrome y Microsoft Edge, con las DevTools (opción *Offline*) y con la base de datos IndexedDB desde el panel *Application*.

| Prueba | Acción | Resultado esperado | Resultado obtenido |
|---|---|---|---|
| 1 | Cargar la aplicación con Internet | Se muestran las publicaciones de la API | Correcto: 100 publicaciones |
| 2 | Guardado de datos | Las publicaciones quedan en IndexedDB | Correcto |
| 3 | Desconectar Internet | El indicador cambia a "Sin conexión" | Correcto |
| 4 | Recargar la aplicación sin Internet | La aplicación abre y muestra los datos | Correcto |
| 5 | Crear una publicación sin conexión | Aparece con estado "Pendiente" | Correcto |
| 6 | Volver a conectar Internet | Se detecta el evento `online` | Correcto |
| 7 | Sincronización | Se envía el POST y cambia a "Sincronizada" | Correcto |
| 8 | Persistencia tras recargar | La publicación creada sigue apareciendo | Correcto |
| 9 | Validación del formulario | Campos vacíos o muy cortos muestran error | Correcto |
| 10 | Errores en la consola | No hay errores de JavaScript | Correcto |

La captura de pantalla de la figura 1 queda pendiente de tomar durante la presentación.

### 7.3 Seguridad

Se consideraron los siguientes puntos:

- **Validación de entrada:** los campos del formulario son obligatorios y tienen longitud mínima y máxima.
- **Control del contenido del usuario:** los textos se insertan en el DOM con `textContent`, no con `innerHTML`, para evitar la inyección de código.
- **Manejo de errores:** todas las solicitudes usan `try/catch` y se verifica `response.ok`.
- **Límite de tiempo:** las solicitudes se cancelan si no responden, para evitar que la interfaz quede bloqueada.
- **Datos sensibles:** la aplicación no guarda contraseñas ni información personal.
- **HTTPS:** debe publicarse bajo HTTPS para que el Service Worker funcione fuera de `localhost`.
- **CORS:** la API debe permitir el origen de la aplicación; en este caso JSONPlaceholder lo hace.
- **Uso académico:** solo se utiliza una API pública de prueba, sin datos reales.

---

## 8. Conclusiones

1. Se aprendió que Fetch API permite gestionar solicitudes HTTP de forma asíncrona con `async/await`, y que verificar `response.ok` y usar `try/catch` es indispensable para que la aplicación no se detenga ante un error.

2. Se comprendió que IndexedDB es la base de datos local del navegador y que resulta la opción adecuada para guardar información estructurada y disponible sin conexión, a diferencia de `localStorage`.

3. Se entendió el papel del Service Worker y de la Cache API: juntos permiten que una aplicación web abra y funcione sin Internet, mientras que las peticiones a la API siguen sin interceptarse.

4. Se entendió que recuperar los datos desde IndexedDB cuando Fetch falla es la clave para que el usuario no se quede sin información, y que el evento `online` permite sincronizar automáticamente los datos pendientes. En conjunto, combinar Fetch API con IndexedDB permite construir aplicaciones web que siguen siendo útiles incluso sin conexión, que es el objetivo de las PWA.

---

## 9. Bibliografía

- MDN Web Docs. *Fetch API*. Mozilla Developer Network. Recuperado de: https://developer.mozilla.org/es/docs/Web/API/Fetch_API
- MDN Web Docs. *IndexedDB API*. Mozilla Developer Network. Recuperado de: https://developer.mozilla.org/es/docs/Web/API/IndexedDB_API
- MDN Web Docs. *Service Worker API*. Mozilla Developer Network. Recuperado de: https://developer.mozilla.org/es/docs/Web/API/Service_Worker_API
- MDN Web Docs. *Cache API*. Mozilla Developer Network. Recuperado de: https://developer.mozilla.org/es/docs/Web/API/Cache_API
- MDN Web Docs. *Using the Web Storage API*. Mozilla Developer Network. Recuperado de: https://developer.mozilla.org/es/docs/Web/API/Web_Storage_API
- JSONPlaceholder. *Free fake REST API for testing and prototyping*. Recuperado de: https://jsonplaceholder.typicode.com/
- Material teórico de la Semana 5 proporcionado por el docente de la asignatura *Desarrollo en Plataformas*.

---

**Nota importante sobre la API:** JSONPlaceholder es una API de pruebas. Las publicaciones enviadas mediante POST no se almacenan de forma permanente en el servidor; solo se confirman. La persistencia real de la aplicación se demuestra mediante IndexedDB, que es la base de datos local del navegador.