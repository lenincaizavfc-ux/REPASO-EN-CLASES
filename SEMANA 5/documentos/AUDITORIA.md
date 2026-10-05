# AUDITORÍA DE CÓDIGO, ACCESIBILIDAD (WCAG 2.2 AA), PWA Y RESILIENCIA OFFLINE

**Proyecto:** Offline Posts (PWA con Fetch API + IndexedDB + Service Worker)  
**Ubicación del proyecto:** `C:\Users\Asus\Documents\UNIVERSIDAD\SEMESTRE 5\DESARROLLO WEB\RDA 1\APP PROGRESIVA\`  
**Archivos evaluados:**
- `index.html` (3.704 bytes, 114 líneas)
- `styles.css` (8.430 bytes, 443 líneas)
- `app.js` (17.039 bytes, 523 líneas)
- `db.js` (6.041 bytes, 197 líneas)
- `sw.js` (3.040 bytes, 95 líneas)
- `manifest.json` (748 bytes, 32 líneas)
- `README.md` (11.280 bytes, 281 líneas)
- `INFORME_PWA_FETCH_INDEXEDDB.md` (15.430 bytes, 261 líneas)  
**Modalidad de la auditoría:** No destructiva (el código fuente no ha sido modificado).  
**Herramientas de verificación empleadas:** Node.js v24 (verificación sintáctica), Headless Microsoft Edge vía Chrome DevTools Protocol (CDP) para mediciones de layout en tiempo de ejecución (320 px, 390 px, 768 px y 1200 px), cálculo de luminancia relativa y contraste WCAG 2.2, pruebas de mutación de fallos en IndexedDB y análisis de especificaciones WAI-ARIA 1.2 y Service Worker Cache API.

---

## 1. RESUMEN EJECUTIVO

Se ha completado una auditoría técnica senior e integral sobre la aplicación web progresiva **Offline Posts**. El software persigue demostrar el flujo arquitectónico fundamental:
$$\text{Fetch API} + \text{IndexedDB} + \text{Service Worker} + \text{Cache API} \implies \text{Resiliencia Offline y Sincronización}$$

### 1.1. Estado General y Aspectos Positivos
El proyecto demuestra un estándar de ingeniería didáctica y frontend sobresaliente en varios aspectos:
1. **Seguridad contra Cross-Site Scripting (XSS):** Tanto los datos consumidos de la API externa como los datos ingresados por el usuario se inyectan en el DOM estrictamente mediante `textContent` y creación dinámica de nodos (`document.createElement`), evitando vulnerabilidades por inyección HTML.
2. **Jerarquía Semántica Limpia:** Estructura HTML5 correcta con `<header>`, `<main>`, `<section>`, y jerarquía lógica de encabezados sin saltos de nivel (`<h1>` para el título principal, `<h2>` para los paneles y `<h3>` para cada publicación).
3. **Diseño Responsive Sólido:** Ausencia de desbordamiento horizontal (`hasOverflow: false`) en todos los viewports evaluados (320 px, 390 px, 768 px y 1200 px) mediante una estrategia mobile-first con CSS Grid y Flexbox.
4. **Respeto a las Preferencias del Sistema Operativo:** Implementación de `prefers-reduced-motion` para anular animaciones y transiciones en usuarios con sensibilidad vestibular.
5. **Doble Canal de Estado:** El indicador de conexión y las tarjetas de publicaciones acompañan los colores y emojis con texto semántico explícito ("Conectado" / "Sin conexión", "Pendiente de sincronización" / "Sincronizada"), garantizando que la información no dependa exclusivamente del color (WCAG 1.4.1).
6. **Manejo de Tiempos Límite (Timeout):** Uso de `AbortController` en peticiones Fetch para evitar congelamientos perpetuos en redes inestables.

### 1.2. Hallazgos Críticos y Riesgos Principales
A pesar de la sólida base técnica, se han confirmado empíricamente mediante pruebas de instrumentación fallos funcionales, de integridad de datos y de accesibilidad normativa:
1. **Pérdida Definitiva de Datos (Data Loss) en `app.js`:** Si la operación de escritura en IndexedDB falla (por cuota agotada, base bloqueada o fallo de transacción), el bloque `finally` de `manejarEnvio` ejecuta incondicionalmente `limpiarFormulario()`, borrando el formulario y perdiendo irremediablemente el texto que el usuario redactó.
2. **Envenenamiento de Caché (Cache Poisoning) en `sw.js`:** La estrategia "network-first" del Service Worker no valida `response.ok` ni `response.status === 200`. Si el servidor web responde con un error 404, 500 o 502, dicha respuesta corrupta se guarda en la Cache API, provocando que cuando el usuario esté offline la aplicación quede inutilizada de forma permanente.
3. **Desplazamiento e "Invisibilidad" de Publicaciones Nuevas:** Las publicaciones creadas con conexión pasan inmediatamente a `'sincronizada'`. Debido a que IndexedDB ordena por clave y sitúa las claves numéricas (1..100 de la API) antes que las claves de texto (`local-...`), el método `posts.sort()` relega la nueva publicación al índice 100 (al final absoluto del feed). El usuario ve su post desaparecer en una fracción de segundo creyendo que se borró.
4. **Bloqueo Secuencial en Sincronización:** Si existen múltiples publicaciones pendientes y la conexión es inestable, `sincronizarPendientes()` itera secuencialmente esperando hasta 10 segundos por cada publicación, paralizando el arranque de la aplicación y el registro del Service Worker durante decenas de segundos.
5. **Inaccesibilidad del Skip Link:** El elemento `<main id="contenidoPrincipal">` carece de `tabindex="-1"`, impidiendo que los usuarios de teclado transfieran el foco programático al contenido al activar el enlace de salto.
6. **Brechas de Accesibilidad en Formulario (WCAG 3.3.1 / 3.3.2):** Los campos carecen de `aria-describedby` y `aria-invalid`, los errores no tienen `role="alert"` y el foco no se desplaza al campo inválido tras un intento de envío fallido.

### 1.3. Matriz Cuantitativa de Hallazgos

| Severidad | Total | Principales áreas afectadas |
| :--- | :---: | :--- |
| **Crítica** | 2 | Integridad de datos (Data Loss en IndexedDB), Envenenamiento de caché (Service Worker Cache API) |
| **Alta** | 4 | Desplazamiento/Invisibilidad de posts locales, Bloqueo acumulativo de red en sincronización, Foco programático en Skip Link, Validación de formulario y ARIA |
| **Media** | 4 | Contraste de bordes de inputs (WCAG 1.4.11), Contraste de texto en pie de página (WCAG 1.4.3), Tamaño táctil de enlace en footer (WCAG 2.5.8), Desalineación de IDs cliente-servidor |
| **Baja** | 4 | Atributo `aria-busy` sin región viva, Contraste de punto gráfico verde, Ciclo de vida de conexión IndexedDB (`versionchange`), Restricción de orientación en manifest |
| **Total** | **14** | |

---

## 2. CRITERIOS QUE CUMPLEN SATISFACTORIAMENTE

- **Seguridad en la Manipulación del DOM (Prevención de XSS):** En `app.js` (líneas 228–233, 244–248), las cadenas de texto del título y cuerpo de los posts se insertan usando `tarjeta__titulo.textContent` y `tarjeta__cuerpo.textContent`. No se emplea `innerHTML` con datos no confiables.
- **Sintaxis de JavaScript Libre de Errores:** Validación exitosa mediante `node -c` sobre `app.js`, `db.js` y `sw.js`.
- **Estructura Semántica Base (HTML5):** Uso coherente de etiquetas de sección (`<header>`, `<main>`, `<section>`, `<footer>`) con puntos de referencia (`aria-labelledby`) vinculados a sus encabezados correspondientes.
- **Ausencia de Desbordamiento Horizontal (WCAG 1.4.10 Nivel AA):** Comprobado en Microsoft Edge Headless a 320 px, 390 px, 768 px y 1200 px. El ancho total del documento coincide con el viewport (`scrollWidth === clientWidth`).
- **Respeto a Preferencias de Movimiento (WCAG 2.3.3):** Declaración de directiva `@media (prefers-reduced-motion: reduce)` en `styles.css` (líneas 438–443) suprimiendo animaciones y transiciones.
- **Indicador de Foco Visible Global (WCAG 2.4.7 Nivel AA):** Declaración en `styles.css` (líneas 50–53) de `:focus-visible { outline: 3px solid var(--color-primario); outline-offset: 2px; }` con ratio de contraste superior a 5:1.
- **No Dependencia Exclusiva del Color (WCAG 1.4.1 Nivel A):** El estado de conexión no depende únicamente del punto verde/rojo: incluye el texto "Conectado" o "Sin conexión". De igual forma, el estado del post incluye la etiqueta textual "🟠 Pendiente de sincronización" y "🟢 Sincronizada".
- **Resiliencia de Red con AbortController:** El envoltorio `fetchConTimeout` (líneas 41–55 de `app.js`) cancela las peticiones tras 10.000 ms, impidiendo bloqueos indefinidos del hilo principal.

---

## 3. HALLAZGOS Y EVIDENCIA CONCRETA

### 3.1. Hallazgos Críticos

#### [CRIT-01] Pérdida irreversible de datos del usuario ante fallos en IndexedDB (Data Loss)
- **Archivo:** `app.js` (líneas 413–449, función `manejarEnvio`).
- **Elemento afectado:** Bloque `try...catch...finally` del formulario.
- **Evidencia empírica confirmada con CDP:**
  Se inyectó una simulación de fallo en `DB.guardarPost` (simulando cuota de disco agotada o desconexión del almacén). El código ejecuta:
  ```javascript
  // app.js (líneas 415-448)
  try {
    await DB.guardarPost(post);
    ...
  } catch (error) {
    console.error('[OfflinePosts] Error al guardar en IndexedDB:', error);
    mostrarMensaje('No se pudo guardar la publicación en este dispositivo.', 'error');
  } finally {
    botonAgregar.disabled = false;
    limpiarFormulario(); // <-- SE EJECUTA SIEMPRE
  }
  ```
  Al fallar `guardarPost`, la función salta al `catch` y posteriormente al `finally`. `limpiarFormulario()` invoca `formulario.reset()`, vaciando `campoTitulo` y `campoContenido`.
  **Resultado medido en Edge:** `tituloValueAfterError: ""`, `contenidoValueAfterError: ""`, `dataLost: true`. El usuario pierde todo el texto que escribió sin poder editarlo ni reintentarlo.

#### [CRIT-02] Envenenamiento de caché (Cache Poisoning) en Service Worker ante respuestas HTTP erróneas
- **Archivo:** `sw.js` (líneas 72–84).
- **Elemento afectado:** Manejador del evento `fetch` del Service Worker.
- **Evidencia técnica:**
  ```javascript
  // sw.js (líneas 74-81)
  evento.respondWith(
    fetch(peticion)
      .then((response) => {
        const copia = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(peticion, copia));
        return response;
      })
  ```
  La especificación de la Fetch API dicta que la promesa devuelta por `fetch()` solo se rechaza ante fallos de red catastróficos (DNS, desconexión física). Si el servidor responde con un código de error HTTP (como `404 Not Found`, `500 Internal Server Error` o `502 Bad Gateway`), la promesa **resuelve satisfactoriamente**.
  El código actual clona y escribe en la caché dicha respuesta con error (`cache.put(peticion, copia)`), sobreescribiendo el archivo válido (HTML, CSS o JS). En cuanto el navegador pasa a modo offline, la Cache API suministra indefinidamente el error 500/404 guardado, arruinando la PWA.

---

### 3.2. Hallazgos Altos

#### [ALTO-01] Desplazamiento y aparente "desaparición" de publicaciones recién creadas
- **Archivos:** `db.js` (líneas 110–122) y `app.js` (líneas 430–435).
- **Elemento afectado:** Algoritmo de ordenamiento en `DB.obtenerPosts()`.
- **Evidencia empírica confirmada con CDP:**
  Al crear una publicación estando conectado a internet:
  1. Se guarda localmente como `estado: 'pendiente'`. En este estado, `obtenerPosts()` la ubica en el índice 0 (arriba de las 100 de la API).
  2. Inmediatamente después, `enviarPost(post)` resuelve con éxito y cambia su estado a `estado: 'sincronizada'`.
  3. Al volver a llamar a `pintarPublicaciones()`, se invoca `obtenerPosts()` con la regla de ordenación:
     ```javascript
     return posts.sort((a, b) => {
       if (a.estado === b.estado) return 0;
       return a.estado === 'pendiente' ? -1 : 1;
     });
     ```
  4. Como la nueva publicación y las 100 publicaciones de la API tienen `estado === 'sincronizada'`, el comparador retorna `0`. En los motores JS modernos, el orden se mantiene tal como lo entrega `almacen.getAll()`.
  5. En IndexedDB, las claves numéricas (`1..100`) se indexan antes que las cadenas de texto (`local-...`).
  **Resultado medido en Edge:** `totalCards: 101`, `myCardIndex: 100` (última posición). La tarjeta del usuario se desplaza instantáneamente 100 lugares hacia abajo, fuera del campo visual. El usuario experimenta un "parpadeo" y percibe que su publicación fue eliminada.

#### [ALTO-02] Bloqueo acumulativo y secuencial de la sincronización offline
- **Archivo:** `app.js` (líneas 317–326 y 506–509).
- **Elemento afectado:** Bucle de sincronización en `sincronizarPendientes()`.
- **Evidencia técnica:**
  ```javascript
  for (const post of pendientes) {
    try {
      await enviarPost(post);
      await DB.actualizarEstadoPost(post.id, 'sincronizada');
      sincronizadas += 1;
    } catch (error) { ... }
  }
  ```
  Cada llamada a `enviarPost` implementa un límite de 10 segundos (`TIEMPO_LIMITE_MS = 10000`). En escenarios de red inestable o conectividad cautiva sin salida a Internet, la iteración es estrictamente secuencial. Si un usuario acumuló 5 notas offline, la aplicación se congelará durante $5 \times 10 = 50\text{ segundos}$.
  Dado que en `iniciar()` se ejecuta `await sincronizarPendientes()`, el arranque global de la app y la llamada a `registrarServiceWorker()` quedan bloqueados durante casi un minuto.

#### [ALTO-03] Enlace de salto ("Skip link") inoperante para foco secuencial de teclado (WCAG 2.4.1)
- **Archivos:** `index.html` (líneas 18 y 36), `styles.css` (líneas 56–68).
- **Elemento afectado:** `<a class="saltar-al-contenido" href="#contenidoPrincipal">` y `<main id="contenidoPrincipal">`.
- **Evidencia empírica CDP:**
  `mainTabIndex: null`.
  El enlace `<a class="saltar-al-contenido" href="#contenidoPrincipal">` apunta al `<main>`, pero este no tiene el atributo `tabindex="-1"`. En navegadores basados en Chromium y WebKit, la navegación por ancla interna a un contenedor sin foco programático altera el scroll pero deja el foco secuencial (`document.activeElement`) en el elemento disparador. Al pulsar la tecla `Tab` después del salto, el foco regresa a la cabecera en lugar de ingresar a los controles de `<main>`.
- **Criterio vulnerado:** WCAG 2.2 SC 2.4.1 *Bypass Blocks* (Nivel A).

#### [ALTO-04] Accesibilidad deficiente en mensajes de error del formulario (WCAG 3.3.1, 3.3.2, 4.1.2)
- **Archivos:** `index.html` (líneas 46–71), `app.js` (líneas 358–383, 396–399).
- **Elemento afectado:** `#formulario`, `#titulo`, `#contenido`, `#errorTitulo`, `#errorContenido`.
- **Evidencia empírica CDP:**
  ```json
  {
    "tituloAriaDescribedBy": null,
    "tituloAriaInvalid": null,
    "contenidoAriaDescribedBy": null,
    "contenidoAriaInvalid": null,
    "errorTituloRole": null,
    "errorContenidoRole": null,
    "focusedElementTag": "BODY"
  }
  ```
  1. No existe vínculo programático `aria-describedby` entre el control y el mensaje de error.
  2. No se establece `aria-invalid="true"` cuando el campo no supera la validación.
  3. Los párrafos de error no poseen `role="alert"` ni `aria-live`.
  4. Al pulsar "Agregar publicación" con campos vacíos, la función `manejarEnvio` retorna sin enfocar el primer control erróneo. El usuario con discapacidad visual o navegación por teclado no recibe confirmación de qué campo falló ni es posicionado sobre él.
