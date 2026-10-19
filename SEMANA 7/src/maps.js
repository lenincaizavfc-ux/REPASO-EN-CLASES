import { googleMapsApiKey, googleMapsMapId } from './config.js';

let loaderPromise = null;

export const AUTH_FAILURE_MESSAGE =
  'Google Maps rechazó la clave. Causas típicas: clave inválida, restringida a otro sitio web, Maps JavaScript API no habilitada o falta de facturación. Revisa Google Cloud.';

let authFailureHandler = null;

export function onMapsAuthFailure(handler) {
  authFailureHandler = handler;
}

if (typeof window !== 'undefined') {
  window.gm_authFailure = () => {
    authFailureHandler?.(AUTH_FAILURE_MESSAGE);
  };
}

export function loadGoogleMaps() {
  if (loaderPromise) return loaderPromise;

  loaderPromise = new Promise((resolve, reject) => {
    if (!googleMapsApiKey) {
      reject(new Error('Falta VITE_GOOGLE_MAPS_API_KEY en tu archivo .env.'));
      return;
    }
    if (window.google?.maps) {
      resolve(window.google.maps);
      return;
    }

    const params = new URLSearchParams({
      key: googleMapsApiKey,
      v: 'weekly',
      loading: 'async',
      callback: '__initGoogleMaps',
    });
    if (googleMapsMapId) {
      params.set('map_ids', googleMapsMapId);
      params.set('libraries', 'marker');
    }

    window.__initGoogleMaps = () => {
      delete window.__initGoogleMaps;
      resolve(window.google.maps);
    };

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
    script.async = true;
    script.defer = true;
    script.onerror = () => {
      delete window.__initGoogleMaps;
      reject(
        new Error(
          'No se pudo descargar Google Maps JavaScript API. Revisa tu conexión, la clave y las restricciones por sitio web.',
        ),
      );
    };
    document.head.appendChild(script);
  });

  return loaderPromise;
}

export class MapController {
  constructor(maps) {
    this.maps = maps;
    this.map = null;
    this.marker = null;
    this.path = null;
    this.trail = [];
  }

  mount(element) {
    this.map = new this.maps.Map(element, {
      center: { lat: 4.711, lng: -74.0721 },
      zoom: 15,
      mapId: googleMapsMapId || undefined,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
      clickableIcons: false,
      gestureHandling: 'greedy',
    });
    this.path = new this.maps.Polyline({
      map: this.map,
      strokeColor: '#22d3ee',
      strokeOpacity: 0.85,
      strokeWeight: 4,
      path: this.trail,
    });
    return this.map;
  }

  ensureMarker(position) {
    if (this.marker) return this.marker;
    if (this.maps.marker?.AdvancedMarkerElement) {
      this.marker = new this.maps.marker.AdvancedMarkerElement({
        map: this.map,
        position,
        title: 'Tu ubicación',
      });
    } else {
      this.marker = new this.maps.Marker({
        map: this.map,
        position,
        title: 'Tu ubicación',
        animation: this.maps.Animation.DROP,
      });
    }
    return this.marker;
  }

  updatePosition({ latitude, longitude, follow = true }) {
    if (!this.map) return;
    const position = { lat: latitude, lng: longitude };

    if (this.marker) {
      this.marker.position = position;
    } else {
      this.ensureMarker(position);
    }

    this.trail.push(position);
    if (this.trail.length > 2000) this.trail.shift();
    if (this.path) this.path.setPath(this.trail);

    if (follow) {
      this.map.panTo(position);
      if (this.map.getZoom() < 16) this.map.setZoom(16);
    }
  }

  clearTrail() {
    this.trail = [];
    if (this.path) this.path.setPath(this.trail);
  }

  centerOn(position, zoom = 16) {
    if (!this.map) return;
    this.map.panTo(position);
    this.map.setZoom(zoom);
  }
}
