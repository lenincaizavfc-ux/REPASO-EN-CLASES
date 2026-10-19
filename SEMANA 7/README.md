# Rastreo GPS en tiempo real · Google Maps + Firebase

Aplicación web que realiza **seguimiento GPS continuo** con `navigator.geolocation.watchPosition()`,
dibuja la posición en **Google Maps** y guarda cada actualización en **Firebase Realtime Database**
bajo `/ubicaciones/{userId}`, con **Firebase Authentication** y reglas de seguridad por usuario.

> El seguimiento **solo comienza cuando el usuario lo activa** y concede permiso al navegador,
> y se detiene cuando lo solicita. Mientras está activo, la ubicación se transmite a Firebase bajo
> la propia cuenta del usuario. No hay rastreo oculto ni intentos de eludir permisos.

---

## 1. Estructura del proyecto

```
Semana 7/
├── index.html              # Interfaz (mapa, panel de control, diálogo de login)
├── vite.config.js          # Configuración de Vite
├── firebase.json           # Hosting + reglas de Realtime Database
├── .firebaserc             # Proyecto Firebase por defecto
├── database.rules.json     # Reglas de seguridad de Realtime Database
├── .env.example            # Plantilla de variables de entorno
├── package.json
└── src/
    ├── main.js             # Orquestación general y UI
    ├── firebase.js         # Init de Firebase, Auth y Realtime Database
    ├── maps.js             # Carga de Google Maps y control del marcador/ruta
    ├── tracker.js          # Wrapper de geolocalización (watchPosition)
    ├── config.js           # Lectura de variables de entorno
    └── style.css           # Estilos responsive
```

---

## 2. Requisitos

- Node.js 18+ (probado con Node 24) y npm.
- Un proyecto de Firebase (**BASEDATOS**).
- **Realtime Database** creada (no Cloud Firestore).
- **Authentication** habilitado.
- Una clave de **Google Maps JavaScript API**.

---

## 3. Configuración manual en Firebase Console

1. **Authentication → Sign-in method**: habilita
   - **Anónimo** (para "Entrar como invitado"), y
   - **Correo electrónico/contraseña** (para crear cuentas).
2. **Realtime Database → Crear base de datos**: elige una ubicación y modo bloqueado.
   Copia la URL, tendrá la forma `https://<proyecto>-default-rtdb.<region>.firebasedatabase.app`.
3. **Configuración del proyecto → Tus apps → App web (`</>`)**: registra una app y copia el objeto
   `firebaseConfig` (apiKey, authDomain, databaseURL, projectId, storageBucket, messagingSenderId, appId).
4. **Realtime Database → Reglas**: pega el contenido de `database.rules.json` (o despliéguelo con
   `firebase deploy --only database`). Esto impide lectura/escritura abierta: cada usuario
   autenticado solo puede operar en `/ubicaciones/<su-uid>`.

## 4. Configuración manual en Google Cloud

1. **APIs y servicios → Biblioteca**: habilita **Maps JavaScript API**.
2. **APIs y servicios → Credenciales → Crear clave de API**.
3. Restringe la clave (obligatorio, ya que una clave del navegador es visible):
   - **Restricciones de aplicación**: *Sitios web*, añade
     `http://127.0.0.1:5500/*`, `https://<tu-proyecto>.web.app/*`
     y tu dominio propio.
   - **Restricciones de API**: limita a *Maps JavaScript API*.
4. (Opcional) Si quieres marcadores vectoriales (`AdvancedMarkerElement`), crea un **Map ID**
   y colócalo en `VITE_GOOGLE_MAPS_MAP_ID`.

> No se incluyen claves privadas de cuentas de servicio en el frontend. Las claves del SDK web
> están diseñadas para ser públicas y se protegen con restricciones + reglas de seguridad.

---

## 5. Variables de entorno

Copia la plantilla y rellena los valores:

```powershell
Copy-Item .env.example .env
```