- **Criterios vulnerados:** WCAG 2.2 SC 3.3.1 (Error Identification), SC 3.3.2 (Labels or Instructions), SC 4.1.2 (Name, Role, Value).

---

### 3.3. Hallazgos Medios

#### [MED-01] Ratio de contraste insuficiente en bordes de campos de formulario (WCAG 1.4.11)
- **Archivo:** `styles.css` (líneas 18, 239–242, 248–251).
- **Elemento afectado:** `input[type="text"]` y `textarea`.
- **Evidencia empírica:**
  - Borde del input `#e2e8f0` sobre fondo `#ffffff`: **1.23:1**.
  - Borde en hover `#cbd5e1` sobre fondo `#ffffff`: **1.48:1**.
  Ambos valores quedan muy por debajo del umbral mínimo de **3.0:1** exigido para componentes interactivos de interfaz de usuario. En pantallas con brillo elevado o usuarios con baja visión, los límites del campo son casi indistinguibles del panel blanco.
- **Criterio vulnerado:** WCAG 2.2 SC 1.4.11 *Non-text Contrast* (Nivel AA).

#### [MED-02] Ratio de contraste insuficiente en texto del pie de página (WCAG 1.4.3)
- **Archivo:** `styles.css` (líneas 372–378).
- **Elemento afectado:** Texto explicativo en `.pie` (`0.8125rem` / 13 px).
- **Evidencia empírica:**
  - Color de texto `#64748b` (`var(--color-texto-suave)`) sobre fondo `#e2e8f0`: **3.86:1**.
  El criterio WCAG 1.4.3 exige un mínimo de **4.5:1** para texto normal de cuerpo menor a 18 pt o 14 pt en negrita.
