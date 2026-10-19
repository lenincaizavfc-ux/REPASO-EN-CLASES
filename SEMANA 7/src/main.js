import './style.css';
import {
  isFirebaseConfigured,
  isMapsConfigured,
  missingFirebaseKeys,
  googleMapsMapId,
} from './config.js';
import {
  watchAuthState,
  signInGuest,
  signInWithEmail,
  registerWithEmail,
  signOutUser,
  watchConnection,
  writeLocation,
  patchLocation,
  registerDisconnectCleanup,
} from './firebase.js';
import { loadGoogleMaps, MapController, onMapsAuthFailure } from './maps.js';
import { GeoTracker } from './tracker.js';

const $ = (id) => document.getElementById(id);

const el = {
  map: $('map'),
  mapOverlay: $('mapOverlay'),
  mapOverlayText: $('mapOverlayText'),
  gpsState: $('gpsState'),
  fbState: $('fbState'),
  sessionState: $('sessionState'),
  authStatus: $('authStatus'),
  authStatusText: $('authStatusText'),
  btnLogin: $('btnLogin'),
  btnLogout: $('btnLogout'),
  btnStart: $('btnStart'),
  btnStop: $('btnStop'),
  valLat: $('valLat'),
  valLng: $('valLng'),
  valAccuracy: $('valAccuracy'),
  valSpeed: $('valSpeed'),
  valTime: $('valTime'),
  valCount: $('valCount'),
  log: $('log'),
  authDialog: $('authDialog'),
  authForm: $('authForm'),
  authEmail: $('authEmail'),
  authPassword: $('authPassword'),
  authError: $('authError'),
  btnSignIn: $('btnSignIn'),
  btnSignUp: $('btnSignUp'),
  btnAnon: $('btnAnon'),
};

const state = {
  user: null,
  mapController: null,
  mapsReady: false,
  firebaseConnected: false,
  count: 0,
  pendingWrite: Promise.resolve(),
  deviceId: getDeviceId(),
};

const tracker = new GeoTracker({
  onPosition: handlePosition,
  onError: handleGeoError,
  onStatus: setGpsState,
});

const timeFormatter = new Intl.DateTimeFormat('es', {
  dateStyle: 'medium',
  timeStyle: 'medium',
  timeZone: import.meta.env.VITE_APP_TIMEZONE || undefined,
});

function getDeviceId() {
  const KEY = 'gps-tracker-device-id';
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = (crypto.randomUUID?.() || `dev-${Date.now()}`).slice(0, 36);
    localStorage.setItem(KEY, id);
  }
  return id;
}

function log(message, level = 'info') {
  const li = document.createElement('li');
  li.dataset.level = level;
  const time = document.createElement('time');
  const now = new Date();
  time.textContent = now.toLocaleTimeString('es', { hour12: false });
  const text = document.createElement('span');
  text.textContent = message;
  li.append(time, text);
  el.log.prepend(li);
  while (el.log.children.length > 40) el.log.lastElementChild.remove();
}

function setGpsState(status) {
  const map = {
    idle: ['idle', 'Detenido'],
    connecting: ['connecting', 'Conectando…'],
    active: ['active', 'Activo'],
    error: ['error', 'Error'],
  };
  const [dataState, label] = map[status] || map.idle;
  el.gpsState.dataset.state = dataState;
  el.gpsState.textContent = label;
}

function setFirebaseState(connected) {
  state.firebaseConnected = connected;
  el.fbState.dataset.state = connected ? 'online' : 'offline';
  el.fbState.textContent = connected ? 'Conectado' : 'Desconectado';
  updateButtons();
}

function setSessionUI(user) {
  state.user = user;
  const isGuest = user?.isAnonymous;
  if (user) {
    el.sessionState.textContent = isGuest ? 'Invitado' : user.email || 'Usuario';
    el.authStatus.dataset.state = 'online';
    el.authStatusText.textContent = isGuest ? 'Sesión de invitado' : user.email;
    el.btnLogin.classList.add('is-hidden');
    el.btnLogout.classList.remove('is-hidden');
  } else {
    el.sessionState.textContent = 'Sin sesión';
    el.authStatus.dataset.state = 'offline';
    el.authStatusText.textContent = 'Sin sesión';
    el.btnLogin.classList.remove('is-hidden');
    el.btnLogout.classList.add('is-hidden');
  }
  updateButtons();
}

function updateButtons() {
  const canTrack = Boolean(state.user) && isFirebaseConfigured;
  el.btnStart.disabled = !canTrack || tracker.isActive;
  el.btnStop.disabled = !tracker.isActive;
}

