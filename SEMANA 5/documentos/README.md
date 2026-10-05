# Offline Posts (PWA)

Aplicación web progresiva pequeña que demuestra el flujo:

> **Fetch API + IndexedDB + Service Worker + Cache API = aplicación que funciona sin conexión y se sincroniza al volver la red.**

No usa frameworks, no usa librerías externas y no tiene backend. Es un proyecto
frontend estático hecho solo con HTML5, CSS3 y JavaScript ES6+.

**Publicada en GitHub Pages:**
<https://lenincaizavfc-ux.github.io/REPASO-EN-CLASES/SEMANA%205/index.html>

---

## 1. ¿Qué hace la aplicación?

- Descarga publicaciones de una API pública con `fetch()`.
- Guarda esas publicaciones en **IndexedDB** (la base de datos local del navegador).
- Muestra un indicador de conexión: 🟢 Conectado / 🔴 Sin conexión.
- Permite crear publicaciones nuevas con un formulario.
- Si el usuario está sin conexión, la aplicación **igual abre** y muestra lo que
  ya estaba descargado.
- Las publicaciones creadas sin conexión quedan como **"🟠 Pendiente de
  sincronización"**.
- Cuando vuelve la conexión, se detectan los pendientes y se envían con
  `POST`; las que se envían bien pasan a **"🟢 Sincronizada"**.

## 2. ¿Qué API utiliza?

```
GET  https://jsonplaceholder.typicode.com/posts/
POST https://jsonplaceholder.typicode.com/posts/
```

**Aviso importante:** JSONPlaceholder es una API de prueba. Los `POST` **no se
guardan realmente en el servidor**: la respuesta `201` solo confirma que la
petición fue válida. Por eso la aplicación **no dice que el dato quedó en el
servidor**. La persistencia real de la aplicación se demuestra con **IndexedDB**
(la base de datos del navegador). El objetivo es mostrar el recorrido
`Usuario → IndexedDB → Fetch POST → estado "sincronizada"`.

## 3. Estructura del proyecto

Los archivos están agrupados por tipo. `index.html` se queda en la raíz porque es
la página que abre la aplicación al entrar; todo lo demás va en su carpeta.

```
/
├── index.html          -> estructura semántica, formulario y contenedores
├── sw.js               -> Service Worker + Cache API (va en la raíz, ver abajo)
├── manifest.json       -> datos de la PWA (nombre, iconos, colores)
├── css/
│   └── styles.css      -> CSS mobile-first (Flexbox + Grid + media queries)
├── js/
│   ├── app.js          -> Fetch API, interfaz, conexión y sincronización
│   └── db.js           -> capa de datos con IndexedDB (objeto global DB)
├── icons/
│   ├── icon.svg        -> icono vectorial
│   ├── icon-192.png    -> icono 192x192 (instalación en el móvil)
│   └── icon-512.png    -> icono 512x512
└── documentos/
    ├── README.md               -> este archivo
    ├── INFORME_PWA_FETCH_INDEXEDDB.md
    └── AUDITORIA.md
```

**¿Por qué `sw.js` no puede ir en `js/`?** Porque un Service Worker solo
controla, como máximo, la carpeta donde está su archivo. Si viviera en `js/sw.js`
su scope máximo sería `/js/` y la app (que está un nivel arriba) quedaría sin
modo offline. Para subir el scope hay que responder con la cabecera
`Service-Worker-Allowed: /`, y GitHub Pages no permite enviarla. Por eso
`sw.js` se queda en la raíz, junto a `index.html`:

```js
navigator.serviceWorker.register('sw.js');
```

Los iconos son los únicos archivos extra: los necesita el `manifest.json` para
que la app se pueda instalar en el celular.

## 4. Cómo funciona la Fetch API

En `js/app.js` hay dos operaciones:

**GET (descargar publicaciones)** — `cargarPublicaciones()`:

```js
const response = await fetch(API_URL);

if (!response.ok) {
  throw new Error(`La API respondió con estado HTTP ${response.status}`);
}

const posts = await response.json();
await DB.guardarPosts(posts);
```

