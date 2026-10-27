// PWA service worker registration with iframe + preview host guard.
// Service workers must NEVER register inside Lovable's preview iframe — they
// cause stale content, navigation interference, and persistent cache pollution.

const isInIframe = (() => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
})();

const host = window.location.hostname;
const isPreviewHost =
  host.includes("id-preview--") ||
  host.includes("lovableproject.com") ||
  host === "localhost" ||
  host === "127.0.0.1";

if (isPreviewHost || isInIframe) {
  // Aggressively unregister any existing SWs in preview/iframe contexts
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.getRegistrations().then((regs) => {
      regs.forEach((r) => r.unregister());
    });
  }
} else {
  // Production-only registration via vite-plugin-pwa virtual module
  import("virtual:pwa-register")
    .then(({ registerSW }) => {
      registerSW({
        immediate: true,
        onRegisteredSW(_url, registration) {
          if (!registration) return;
          const checkForUpdate = () => {
            if (navigator.onLine && document.visibilityState === 'visible') {
              void registration.update().catch(() => {});
            }
          };
          window.addEventListener('focus', checkForUpdate);
          window.addEventListener('online', checkForUpdate);
          document.addEventListener('visibilitychange', checkForUpdate);
          window.setInterval(checkForUpdate, 60_000);
          checkForUpdate();
        },
      });
    })
    .catch(() => {
      // no-op: PWA module unavailable
    });
}

export {};