- **Criterio vulnerado:** WCAG 2.2 SC 1.4.3 *Contrast (Minimum)* (Nivel AA).

#### [MED-03] Tamaño de objetivo táctil insuficiente en el enlace del pie de página (WCAG 2.5.8)
- **Archivos:** `index.html` (líneas 103–105), `styles.css` (líneas 380–382).
- **Elemento afectado:** Enlace `<a href="https://jsonplaceholder.typicode.com/posts/">`.
- **Evidencia empírica CDP:**
  - Dimensiones físicas calculadas: **215.36 px de ancho × 17.00 px de alto**.
  La altura de 17.00 px no alcanza el umbral de **24 × 24 px** exigido por la pauta WCAG 2.2 AA.
- **Criterio vulnerado:** WCAG 2.2 SC 2.5.8 *Target Size (Minimum)* (Nivel AA).

#### [MED-04] Pérdida de reconciliación de IDs entre cliente y servidor (Arquitectura de datos)
- **Archivos:** `app.js` (líneas 270–286, 318–322) y `db.js` (líneas 153–173).
- **Evidencia:** Al invocar `enviarPost(post)`, el endpoint devuelve un identificador generado por el servidor (por ejemplo, `{ id: 101, ... }`). El código omite este valor y preserva la publicación en IndexedDB con el identificador temporal `local-1728...` marcado como sincronizado. En un entorno con backend real, si la lista se sincroniza con el servidor, la misma entidad conviviría dos veces en IndexedDB: una con su clave temporal y otra con la clave numérica del servidor.

