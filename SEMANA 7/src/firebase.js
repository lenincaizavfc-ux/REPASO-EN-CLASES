import { initializeApp } from 'firebase/app';
import {
  getAuth,
  onAuthStateChanged,
  signInAnonymously,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import {
  getDatabase,
  ref,
  set,
  update,
  onValue,
  onDisconnect,
  serverTimestamp,
} from 'firebase/database';
import { firebaseConfig, isFirebaseConfigured } from './config.js';

export const LOCATIONS_PATH = 'ubicaciones';

let app = null;
let auth = null;
let db = null;

if (isFirebaseConfigured) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getDatabase(app);
}

export { auth, db };

export function watchAuthState(callback) {
  if (!auth) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
}

export async function signInGuest() {
  assertAuth();
  return signInAnonymously(auth);
}

export async function signInWithEmail(email, password) {
  assertAuth();
  return signInWithEmailAndPassword(auth, email, password);
}

export async function registerWithEmail(email, password) {
  assertAuth();
  return createUserWithEmailAndPassword(auth, email, password);
}

export async function signOutUser() {
  assertAuth();
  return signOut(auth);
}

export function locationRef(userId) {
  assertDb();
  return ref(db, `${LOCATIONS_PATH}/${userId}`);
}

export function connectionRef() {
  assertDb();
  return ref(db, '.info/connected');
}

export function watchConnection(callback) {
  if (!db) {
    callback(false);
    return () => {};
  }
  return onValue(connectionRef(), (snapshot) => {
    callback(snapshot.val() === true);
  });
}

const UNSAFE_SERVER_FIELDS = new Set(['.info', '.serverTimeOffset']);

function sanitizePayload(payload) {
  const clean = {};
  for (const [key, value] of Object.entries(payload)) {
    if (UNSAFE_SERVER_FIELDS.has(key)) continue;
    clean[key] = value;
  }
  return clean;
}

export async function writeLocation(userId, data) {
  const payload = sanitizePayload({
    ...data,
    userId,
    updatedAt: serverTimestamp(),
  });
  await set(locationRef(userId), payload);
}

export async function patchLocation(userId, data) {
  const payload = sanitizePayload(data);
  await update(locationRef(userId), payload);
}

export function registerDisconnectCleanup(userId) {
  if (!db) return;
  const userRef = locationRef(userId);
  onDisconnect(userRef).update({
    trackingActive: false,
    updatedAt: serverTimestamp(),
  });
}

function assertAuth() {
  if (!auth) {
    throw new Error(
      'Firebase Auth no está configurado. Revisa las variables VITE_FIREBASE_* en tu archivo .env.',
    );
  }
}

function assertDb() {
  if (!db) {
    throw new Error(
      'Firebase Realtime Database no está configurada. Revisa VITE_FIREBASE_DATABASE_URL en tu archivo .env.',
    );
  }
}
