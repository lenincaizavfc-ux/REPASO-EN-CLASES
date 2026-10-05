/* ============================================================
   sw.js - Service Worker
   ------------------------------------------------------------
   Su único trabajo es que la APLICACIÓN (archivos estáticos)
   siga disponible sin conexión usando la Cache API.

   IMPORTANTE: aquí NO se cachea la API de JSONPlaceholder.
   Los datos de las publicaciones se guardan en IndexedDB
   (ver db.js). El Service Worker no intercepta peticiones
   externas: simplemente las deja pasar.
   ============================================================ */

/* Sube el número (v2, v3...) cada vez que cambien los archivos de la app:
   el Service Worker borra automáticamente la caché anterior. */
const CACHE_NAME = 'offline-posts-v3';

/* Archivos que guarda en la caché al instalarse.
   OJO: sw.js está en la raíz de la app a propósito. Un Service Worker solo
   controla, como máximo, la carpeta donde está su archivo; para poder
   controlar una carpeta superior (por ejemplo, servirlo dentro de una
   subcarpeta de GitHub Pages) hace falta la cabecera "Service-Worker-Allowed",
   y GitHub Pages no deja enviarla. Por eso no se puede mover a js/. */
const ARCHIVOS_ESTATICOS = [
  './',
  'index.html',
  'css/styles.css',
  'js/app.js',
  'js/db.js',
  'manifest.json',
  'icons/icon.svg',
  'icons/icon-192.png',
  'icons/icon-512.png'
];

/* ---------- EVENTO install ---------- */
self.addEventListener('install', (evento) => {
  console.info('[SW] Instalando Service Worker y creando la caché...');

  evento.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(ARCHIVOS_ESTATICOS))
      .then(() => self.skipWaiting()) // se activa sin esperar a cerrar las pestañas
  );
});

/* ---------- EVENTO activate ---------- */
self.addEventListener('activate', (evento) => {
  console.info('[SW] Service Worker activado.');

  evento.waitUntil(
    caches
      .keys()
      .then((nombres) =>
        // Borramos cachés de versiones anteriores
        Promise.all(
          nombres
            .filter((nombre) => nombre !== CACHE_NAME)
            .map((nombre) => caches.delete(nombre))
        )
      )
      .then(() => self.clients.claim()) // toma el control de las pestañas abiertas
  );
});

/* ---------- EVENTO fetch ---------- */
self.addEventListener('fetch', (evento) => {
  const peticion = evento.request;

  // Solo nos interesan los archivos de nuestra propia aplicación
  const esDelSitio = new URL(peticion.url).origin === self.location.origin;

  if (peticion.method !== 'GET' || !esDelSitio) {
    return; // por ejemplo, la API: que vaya directo a la red
  }

  // Estrategia "network first" con respaldo en la caché:
  // si hay red usamos la versión fresca; si no, la guardada.
  evento.respondWith(
    fetch(peticion)
      .then((response) => {
        // IMPORTANTE: solo guardamos en la caché respuestas exitosas.
        // Si el servidor devuelve 404, 500 o 502, esa respuesta NO debe
        // guardarse, porque al quedar offline el navegador serviría
        // siempre el error y la aplicación quedaría inutilizable.
        if (response && response.ok && response.type === 'basic') {
          const copia = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(peticion, copia));
        }

        return response;
      })
      .catch(() =>
        caches.match(peticion).then((respuesta) => {
          if (respuesta) {
            return respuesta;
          }
          // Si no hay nada en caché y es la página principal, devolvemos index.html
          if (peticion.mode === 'navigate') {
            return caches.match('index.html');
          }
          return Response.error();
        })
      )
  );
});