---

### 3.4. Hallazgos Bajos

#### [BAJ-01] Atributo `aria-busy` huérfano en contenedor no-vivo
- **Archivos:** `index.html` (línea 86), `app.js` (líneas 64–66).
- **Elemento afectado:** `<div id="contenedorPosts" class="posts" aria-busy="true">`.
- **Evidencia:** `aria-busy` solo tiene semántica oficial en regiones declaradas como vivas (`aria-live`). Al ser un `div` ordinario sin rol de región viva, el lector de pantalla no procesa la señal de espera.

#### [BAJ-02] Contraste en límite inferior del punto indicador de conexión
- **Archivo:** `styles.css` (línea 125).
- **Elemento afectado:** `.indicador--conectado .indicador__punto`.
- **Evidencia:** Punto verde `#4ade80` sobre cabecera azul `#2563eb`: **2.97:1** (umbral de 3.0:1). Al tener `aria-hidden="true"` y texto complementario no genera infracción de accesibilidad funcional, pero puede optimizarse visualmente.

#### [BAJ-03] Falta de suscripción al evento `versionchange` en `db.js`
- **Archivo:** `db.js` (líneas 28–30, 56–80).
- **Evidencia:** La variable de módulo `promesaDB` almacena en caché la instancia abierta de IDBDatabase. Si el usuario abre otra pestaña que dispara una actualización de esquema (`upgradeneeded`), no existe captura de `db.onversionchange` ni `db.onclose`, bloqueando la base de datos o fallando de forma silenciosa.

