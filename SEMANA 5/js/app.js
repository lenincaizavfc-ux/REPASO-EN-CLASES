/* ============================================================
   app.js - Lógica de la aplicación
   ------------------------------------------------------------
   Flujo principal:
     Fetch API (GET)  -> guardar en IndexedDB -> pintar en el DOM
     Sin conexión      -> leer de IndexedDB
     Evento "online"   -> sincronizarPendientes() -> Fetch API (POST)
   ============================================================ */

const API_URL = 'https://jsonplaceholder.typicode.com/posts/';

/* ---------- Referencias al DOM ---------- */
const formulario = document.querySelector('#formulario');
const campoTitulo = document.querySelector('#titulo');
const campoContenido = document.querySelector('#contenido');
const errorTitulo = document.querySelector('#errorTitulo');
const errorContenido = document.querySelector('#errorContenido');
const botonAgregar = document.querySelector('#botonAgregar');
const botonRecargar = document.querySelector('#botonRecargar');
const contenedorPosts = document.querySelector('#contenedorPosts');
const avisoCarga = document.querySelector('#avisoCarga');
const indicadorConexion = document.querySelector('#indicadorConexion');
const mensaje = document.querySelector('#mensaje');
const contador = document.querySelector('#contador');

/* Evita sincronizaciones simultáneas si llegan varios eventos online */
let sincronizando = false;

/* Si una petición no responde en este tiempo, la cancelamos (AbortController) */
const TIEMPO_LIMITE_MS = 10000;


/* ============================================================
   1. UTILIDADES DE LA INTERFAZ
   ============================================================ */

/**
 * fetch() con límite de tiempo.
 * Si la petición se queda colgada (red lenta o bloqueada),
 * se cancela para que la interfaz nunca se quede congelada.
 */
const fetchConTimeout = async (url, opciones = {}) => {
  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), TIEMPO_LIMITE_MS);

  try {
    return await fetch(url, { ...opciones, signal: controlador.signal });
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('La solicitud tardó demasiado y se canceló.');
    }
    throw error;
  } finally {
    clearTimeout(temporizador);
  }
};

/** Muestra un mensaje en la región aria-live. */
const mostrarMensaje = (texto, tipo = 'info') => {
  mensaje.textContent = texto;
  mensaje.className = `mensaje mensaje--${tipo}`;
};

const setCargando = (cargando) => {
  contenedorPosts.setAttribute('aria-busy', cargando ? 'true' : 'false');

  // aria-busy solo se anuncia si el contenedor es una región viva,
  // así que usamos una región live aparte para el texto de carga.
  avisoCarga.textContent = cargando ? 'Cargando publicaciones...' : '';
};

