const env = import.meta.env;

function clean(value) {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (!trimmed || trimmed === 'undefined' || trimmed === 'null') return '';
  return trimmed;
}

export const googleMapsApiKey = clean(env.VITE_GOOGLE_MAPS_API_KEY);
export const googleMapsMapId = clean(env.VITE_GOOGLE_MAPS_MAP_ID);

export const firebaseConfig = {
  apiKey: clean(env.VITE_FIREBASE_API_KEY),
  authDomain: clean(env.VITE_FIREBASE_AUTH_DOMAIN),
  databaseURL: clean(env.VITE_FIREBASE_DATABASE_URL),
  projectId: clean(env.VITE_FIREBASE_PROJECT_ID),
  storageBucket: clean(env.VITE_FIREBASE_STORAGE_BUCKET),
  messagingSenderId: clean(env.VITE_FIREBASE_MESSAGING_SENDER_ID),
  appId: clean(env.VITE_FIREBASE_APP_ID),
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.databaseURL &&
    firebaseConfig.projectId &&
    firebaseConfig.appId,
);

export const isMapsConfigured = Boolean(googleMapsApiKey);

export const trackingOptions = {
  enableHighAccuracy: true,
  timeout: 15000,
  maximumAge: 0,
};

export const missingFirebaseKeys = Object.entries(firebaseConfig)
  .filter(([, value]) => !value)
  .map(([key]) => key);