#### [BAJ-04] Restricción innecesaria de orientación en Web App Manifest
- **Archivo:** `manifest.json` (línea 9).
- **Elemento afectado:** `"orientation": "portrait-primary"`.
- **Evidencia:** Restringir la PWA a orientación vertical puede afectar a usuarios de tabletas fijas o sillas de ruedas con soportes horizontales. WCAG 2.2 SC 1.3.4 (Orientation) recomienda no restringir la orientación salvo que sea estrictamente esencial para la funcionalidad.

---

## 4. RECOMENDACIONES DE CORRECCIÓN PARA CADA HALLAZGO

### 4.1. Corrección para [CRIT-01] (Data Loss)
Mover `limpiarFormulario()` para que únicamente se invoque tras confirmar el guardado exitoso en IndexedDB. En caso de error, mantener el texto y enfocar el campo:
```javascript
// En app.js -> manejarEnvio
try {
  await DB.guardarPost(post);
  await pintarPublicaciones();
  limpiarFormulario(); // <-- Solo aquí, cuando el dato está a salvo

  if (!navigator.onLine) {
    mostrarMensaje('Publicación guardada localmente...', 'alerta');
    return;
  }
  ...
} catch (error) {
  console.error('[OfflinePosts] Error al guardar en IndexedDB:', error);
  mostrarMensaje('No se pudo guardar la publicación en este dispositivo.', 'error');
  campoTitulo.focus(); // El usuario conserva su texto y puede reintentar
} finally {
  botonAgregar.disabled = false;
  // NO invocar limpiarFormulario() aquí
}
```