`response.ok` es `false` cuando el servidor responde con error (404, 500...).
Todo está dentro de un `try/catch`: si falla (no hay red, error HTTP, etc.) la
aplicación **no se rompe**, solo cae en `mostrarDatosLocales()`.

Además, las peticiones usan un **límite de tiempo de 10 segundos**
(`fetchConTimeout()` + `AbortController`). Si la red se queda colgada en vez de
responder con error, la petición se cancela y la interfaz nunca se congela ni
el botón se queda pulsado para siempre.

> El Service Worker se registra **sin `await`** (y al principio de `iniciar()`),
> así que su descarga nunca congela la interfaz: aunque el registro se quede
> colgado, la app sigue mostrando las publicaciones y el formulario responde.

**POST (crear / sincronizar)** — `enviarPost()`:

```js
const response = await fetch(API_URL, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ title: post.title, body: post.body, userId: post.userId })
});
```

## 5. Cómo se usa IndexedDB

`db.js` es una capa pequeña y ordenada sobre IndexedDB. Todo se expone en el
objeto global `DB`, así se lee muy fácil en clase:

| Función | Qué hace |
| --- | --- |
| `abrirBaseDatos()` | Abre o crea `OfflinePostsDB` y el object store `posts` |
| `guardarPosts(posts)` | Guarda el arreglo que devuelve la API |
| `obtenerPosts()` | Devuelve todas las publicaciones (pendientes primero) |
| `guardarPost(post)` | Guarda una publicación creada por el usuario |
| `obtenerPostsPendientes()` | Devuelve solo las de estado `"pendiente"` |
| `actualizarEstadoPost(id, estado, idRemoto)` | Cambia el estado, p. ej. a `"sincronizada"`, y guarda el `id` que devolvió la API |
| `borrarTodosLosPosts()` | Vacía el store (solo para pruebas) |

Cada publicación se guarda con esta forma:

```js
{
  id,             // id de la API, o "local-..." si la creó el usuario
  idRemoto,       // id que devolvió la API (null si aún no se ha sincronizado)
  userId,
  title,
  body,
  estado,         // "sincronizada" | "pendiente"
  local,          // true = creada en este dispositivo
  fechaCreacion   // Date.now() en las creadas aquí; 0 en las que devuelve la API
}
```

`obtenerPosts()` devuelve las pendientes primero y, dentro de cada grupo, de la
más reciente a la más antigua: así lo que el usuario acaba de escribir siempre
aparece arriba, sin importar cuándo se sincronizó.

IndexedDB trabaja con eventos (`onsuccess`, `onerror`), así que en `db.js` se
convierten en Promises con dos funciones auxiliares
(`peticiónComoPromesa` y `transaccionTerminada`) para poder usar
`async/await`, que es mucho más legible.

## 6. Funcionamiento offline

Son tres capas:

1. **Service Worker (`sw.js`)** — guarda los archivos estáticos
   (`index.html`, `styles.css`, `app.js`, `db.js`, `manifest.json`, iconos) en
   una caché llamada `offline-posts-v3`. Así la app abre sin conexión después de
   haber sido cargada una vez con internet. Al cambiar un archivo hay que subir
   el número de la caché: en el `activate` se borran las versiones antiguas.
2. **Cache API** — se usa dentro del Service Worker. Para los archivos del sitio
   usa *network first*: intenta la red y, si falla, devuelve la copia guardada.
   Solo se guardan respuestas exitosas (`response.ok`); si el servidor devuelve
   un error 404 o 500, esa respuesta **no** se cachea, porque si se guardara la
   app quedaría sirviendo siempre ese error al quedarse sin conexión.
3. **IndexedDB (`db.js`)** — guarda los **datos** (las publicaciones). El Service
   Worker **no** cachea la API: las peticiones a `jsonplaceholder.typicode.com`
   se dejan pasar sin interceptar.

Cuando no hay red, `cargarPublicaciones()` falla y la app llama a
`mostrarDatosLocales()`, que lee todo de IndexedDB.

## 7. Sincronización