function formatNumber(value, digits = 6) {
  return Number.isFinite(value) ? value.toFixed(digits) : '—';
}

function handlePosition(pos) {
  const { latitude, longitude, accuracy, speed, timestamp } = pos;

  el.valLat.textContent = formatNumber(latitude);
  el.valLng.textContent = formatNumber(longitude);
  el.valAccuracy.textContent = Number.isFinite(accuracy) ? `± ${Math.round(accuracy)} m` : '—';
  el.valSpeed.textContent =
    Number.isFinite(speed) && speed >= 0 ? `${(speed * 3.6).toFixed(1)} km/h` : '—';
  el.valTime.textContent = timeFormatter.format(new Date(timestamp || Date.now()));

  if (state.mapController) {
    state.mapController.updatePosition({ latitude, longitude, follow: true });
    if (!state.mapsReady) {
      state.mapsReady = true;
      hideMapOverlay();
    }
  }

  persistLocation({ latitude, longitude, accuracy, timestamp });
}

async function persistLocation({ latitude, longitude, accuracy, timestamp }) {
  if (!state.user) {
    log('Ubicación recibida, pero no hay sesión iniciada. No se guardó en Firebase.', 'warn');
    return;
  }
  if (!tracker.isActive) return;

  const session = tracker.sessionId;

  try {
    state.pendingWrite = writeLocation(state.user.uid, {
      latitude,
      longitude,
      accuracy: Number.isFinite(accuracy) ? accuracy : null,
      timestamp: Number.isFinite(timestamp) ? timestamp : Date.now(),
      trackingActive: true,
      deviceId: state.deviceId,
    });
    await state.pendingWrite;
    if (session !== tracker.sessionId) return;
    state.count += 1;
    el.valCount.textContent = String(state.count);
  } catch (error) {
    console.error(error);
    log(`Error al guardar en Firebase: ${error.message}`, 'error');
  }
}

function handleGeoError(error) {
  const message = error?.message || 'Error de geolocalización.';
  log(message, 'error');
  if (error?.code === 1) {
    stopTracking({ silent: true });
  }
}

async function startTracking() {
  if (!state.user) {
    log('Inicia sesión para comenzar el seguimiento.', 'warn');
    return;
  }
  if (!isFirebaseConfigured) {
    log('Firebase no está configurado. Revisa tu archivo .env.', 'error');
    return;
  }
  if (!state.mapsReady && state.mapController) {
    showMapOverlay('Esperando la primera ubicación GPS…');
  }

  log('Solicitando permiso de geolocalización…');
  registerDisconnectCleanup(state.user.uid);

  // trackingActive = true se escribe junto con la primera lectura GPS (writeLocation),
  // porque las reglas exigen latitude/longitude/timestamp en el nodo.
  tracker.start();
  updateButtons();
  log('Seguimiento GPS iniciado.', 'ok');
}

async function stopTracking({ silent = false } = {}) {
  const wasActive = tracker.isActive;
  tracker.stop();
  updateButtons();

  if (state.user && state.count > 0) {
    try {
      await state.pendingWrite;
      await patchLocation(state.user.uid, { trackingActive: false, timestamp: Date.now() });
    } catch (error) {
      log(`No se pudo actualizar Firebase al detener: ${error.message}`, 'warn');
    }
  }

  if (!silent && wasActive) log('Seguimiento GPS detenido.', 'ok');
  if (!silent && !wasActive) log('El seguimiento ya estaba detenido.');
}

function showMapOverlay(text, isError = false) {
  el.mapOverlayText.textContent = text;
  el.mapOverlay.classList.remove('is-hidden');
  el.mapOverlay.classList.toggle('error', isError);
}

function hideMapOverlay() {
  el.mapOverlay.classList.add('is-hidden');
}

function showAuthError(message) {
  el.authError.textContent = message;
  el.authError.classList.remove('is-hidden');
}

function clearAuthError() {
  el.authError.textContent = '';
  el.authError.classList.add('is-hidden');
}

function friendlyAuthError(error) {
  const map = {
    'auth/invalid-email': 'El correo no es válido.',
    'auth/user-not-found': 'No existe una cuenta con ese correo.',
    'auth/wrong-password': 'Contraseña incorrecta.',
    'auth/invalid-credential': 'Credenciales inválidas. Verifica correo y contraseña.',
    'auth/email-already-in-use': 'Ese correo ya está registrado. Intenta iniciar sesión.',
    'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres.',
    'auth/operation-not-allowed':
      'Este método de acceso no está habilitado en Firebase Console (Authentication > Sign-in method).',
    'auth/network-request-failed': 'Sin conexión. Revisa tu red e intenta de nuevo.',
  };
  return map[error?.code] || error?.message || 'No se pudo completar la autenticación.';
}