```dotenv
VITE_GOOGLE_MAPS_API_KEY=tu_clave_de_maps
VITE_GOOGLE_MAPS_MAP_ID=            # opcional
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_DATABASE_URL=https://<proyecto>-default-rtdb.<region>.firebasedatabase.app
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

El archivo `.env` está en `.gitignore` y **no debe subirse** al repositorio.

---

## 6. Ejecutar en local

> **Importante:** no abras `dist/index.html` con Live Server. Este proyecto usa **Vite** con
> variables de entorno que se inyectan en tiempo de ejecución/compilación. Ábrelo siempre con los
> scripts de `npm`. (El build usa `base: './'`, así que `dist/` es portable, pero las claves del
> `.env` solo se incorporan al compilar con Vite.)

```powershell
npm install
npm run dev
```

Abre `http://127.0.0.1:5500` (dirección permitida por la restricción de la clave). `127.0.0.1` es un contexto seguro, por lo que la geolocalización
funciona sin HTTPS.

### Probar el seguimiento

1. La app inicia sesión **anónima** automáticamente (o pulsa *Iniciar sesión* para usar correo).
   Sin sesión no se puede guardar en Firebase.
2. Pulsa **▶ Iniciar seguimiento GPS** y acepta el permiso de ubicación del navegador.
3. El marcador aparece y se mueve; el mapa lo sigue. Se muestra latitud, longitud, precisión,
   velocidad, hora y contador de envíos.
4. Pulsa **■ Detener seguimiento GPS** para cancelar `watchPosition()` y marcar `trackingActive = false`.

### Simular movimiento (Chrome/Edge)

- DevTools (F12) → **⋮ → Más herramientas → Sensores → Ubicación**: elige una ciudad o define
  coordenadas y pulsa *Update*. Cada cambio genera una nueva lectura.
- O usa **Ubicación → Personalizada** para introducir coordenadas manualmente.

### Verificar en Firebase Realtime Database

- **Firebase Console → Realtime Database → Datos**: verás
  `/ubicaciones/<uid>` con `latitude`, `longitude`, `accuracy`, `timestamp`, `trackingActive`,
  `deviceId`, `userId`, `updatedAt` (campo de servidor).
- Cada movimiento **actualiza el mismo registro** (no crea uno nuevo por lectura).
- Al detener el seguimiento, `trackingActive` pasa a `false`. Si se pierde la conexión, la limpieza
  `onDisconnect` lo marca como `false` automáticamente.

---

## 7. Compilar y publicar

```powershell
npm run build      # genera dist/
npm run preview    # sirve el build localmente
```

Publicar en Firebase Hosting:

```powershell
npm install -g firebase-tools
firebase login
firebase use BASEDATOS      # o tu projectId real
npm run build
firebase deploy             # Hosting + reglas de Realtime Database
```

Añade la URL de Hosting (`https://<proyecto>.web.app`) a las restricciones de la clave de Maps.

---

## 8. Notas de seguridad y privacidad

- Reglas: nadie sin autenticar puede leer o escribir. Cada usuario solo accede a su propio nodo.
- `trackingActive` se marca `false` al detener y también vía `onDisconnect` si se corta la conexión.
- La clave de Maps va restringida por sitio web y por API en Google Cloud.
- El seguimiento continuo depende de que el navegador/dispositivo permanezcan activos; **no
  funciona con la página cerrada** y no promete segundo plano persistente.
- `npm audit` reporta avisos en `@firebase/firestore` y `@grpc/grpc-js`, dependencias transitivas
  del paquete `firebase` que **no se usan** en este proyecto (usamos Realtime Database). No afectan
  a la aplicación; `npm audit fix --force` degradaría Firebase, por lo que no se aplica.

---

## 9. Publicación en GitHub Pages

URL: https://lenincaizavfc-ux.github.io/REPASO-EN-CLASES/SEMANA%207/

El workflow `.github/workflows/pages.yml` compila esta carpeta con Vite en cada push a `main`.
Las variables se leen del secreto de GitHub **`SEMANA7_ENV`** (Settings → Secrets and variables →
Actions), que contiene el texto completo del archivo `.env`. El `.env` nunca se sube al repositorio.

Las claves de API deben permitir el sitio `https://lenincaizavfc-ux.github.io/*` en sus
restricciones de sitios web (Google Cloud → Credenciales).
