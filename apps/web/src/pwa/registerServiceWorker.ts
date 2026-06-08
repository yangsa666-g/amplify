const SERVICE_WORKER_URL = '/service-worker.js';

export function registerServiceWorker() {
  if (import.meta.env.DEV || !('serviceWorker' in navigator)) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(SERVICE_WORKER_URL)
      .then((registration) => {
        void registration.update();
      })
      .catch((error) => {
        console.warn('Service worker registration failed', error);
      });
  });
}
