/* ============================================================
   db.js - Capa de datos con IndexedDB
   ------------------------------------------------------------
   IndexedDB es la base de datos local del navegador y es el
   almacenamiento PRINCIPAL de esta aplicación: guarda las
   publicaciones para que puedan verse sin conexión.

   Base de datos : OfflinePostsDB
   Object store  : posts   (keyPath: "id")

   Cada publicación tiene esta forma:
   {
     id,        // id de la API o id local generado (local-...)
     userId,
     title,
     body,
     estado,    // "sincronizada" | "pendiente"
     local      // true si la creó el usuario en este dispositivo
   }
   ============================================================ */

const DB = (() => {

  const DB_NAME = 'OfflinePostsDB';
  const DB_VERSION = 1;
  const STORE_POSTS = 'posts';

  /* Guardamos la conexión abierta para no abrirla en cada operación */
  let promesaDB = null;

  /**
   * Convierte un IDBRequest (que usa eventos) en una Promise.
   * Así podemos usar await, que es mucho más fácil de leer.
   */
  const peticiónComoPromesa = (peticion) =>
    new Promise((resolve, reject) => {
      peticion.onsuccess = () => resolve(peticion.result);
      peticion.onerror = () => reject(peticion.error);
    });

  /**
   * Espera a que la transacción termine de escribirse de verdad.
   * oncomplete = todo ok, onerror / onabort = falló.
   */
  const transaccionTerminada = (transaccion) =>
    new Promise((resolve, reject) => {
      transaccion.oncomplete = () => resolve();
      transaccion.onerror = () => reject(transaccion.error);
      transaccion.onabort = () => reject(transaccion.error);
    });

  /**
   * abrirBaseDatos(): abre (o crea) la base de datos OfflinePostsDB.
   * Si la base ya existe y la versión no cambió, la reutiliza.
   */
  function abrirBaseDatos() {
    if (promesaDB) {
      return promesaDB;
    }

    promesaDB = new Promise((resolve, reject) => {
      // onupgradeneeded solo se ejecuta la primera vez (o al cambiar DB_VERSION)
      const peticion = indexedDB.open(DB_NAME, DB_VERSION);

      peticion.onupgradeneeded = () => {
        const db = peticion.result;

        if (!db.objectStoreNames.contains(STORE_POSTS)) {
          db.createObjectStore(STORE_POSTS, { keyPath: 'id' });
        }
      };

      peticion.onsuccess = () => {
        const db = peticion.result;

        // Si otra pestaña intenta actualizar el esquema, cerramos para no bloquearla
        db.onversionchange = () => {
          db.close();
          promesaDB = null;
        };

        // El navegador cerró la base de datos: la próxima operación la reabre
        db.onclose = () => {
          promesaDB = null;
        };

        resolve(db);
      };

      peticion.onerror = () => reject(peticion.error);
      peticion.onblocked = () =>
        reject(new Error('La base de datos está bloqueada por otra pestaña abierta.'));
    });

    return promesaDB;
  }

  /**
   * guardarPosts(posts): guarda un arreglo de publicaciones de la API.
   * Usa put(), que sobrescribe si el id ya existe (así no se duplican).
   */
  async function guardarPosts(posts) {
    const db = await abrirBaseDatos();
    const transaccion = db.transaction(STORE_POSTS, 'readwrite');
    const almacen = transaccion.objectStore(STORE_POSTS);

    posts.forEach((post) => {
      almacen.put({
        id: post.id,
        userId: post.userId ?? 1,
        title: post.title,
        body: post.body,
        estado: 'sincronizada', // vienen del servidor: ya están sincronizadas
        local: false,
        // Las publicaciones de la API no tienen fecha local: 0 para que
        // las que crea el usuario (con fecha real) aparezcan primero.
        fechaCreacion: 0
      });
    });

    await transaccionTerminada(transaccion);
    return posts.length;
  }

  /**
   * obtenerPosts(): devuelve todas las publicaciones guardadas.
   * Si no hay ninguna todavía, devuelve un arreglo vacío.
   * Orden: primero las pendientes y, dentro de cada grupo, la más reciente.
   */
  async function obtenerPosts() {
    const db = await abrirBaseDatos();
    const transaccion = db.transaction(STORE_POSTS, 'readonly');
    const almacen = transaccion.objectStore(STORE_POSTS);

    const posts = await peticiónComoPromesa(almacen.getAll());

    return posts.sort((a, b) => {
      // Las pendientes siempre primero, para que el usuario las vea de inmediato
      if (a.estado === 'pendiente' && b.estado !== 'pendiente') return -1;
      if (a.estado !== 'pendiente' && b.estado === 'pendiente') return 1;
      // Dentro del mismo grupo: la más reciente primero.
      // Así una publicación recién creada no "desaparece" al final del listado.
      return (b.fechaCreacion || 0) - (a.fechaCreacion || 0);
    });
  }

  /**
   * guardarPost(post): guarda UNA publicación (normalmente creada por el usuario).
   */
  async function guardarPost(post) {
    const db = await abrirBaseDatos();
    const transaccion = db.transaction(STORE_POSTS, 'readwrite');
    const almacen = transaccion.objectStore(STORE_POSTS);

    almacen.put(post);

    await transaccionTerminada(transaccion);
    return post;
  }

  /**
   * obtenerPostsPendientes(): devuelve solo las que están en estado "pendiente".
   * Se usa en sincronizarPendientes().
   */
  async function obtenerPostsPendientes() {
    const db = await abrirBaseDatos();
    const transaccion = db.transaction(STORE_POSTS, 'readonly');
    const almacen = transaccion.objectStore(STORE_POSTS);

    const posts = await peticiónComoPromesa(almacen.getAll());

    return posts.filter((post) => post.estado === 'pendiente');
  }

  /**
   * actualizarEstadoPost(id, estado, idRemoto): cambia el estado de una
   * publicación. Por ejemplo: de "pendiente" a "sincronizada" tras un POST
   * correcto. Si la API devuelve un id (idRemoto), también se guarda para
   * poder relacionar la publicación local con la del servidor.
   */
  async function actualizarEstadoPost(id, estado, idRemoto = null) {
    const db = await abrirBaseDatos();
    const transaccion = db.transaction(STORE_POSTS, 'readwrite');
    const almacen = transaccion.objectStore(STORE_POSTS);

    const post = await peticiónComoPromesa(almacen.get(id));

    if (!post) {
      transaccion.abort();
      throw new Error(`No existe la publicación con id "${id}" en IndexedDB.`);
    }

    post.estado = estado;

    if (idRemoto !== null && idRemoto !== undefined) {
      post.idRemoto = idRemoto;
    }

    almacen.put(post);

    await transaccionTerminada(transaccion);
    return post;
  }

  /**
   * borrarTodosLosPosts(): vacía el store (solo para pruebas en clase).
   */
  async function borrarTodosLosPosts() {
    const db = await abrirBaseDatos();
    const transaccion = db.transaction(STORE_POSTS, 'readwrite');
    const almacen = transaccion.objectStore(STORE_POSTS);

    almacen.clear();

    await transaccionTerminada(transaccion);
  }

  return {
    abrirBaseDatos,
    guardarPosts,
    obtenerPosts,
    guardarPost,
    obtenerPostsPendientes,
    actualizarEstadoPost,
    borrarTodosLosPosts
  };
})();