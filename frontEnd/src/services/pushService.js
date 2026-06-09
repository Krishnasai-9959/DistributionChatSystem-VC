// Helpers to register service worker and subscribe for Push (scaffolding)
const SW_PATH = '/sw.js';

async function registerServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    console.warn('Service workers are not supported in this browser');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register(SW_PATH);
    console.log('Service Worker registered:', registration.scope);
    return registration;
  } catch (err) {
    console.error('Service Worker registration failed:', err);
    return null;
  }
}

async function subscribeForPush(registration, options = { userVisibleOnly: true, applicationServerKey: null }) {
  if (!registration || !registration.pushManager) {
    throw new Error('Invalid service worker registration or pushManager unavailable');
  }

  try {
    const subscription = await registration.pushManager.subscribe(options);
    console.log('Push subscription obtained:', subscription);
    // TODO: POST `subscription` to your backend to save and use for push messages
    return subscription;
  } catch (err) {
    console.error('Push subscription failed:', err);
    throw err;
  }
}

export { registerServiceWorker, subscribeForPush };
