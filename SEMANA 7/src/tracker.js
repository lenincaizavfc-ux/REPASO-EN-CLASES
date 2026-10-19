import { trackingOptions } from './config.js';

const GEO_ERRORS = {
  1: 'Permiso de ubicación denegado. Habilítalo en el navegador para continuar.',
  2: 'No se pudo determinar la ubicación (sin señal GPS o red). Intenta de nuevo.',
  3: 'Tiempo de espera agotado al obtener la ubicación. Verifica tu señal GPS.',
};

export class GeoTracker {
  constructor({ onPosition, onError, onStatus }) {
    this.onPosition = onPosition;
    this.onError = onError;
    this.onStatus = onStatus;
    this.watchId = null;
    this.sessionId = 0;
  }

  get isActive() {
    return this.watchId !== null;
  }

  isSupported() {
    return typeof navigator !== 'undefined' && 'geolocation' in navigator;
  }

  start() {
    if (this.isActive) return;
    if (!this.isSupported()) {
      this.onError?.({ code: -1, message: 'Este navegador no soporta geolocalización.' });
      return;
    }

    this.onStatus?.('connecting');
    this.sessionId += 1;
    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        this.onStatus?.('active');
        this.onPosition?.({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          altitude: position.coords.altitude,
          altitudeAccuracy: position.coords.altitudeAccuracy,
          heading: position.coords.heading,
          speed: position.coords.speed,
          timestamp: position.timestamp,
        });
      },
      (error) => {
        const message = GEO_ERRORS[error.code] || error.message || 'Error desconocido de geolocalización.';
        this.onStatus?.('error');
        this.onError?.({ code: error.code, message });
      },
      trackingOptions,
    );
  }

  stop() {
    if (!this.isActive) return;
    navigator.geolocation.clearWatch(this.watchId);
    this.watchId = null;
    this.sessionId += 1;
    this.onStatus?.('idle');
  }
}