async function withDialog(action) {
  clearAuthError();
  try {
    await action();
    el.authDialog.close();
  } catch (error) {
    console.error(error);
    showAuthError(friendlyAuthError(error));
  }
}

function wireEvents() {
  el.btnStart.addEventListener('click', startTracking);
  el.btnStop.addEventListener('click', () => stopTracking());

  el.btnLogin.addEventListener('click', () => {
    clearAuthError();
    el.authDialog.showModal();
  });

  el.btnLogout.addEventListener('click', async () => {
    try {
      await stopTracking({ silent: true });
      await signOutUser();
      log('Sesión cerrada.');
    } catch (error) {
      log(`No se pudo cerrar sesión: ${error.message}`, 'error');
    }
  });

  el.btnSignIn.addEventListener('click', () =>
    withDialog(() => signInWithEmail(el.authEmail.value.trim(), el.authPassword.value)),
  );
  el.btnSignUp.addEventListener('click', () =>
    withDialog(() => registerWithEmail(el.authEmail.value.trim(), el.authPassword.value)),
  );
  el.btnAnon.addEventListener('click', () => withDialog(() => signInGuest()));
}

function initRuntimeWarnings() {
  if (!isFirebaseConfigured) {
    log(
      `Firebase no configurado. Faltan: ${missingFirebaseKeys.join(', ') || 'VITE_FIREBASE_*'}. Copia .env.example a .env.`,
      'warn',
    );
  }
  if (!isMapsConfigured) {
    log('Google Maps no configurado. Añade VITE_GOOGLE_MAPS_API_KEY en tu .env.', 'warn');
    showMapOverlay('Google Maps sin configurar: define VITE_GOOGLE_MAPS_API_KEY.', true);
  }
}

async function initMaps() {
  if (!isMapsConfigured) return;

  onMapsAuthFailure((message) => {
    console.error(message);
    showMapOverlay(message, true);
    log(message, 'error');
  });

  try {
    const maps = await loadGoogleMaps();
    state.mapController = new MapController(maps);
    state.mapController.mount(el.map);
    showMapOverlay('Mapa listo. Inicia el seguimiento para ver tu posición.');
    log('Google Maps cargado correctamente.', 'ok');
  } catch (error) {
    console.error(error);
    showMapOverlay(error.message, true);
    log(error.message, 'error');
  }
}

function initFirebase() {
  if (!isFirebaseConfigured) {
    setSessionUI(null);
    setFirebaseState(false);
    return;
  }

  let guestAttempted = false;

  watchAuthState(async (user) => {
    setSessionUI(user);
    if (user) {
      log(user.isAnonymous ? 'Sesión anónima iniciada.' : `Sesión iniciada: ${user.email}`, 'ok');
    } else {
      if (tracker.isActive) await stopTracking({ silent: true });
      log('Sin sesión. Inicia sesión para guardar tu ubicación.');
      if (!guestAttempted) {
        guestAttempted = true;
        try {
          await signInGuest();
        } catch (error) {
          log(`No se pudo iniciar sesión de invitado: ${friendlyAuthError(error)}`, 'warn');
        }
      }
    }
  });

  watchConnection((connected) => {
    const wasConnected = state.firebaseConnected;
    setFirebaseState(connected);
    if (connected && !wasConnected) log('Conectado a Firebase Realtime Database.', 'ok');
    if (!connected && wasConnected) log('Conexión con Firebase interrumpida. Reintentando…', 'warn');
  });

  if (window) {
    window.addEventListener('online', () => log('Conexión de red restaurada.', 'ok'));
    window.addEventListener('offline', () => log('Sin conexión de red.', 'warn'));
  }
}

function boot() {
  initRuntimeWarnings();
  wireEvents();
  initFirebase();
  initMaps();
  if (!('geolocation' in navigator)) {
    log('Este navegador no soporta geolocalización.', 'error');
  }
  if (!window.isSecureContext) {
    log('La geolocalización requiere HTTPS o localhost (contexto seguro).', 'warn');
  }
  if (googleMapsMapId) log('Usando Map ID para marcadores vectoriales.');
}

boot();
