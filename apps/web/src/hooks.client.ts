import { i18n } from "$lib/i18n";
import { browser } from "$app/environment";

if (browser) {
  console.log('[DEBUG] hooks.client.ts: Client-side hooks loaded');
  
  // Global error handler
  window.addEventListener('error', (event) => {
    console.error('[DEBUG] Global error:', {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      error: event.error
    });
  });
  
  // Unhandled promise rejection handler
  window.addEventListener('unhandledrejection', (event) => {
    console.error('[DEBUG] Unhandled promise rejection:', event.reason);
  });
}

export const reroute = (event: { url: URL }) => {
    if (browser) {
      console.log('[DEBUG] Reroute:', event.url.pathname);
    }
    return i18n.reroute()(event);
};