/** Genera un id único para las publicaciones creadas en este dispositivo. */
const generarIdLocal = () =>
  `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

/**
 * Red de seguridad: si algún código falla, el usuario lo ve en pantalla
 * en lugar de tener una página que "no hace nada".
 */
window.addEventListener('error', (evento) => {
  console.error('[OfflinePosts] Error no controlado:', evento.error || evento.message);
  mostrarMensaje(
    'Ocurrió un error inesperado. Abre la consola (F12) para ver el detalle.',
    'error'
  );
});

window.addEventListener('unhandledrejection', (evento) => {
  console.error('[OfflinePosts] Promesa rechazada sin manejar:', evento.reason);
  mostrarMensaje('Ocurrió un error inesperado al procesar los datos.', 'error');
});


/* ============================================================
   2. ESTADO DE CONEXIÓN
   ============================================================ */

/** Pinta el indicador 🟢 / 🔴 según navigator.onLine. */
const actualizarEstadoConexion = () => {
  const conectado = navigator.onLine;

  indicadorConexion.className = conectado
    ? 'indicador indicador--conectado'
    : 'indicador indicador--sin-conexion';

  indicadorConexion.querySelector('.indicador__texto').textContent = conectado
    ? 'Conectado'
    : 'Sin conexión';

  // El color por sí solo no es información: el texto también cambia
  indicadorConexion.querySelector('.indicador__punto').textContent = conectado ? '🟢' : '🔴';
};

/** Escucha los eventos online / offline del navegador. */
const escucharCambiosDeConexion = () => {
  window.addEventListener('offline', () => {
    actualizarEstadoConexion();
    mostrarMensaje('Sin conexión. Trabajando con datos locales.', 'alerta');
  });

  window.addEventListener('online', async () => {
    actualizarEstadoConexion();
    mostrarMensaje('Conexión recuperada. Sincronizando publicaciones pendientes...', 'info');
    await sincronizarPendientes();
  });
};


/* ============================================================
   3. FETCH API - OBTENER PUBLICACIONES
   ============================================================ */

/**
 * Descarga las publicaciones con fetch() y las guarda en IndexedDB.
 * Si algo falla (sin red, error HTTP, etc.) NO rompe la app:
 * cae en mostrarDatosLocales().
 */
const cargarPublicaciones = async () => {
  setCargando(true);

  try {
    const response = await fetchConTimeout(API_URL);

    // response.ok es false si el servidor responde 404, 500, etc.
    if (!response.ok) {
      throw new Error(`La API respondió con estado HTTP ${response.status}`);
    }

    const posts = await response.json();

    await DB.guardarPosts(posts);

    setCargando(false);
    await pintarPublicaciones();
    mostrarMensaje('Publicaciones actualizadas desde la API.', 'exito');
  } catch (error) {
    console.warn('[OfflinePosts] No se pudo obtener datos de la API:', error.message);

    setCargando(false);
    await mostrarDatosLocales();
  }
};

/** Muestra lo que hay guardado en IndexedDB. */
const mostrarDatosLocales = async () => {
  setCargando(false);

  try {
    const posts = await DB.obtenerPosts();
    await pintarPublicaciones(posts);

    if (posts.length === 0) {
      mostrarMensaje(
        'Sin conexión y sin datos guardados todavía. Conéctate una vez para descargarlos.',
        'alerta'
      );
    } else if (!navigator.onLine) {
      mostrarMensaje(
        'Sin conexión. Trabajando con datos locales de IndexedDB.',
        'alerta'
      );
    } else {
      mostrarMensaje(
        'No se pudo contactar con la API. Mostrando publicaciones guardadas en IndexedDB.',
        'alerta'
      );
    }
  } catch (error) {
    console.error('[OfflinePosts] Error al leer IndexedDB:', error);
    mostrarMensaje('No se pudieron leer los datos locales.', 'error');
  }
};


/* ============================================================
   4. PINTA LAS PUBLICACIONES EN EL DOM
   ============================================================ */

/**
 * Dibuja las tarjetas. Si no se le pasan posts, los lee de IndexedDB.
 * Usa textContent (no innerHTML) para no interpretar el texto del usuario.
 */
const pintarPublicaciones = async (posts) => {
  try {
    const lista = posts ?? (await DB.obtenerPosts());

    contenedorPosts.innerHTML = '';
    setCargando(false);

    if (lista.length === 0) {
      const vacio = document.createElement('p');
      vacio.className = 'posts__vacio';
      vacio.textContent = 'No hay publicaciones para mostrar.';
      contenedorPosts.appendChild(vacio);
      contador.textContent = '0 publicaciones';
      return;
    }

    const pendientes = lista.filter((post) => post.estado === 'pendiente').length;
    contador.textContent =
      `${lista.length} publicaciones · ${pendientes} pendiente(s) de sincronización`;

    const fragmento = document.createDocumentFragment();

    lista.forEach((post) => {
      const esPendiente = post.estado === 'pendiente';

      const tarjeta = document.createElement('article');
      tarjeta.className = esPendiente ? 'tarjeta tarjeta--pendiente' : 'tarjeta';

      const titulo = document.createElement('h3');
      titulo.className = 'tarjeta__titulo';
      titulo.textContent = post.title;

      const cuerpo = document.createElement('p');
      cuerpo.className = 'tarjeta__cuerpo';
      cuerpo.textContent = post.body;

      const pie = document.createElement('div');
      pie.className = 'tarjeta__pie';

      const etiqueta = document.createElement('span');
      etiqueta.className = esPendiente ? 'etiqueta etiqueta--pendiente' : 'etiqueta';
      etiqueta.textContent = esPendiente
        ? '🟠 Pendiente de sincronización'
        : '🟢 Sincronizada';

      const origen = document.createElement('span');
      origen.textContent = post.local ? 'Creada en este dispositivo' : 'Desde la API';

      pie.appendChild(etiqueta);
      pie.appendChild(origen);

      tarjeta.appendChild(titulo);
      tarjeta.appendChild(cuerpo);
      tarjeta.appendChild(pie);

      fragmento.appendChild(tarjeta);
    });

    contenedorPosts.appendChild(fragmento);
  } catch (error) {
    console.error('[OfflinePosts] Error al pintar las publicaciones:', error);
    mostrarMensaje('Ocurrió un error al mostrar las publicaciones.', 'error');
  }
};


/* ============================================================
   5. FETCH API - CREAR UNA PUBLICACIÓN
   ============================================================ */

/** Envía una publicación con POST a JSONPlaceholder. */
const enviarPost = async (post) => {
  const response = await fetchConTimeout(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: post.title,
      body: post.body,
      userId: post.userId
    })
  });

  if (!response.ok) {
    throw new Error(`El POST falló con estado HTTP ${response.status}`);
  }

  return response.json();
};

/* ============================================================
   6. SINCRONIZACIÓN DE PENDIENTES
   ============================================================ */

/**
 * sincronizarPendientes():
 *   1. Lee de IndexedDB las publicaciones con estado "pendiente".
 *   2. Intenta enviar cada una con POST a la API.
 *   3. Si el POST responde bien -> estado "sincronizada".
 *      Si falla -> se queda "pendiente" para el próximo intento.
 *   4. Actualiza la interfaz.
 */
const sincronizarPendientes = async () => {
  if (sincronizando) {
    return 0;
  }

  sincronizando = true;

  try {
    const pendientes = await DB.obtenerPostsPendientes();

    if (pendientes.length === 0) {
      // No hay nada que hacer: evitamos sincronizaciones innecesarias
      return 0;
    }

    let sincronizadas = 0;

    for (const post of pendientes) {
      try {
        const respuesta = await enviarPost(post);
        await DB.actualizarEstadoPost(post.id, 'sincronizada', respuesta?.id);
        sincronizadas += 1;
      } catch (error) {
        // La publicación sigue pendiente: se reintentará más adelante
        console.warn(`[OfflinePosts] No se pudo sincronizar "${post.title}":`, error.message);

        // Fail-fast: si la red se cayó, no tiene sentido esperar el timeout
        // (10 s) de cada publicación restante. Se corta el lote y todas
        // quedan pendientes para el próximo intento.
        if (!navigator.onLine || error.name === 'AbortError' || /tardó demasiado/i.test(error.message)) {
          console.warn('[OfflinePosts] Red no disponible: se interrumpe el lote.');
          break;
        }
      }
    }

    await pintarPublicaciones();

    if (sincronizadas > 0) {
      mostrarMensaje(
        `Sincronización completada: ${sincronizadas} publicación(es) enviada(s) a la API.`,
        'exito'
      );
    } else {
      mostrarMensaje(
        'No se pudieron sincronizar las publicaciones pendientes. Se reintentará más tarde.',
        'alerta'
      );
    }

    return sincronizadas;
  } catch (error) {
    console.error('[OfflinePosts] Error durante la sincronización:', error);
    mostrarMensaje('Error durante la sincronización.', 'error');
    return 0;
  } finally {
    sincronizando = false;
  }
};


/* ============================================================
   7. FORMULARIO
   ============================================================ */

/**
 * Muestra los errores de validación y deja el formulario preparado:
 * marca aria-invalid, enlaza los mensajes con aria-describedby y
 * lleva el foco al primer campo con error.
 */
const validarFormulario = () => {
  const titulo = campoTitulo.value.trim();
  const contenido = campoContenido.value.trim();

  let tituloError = '';
  let contenidoError = '';

  if (titulo.length === 0) {
    tituloError = 'El título es obligatorio.';
  } else if (titulo.length < 3) {
    tituloError = 'El título debe tener al menos 3 caracteres.';
  }

  if (contenido.length === 0) {
    contenidoError = 'El contenido es obligatorio.';
  } else if (contenido.length < 5) {
    contenidoError = 'El contenido debe tener al menos 5 caracteres.';
  }

  errorTitulo.textContent = tituloError;
  errorTitulo.hidden = tituloError === '';
  errorContenido.textContent = contenidoError;
  errorContenido.hidden = contenidoError === '';

  // aria-invalid + aria-describedby para que el lector de pantalla
  // anuncie el error al recibir el foco en el campo.
  campoTitulo.setAttribute('aria-invalid', tituloError ? 'true' : 'false');
  campoContenido.setAttribute('aria-invalid', contenidoError ? 'true' : 'false');

  if (tituloError) {
    campoTitulo.focus();
  } else if (contenidoError) {
    campoContenido.focus();
  }

  return tituloError === '' && contenidoError === '';
};

/** Limpia el formulario y los mensajes de error. */
const limpiarFormulario = () => {
  formulario.reset();
  errorTitulo.hidden = true;
  errorContenido.hidden = true;
  campoTitulo.focus();
};

const manejarEnvio = async (evento) => {
  evento.preventDefault();

  if (!validarFormulario()) {
    mostrarMensaje('Revisa los campos del formulario.', 'error');
    return;
  }

  // 1. Creamos el objeto publicación y lo guardamos YA en IndexedDB.
  //    local: true  -> la escribió el usuario en este dispositivo.
  //    estado: "pendiente" -> todavía no está en el servidor.
  const post = {
    id: generarIdLocal(),
    userId: 1,
    title: campoTitulo.value.trim(),
    body: campoContenido.value.trim(),
    estado: 'pendiente',
    local: true,
    fechaCreacion: Date.now()
  };

  botonAgregar.disabled = true;

  try {
    await DB.guardarPost(post);
  } catch (error) {
    // Si no se pudo guardar, el texto del usuario NO se borra:
    // se conserva para que pueda corregirlo o volver a intentarlo.
    console.error('[OfflinePosts] Error al guardar en IndexedDB:', error);
    mostrarMensaje('No se pudo guardar la publicación en este dispositivo.', 'error');
    botonAgregar.disabled = false;
    campoTitulo.focus();
    return;
  }

  // A partir de aquí la publicación ya está a salvo en IndexedDB,
  // así que sí podemos vaciar el formulario.
  await pintarPublicaciones();
  limpiarFormulario();

  if (!navigator.onLine) {
    mostrarMensaje(
      'Publicación guardada localmente. Se sincronizará cuando vuelva la conexión.',
      'alerta'
    );
    botonAgregar.disabled = false;
    return;
  }

  // 2. Hay conexión: intentamos enviarla de una vez.
  mostrarMensaje('Publicación guardada. Enviando a la API...', 'info');

  try {
    const respuesta = await enviarPost(post);
    await DB.actualizarEstadoPost(post.id, 'sincronizada', respuesta?.id);
    await pintarPublicaciones();
    mostrarMensaje('Publicación creada y sincronizada correctamente.', 'exito');
  } catch (error) {
    console.warn('[OfflinePosts] POST fallido, queda pendiente:', error.message);
    mostrarMensaje(
      'No se pudo enviar a la API. La publicación quedó pendiente de sincronización.',
      'alerta'
    );
  } finally {
    botonAgregar.disabled = false;
  }
};


/* ============================================================
   8. SERVICE WORKER
   ============================================================ */

/**
 * Registra el Service Worker que permite abrir la app sin conexión.
 * Se llama al PRINCIPIO de iniciar() y sin await: el registro puede
 * tardar (descarga los archivos de la caché) y no debe bloquear ni la
 * interfaz ni la carga de datos.
 */
const registrarServiceWorker = () => {
  if (!('serviceWorker' in navigator)) {
    console.info('[OfflinePosts] Este navegador no soporta Service Workers.');
    return;
  }

  if (location.protocol === 'file:') {
    console.warn(
      '[OfflinePosts] Estás abriendo el archivo directamente (file://). ' +
      'Para el modo offline y la instalación debes servir la carpeta con un ' +
      'servidor local (por ejemplo: npx serve . y abre http://localhost:3000).'
    );
    return;
  }

  // No usamos await a propósito: que el registro nunca bloquee la interfaz.
  // sw.js está en la raíz de la app, así que su scope es la carpeta entera.
  navigator.serviceWorker.register('sw.js')
    .then((registro) => console.info('[OfflinePosts] Service Worker registrado en', registro.scope))
    .catch((error) => {
      // Si el registro falla la app sigue funcionando, solo sin modo offline
      console.error('[OfflinePosts] Error al registrar el Service Worker:', error);
    });
};


/* ============================================================
   9. INICIO DE LA APLICACIÓN
   ============================================================ */

const iniciar = async () => {
  // 1. El Service Worker se registra primero, pero sin await:
  //    su registro no debe bloquear ni la interfaz ni la carga de datos.
  registrarServiceWorker();

  // 2. Interfaz.
  actualizarEstadoConexion();
  escucharCambiosDeConexion();

  formulario.addEventListener('submit', manejarEnvio);
  botonRecargar.addEventListener('click', async () => {
    if (!navigator.onLine) {
      mostrarMensaje('Sin conexión: no se puede actualizar desde la API.', 'alerta');
      return;
    }
    await cargarPublicaciones();
  });

  // 3. Datos.
  try {
    if (navigator.onLine) {
      await cargarPublicaciones();       // GET a la API
      await sincronizarPendientes();     // envía lo que quedó pendiente
    } else {
      mostrarMensaje('Sin conexión. Trabajando con datos locales.', 'alerta');
      await mostrarDatosLocales();       // todo se lee de IndexedDB
    }
  } catch (error) {
    console.error('[OfflinePosts] Error al iniciar la aplicación:', error);
    mostrarMensaje('Ocurrió un error al iniciar la aplicación.', 'error');
  }
};

// Esperamos a que el DOM esté listo para poder usar querySelector
document.addEventListener('DOMContentLoaded', iniciar);