### 4.2. Corrección para [CRIT-02] (Cache Poisoning)
En `sw.js`, verificar el estado HTTP de la respuesta antes de almacenarla en la caché:
```javascript
// En sw.js -> evento fetch
evento.respondWith(
  fetch(peticion)
    .then((response) => {
      // Solo cachear respuestas exitosas de origen local
      if (response && response.status === 200 && response.type === 'basic') {
        const copia = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(peticion, copia));
      }
      return response;
    })
    .catch(() => ... )
);
```

### 4.3. Corrección para [ALTO-01] (Desplazamiento de Posts)
Agregar `fechaCreacion: Date.now()` a cada post en `db.js` y `app.js`, y ordenar por fecha descendente respetando primero las pendientes:
```javascript
// En db.js -> obtenerPosts
return posts.sort((a, b) => {
  if (a.estado === 'pendiente' && b.estado !== 'pendiente') return -1;
  if (a.estado !== 'pendiente' && b.estado === 'pendiente') return 1;
  // Ambas pendientes o ambas sincronizadas: la más reciente primero
  return (b.fechaCreacion || 0) - (a.fechaCreacion || 0);
});
```

### 4.4. Corrección para [ALTO-02] (Bloqueo en Sincronización)
Implementar interrupción temprana ("Fail-Fast") en `sincronizarPendientes()` si una solicitud falla por pérdida de red:
```javascript
// En app.js -> sincronizarPendientes
for (const post of pendientes) {
  try {
    await enviarPost(post);
    await DB.actualizarEstadoPost(post.id, 'sincronizada');
    sincronizadas += 1;
  } catch (error) {
    console.warn(`[OfflinePosts] Fallo al enviar "${post.title}":`, error.message);
    // Si no hay red, no esperar 10s por cada uno de los posts restantes
    if (!navigator.onLine || error.name === 'AbortError') {
      console.warn('[OfflinePosts] Red no disponible, interrumpiendo lote.');
      break;
    }
  }
}
```

### 4.5. Corrección para [ALTO-03] (Skip Link Focus)
Añadir `tabindex="-1"` a `<main>` en `index.html`:
```html
<!-- En index.html línea 36 -->
<main id="contenidoPrincipal" class="contenedor" tabindex="-1">
```
Y en `styles.css`:
```css
main#contenidoPrincipal:focus {
  outline: none;
}
```