`sincronizarPendientes()` (en `app.js`):

1. Lee de IndexedDB las publicaciones con estado `"pendiente"`.
2. Si no hay ninguna, no hace nada (no hace sincronizaciones inútiles).
3. Envía cada una con `POST` a la API.
4. Si el `POST` responde bien → `actualizarEstadoPost(id, 'sincronizada', id)`.
5. Si falla → se queda `"pendiente"` para el próximo intento.
6. Vuelve a pintar la interfaz y avisa con un mensaje.

Si la red se cae durante el envío (o el `POST` supera el tiempo límite de 10 s),
el bucle **se corta en ese punto**: las publicaciones que quedaban después siguen
pendientes y se reintentarán en la próxima sincronización. Así el usuario no
espera 10 s por cada publicación cuando el problema es que no hay internet.

Se ejecuta:

- Al cargar la app, si hay conexión.
- En `window.addEventListener('online', ...)`, o sea, al recuperar internet.

## 8. Estado de conexión

Se usa `navigator.onLine` y los eventos `online` / `offline` del navegador:

| Situación | Indicador | Mensaje |
| --- | --- | --- |
| Conectado | 🟢 Conectado | "Publicaciones actualizadas desde la API." |
| Se cae la red | 🔴 Sin conexión | "Sin conexión. Trabajando con datos locales." |
| Vuelve la red | 🟢 Conectado | "Conexión recuperada." + sincronización |

Ojo: `navigator.onLine` solo dice si hay interfaz de red, no si la API responde.
Por eso, aunque diga "Conectado", si el `fetch` falla la app avisa y usa los
datos locales.

## 9. Cómo probar el modo offline

Un Service Worker y `localhost` requieren un servidor HTTP. **No abras el
`index.html` con doble clic**, usa un servidor estático:

```bash
# Opción 1 (Python)
python -m http.server 8000

# Opción 2 (Node)
npx serve .
```

Luego entra a `http://localhost:8000`.

> Si abres el archivo con doble clic (`file://`) la app **igual funciona**
> (IndexedDB y `fetch` sirven), pero el Service Worker no se puede registrar y
> el manifest no carga, así que **no hay modo offline ni instalación**. En ese
> caso la app escribe un aviso en la consola del navegador.

**Prueba 1 — descarga y persistencia**

1. Abre la app con internet.
2. Se muestran las 100 publicaciones de la API.
3. Abre DevTools → *Application* → *IndexedDB* → `OfflinePostsDB` → `posts`:
   están guardadas. Este paso es el que se demuestra en clase.

**Prueba 2 — abrir sin conexión**

1. En DevTools → *Network*, marca la casilla **Offline**.
2. Recarga la página (F5). La app **abre igual** (gracias al Service Worker).
3. Las publicaciones siguen visibles, vienen de IndexedDB, e indica 🔴 Sin conexión.

**Prueba 3 — crear sin conexión**

1. Sigue en modo Offline.
2. Escribe un título y un contenido, pulsa "Agregar publicación".
3. La tarjeta aparece de inmediato con **🟠 Pendiente de sincronización**.
4. En IndexedDB puedes verla con `estado: "pendiente"` y `local: true`.

**Prueba 4 — sincronización**

1. En DevTools → *Network*, desmarca **Offline** (o activa el Wi-Fi del equipo).
2. El evento `online` se dispara solo: el indicador pasa a 🟢 y se ejecuta
   `sincronizarPendientes()`.
3. En DevTools → *Network* verás el `POST` a
   `https://jsonplaceholder.typicode.com/posts/`.
4. La tarjeta cambia a **🟢 Sincronizada** y el mensaje dice que la sincronización
   se completó.
5. Vuelve a IndexedDB y comprueba que el registro pasó a `estado: "sincronizada"`.

**Atajo para probar sin cables:** DevTools → *Network* → *Throttling* →
`Offline`. Simula la caída y la recuperación de la conexión al instante.

**Para empezar de cero** (borrar lo descargado):
DevTools → *Application* → *Storage* → *Clear site data*, o en la consola:

```js
DB.borrarTodosLosPosts().then(() => location.reload());
```

## 10. Accesibilidad y diseño

- HTML semántico: `header`, `main`, `section`, `article`, `footer`.
- Cada campo del formulario tiene su `<label>` y `required`, con mensajes de
  error propios usando la API de validación nativa
  (`checkValidity` / `validity.valueMissing`).
- Al validar, cada campo queda marcado con `aria-invalid` y su mensaje con
  `role="alert"`, y el foco salta al primer campo con error: el usuario que usa
  lector de pantalla oye qué campo falló sin tener que buscarlo.
- `aria-describedby` enlaza cada campo con su mensaje de error.
- El `<main>` lleva `tabindex="-1"` para que el enlace "Saltar al contenido"
  mueva de verdad el foco al contenido.
- Botones `<button>` reales, no `div` disfrazados.
- `#mensaje` con `aria-live="polite"` y `role="status"`: los cambios se anuncian.
- `#avisoCarga` es una región `aria-live="polite"` oculta visualmente: anuncia
  "Cargando publicaciones..." (un `aria-busy` solo, sin texto en una región viva,
  no lo anunciaría).
- `#contenedorPosts` con `aria-busy` mientras carga.
- Enlace "Saltar al contenido" y foco visible (`:focus-visible`).
- Contraste de color comprobado con la fórmula de WCAG:
  - texto normal 14.6:1 y texto secundario 6.2:1 sobre el panel (mínimo 4.5:1);
  - borde de los campos `#8a94a6` = 3.06:1 (mínimo 3:1, WCAG 1.4.11);
  - texto del pie `#334155` = 8.4:1 sobre su fondo;
  - el punto verde/rojo del indicador de conexión = 3.7:1 y 3.6:1 sobre el azul
    de la cabecera.
- Objetivo táctil del enlace del pie de 24 px de alto como mínimo (WCAG 2.5.8).
- El `manifest.json` no fija orientación: la app se adapta a vertical y a
  horizontal.
- Los datos del usuario se pintan con `textContent`, nunca con `innerHTML`.
- Cada `id` del HTML es único. Ojo: si dos elementos comparten `id`,
  `querySelector('#x')` devuelve el primero y el segundo queda inalcanzable
  (a `main` se le puso `id="contenidoPrincipal"` justamente para no chocar con
  el `id="contenido"` del `<textarea>`).
- Si el texto del usuario **no** se pudo guardar en IndexedDB, el formulario
  **no se vacía**: se le avisa, se marca el campo con `aria-invalid` y se le
  devuelve el foco, para que el usuario pueda reintentar sin volver a escribir.
- Si algún error de JavaScript llegara a escapar, aparece en `#mensaje`
  gracias a `window.addEventListener('error', ...)`: nunca hay una página
  "estática" que no avise qué pasó.
- CSS mobile-first con Flexbox, Grid, media queries y unidades relativas
  (`rem`, `%`): 1 columna en celular, 2 en tablet, 3 tarjetas y barra lateral en
  escritorio.

## 11. Estructura del código en `app.js`

| Sección | Contenido |
| --- | --- |
| 1 | Utilidades de la interfaz (`mostrarMensaje`, `setCargando`) |
| 2 | Estado de conexión (`navigator.onLine`, eventos `online`/`offline`) |
| 3 | Fetch API: `cargarPublicaciones()` y `mostrarDatosLocales()` |
| 4 | `pintarPublicaciones()` — construcción de las tarjetas |
| 5 | Fetch API: `enviarPost()` |
| 6 | `sincronizarPendientes()` |
| 7 | Formulario y validación |
| 8 | Registro del Service Worker |
| 9 | `iniciar()` |

## 12. Limitaciones (a propósito)

- No hay login, usuarios, dashboard, backend ni autenticación.
- No se usa `localStorage` para las publicaciones: el almacenamiento principal
  es IndexedDB.
- JSONPlaceholder no persiste los `POST`; el estado "sincronizada" significa
  "el servidor aceptó la petición", y la copia que sobrevive es la de IndexedDB.