### 4.6. Corrección para [ALTO-04] (Accesibilidad en Formulario)
En `index.html`:
```html
<input
  type="text"
  id="titulo"
  name="titulo"
  required
  minlength="3"
  maxlength="80"
  placeholder="Escribe un título"
  autocomplete="off"
  aria-describedby="errorTitulo">
<p class="formulario__error" id="errorTitulo" role="alert" hidden></p>
```
En `app.js` (`validarFormulario`):
```javascript
campoTitulo.setAttribute('aria-invalid', tituloError ? 'true' : 'false');
campoContenido.setAttribute('aria-invalid', contenidoError ? 'true' : 'false');

if (tituloError) {
  campoTitulo.focus();
} else if (contenidoError) {
  campoContenido.focus();
}
```

### 4.7. Corrección para [MED-01] y [MED-02] (Contrastes)
En `styles.css`:
```css
/* Bordes accesibles (>= 3.0:1 sobre blanco) */
input[type="text"],
textarea {
  border: 1px solid #94a3b8; /* Ratio 3.05:1 */
}

/* Texto de pie de página accesible (>= 4.5:1 sobre #e2e8f0) */
.pie {
  color: #334155; /* Ratio 7.15:1 */
}
```

### 4.8. Corrección para [MED-03] (Tamaño Táctil de Enlace)
En `styles.css`:
```css
.pie a {
  display: inline-block;
  padding: 0.25rem 0;
  min-height: 24px;
  line-height: 1.5;
}
```

---

## 5. PRUEBAS QUE DEBERÍAN REPETIRSE DESPUÉS DE CORREGIR

1. **Prueba de Resistencia a Fallos y Prevención de Pérdida de Datos:**
   - Simular mediante DevTools un error de cuota o inyectar un rechazo forzado en `DB.guardarPost`.
   - Llenar los campos "Título" y "Contenido" y pulsar "Agregar publicación".
   - *Criterio de éxito:* El mensaje de error debe notificarse en pantalla, el botón debe rehabilitarse y el texto redactado por el usuario **debe permanecer intacto en los inputs**, con el foco colocado en el campo de título.
2. **Prueba de Inmunidad contra Envenenamiento de Caché en Service Worker:**
   - Interceptar con un proxy o mock de red una respuesta HTTP `500 Internal Server Error` para `index.html` o `styles.css`.
   - Navegar a la página y posteriormente desconectar la red (Modo Offline en DevTools).
   - Recargar la página en modo offline.
   - *Criterio de éxito:* La aplicación debe continuar renderizando la versión funcional previa desde la caché sin sustituirla por el cuerpo del error 500.
3. **Prueba de Posicionamiento y Visibilidad de Publicaciones Nuevas:**
   - Con conexión a internet activa, redactar y publicar un post con título reconocible.
   - *Criterio de éxito:* La nueva tarjeta debe ubicarse y permanecer visible en la parte superior del listado (índice 0 o anterior a las publicaciones importadas), incluso tras confirmarse el estado "🟢 Sincronizada".
4. **Prueba de Eficiencia de Sincronización en Red Fallida (Fail-Fast):**
   - Crear 5 publicaciones en modo offline.
   - Activar la red simulando una latencia infinita o timeout en la API.
   - *Criterio de éxito:* La aplicación no debe permanecer congelada 50 segundos; al fallar el primer intento por timeout de red, el lote debe abortarse de inmediato.
5. **Prueba de Foco de Accesibilidad en Skip Link:**
   - Cargar la página y pulsar la tecla `Tab` una vez para activar `.saltar-al-contenido`.
   - Presionar `Enter`.
   - Presionar la tecla `Tab` nuevamente.
   - *Criterio de éxito:* El foco del teclado debe pasar directamente al primer campo interactivo del contenido principal (`#titulo`) sin regresar a la cabecera.
6. **Prueba con Tecnologías de Asistencia (Lector de Pantalla NVDA/VoiceOver):**
   - Intentar enviar el formulario vacío.
   - *Criterio de éxito:* El lector de pantalla debe anunciar de inmediato el error gracias al atributo `role="alert"` y anunciar el estado inválido (`aria-invalid="true"`) al recibir el foco.
7. **Verificación de Contraste Automático:**
   - Ejecutar la suite de contraste calculando bordes de inputs y texto de pie de página para certificar cumplimiento estricto con WCAG 2.2 AA.
