import { env } from '$env/dynamic/public';
import { browser } from '$app/environment';

// Helper to get env from window.ENV (injected at runtime in static builds)
const getEnv = (key: string, defaultValue: string = ''): string => {
    if (browser && (window as any).ENV?.[key] && (window as any).ENV[key] !== `__${key}__`) {
        return (window as any).ENV[key];
    }
    return (env as any)[key] || defaultValue;
};

// Create a reactive state for environment variables
// This ensures that if the variables are set after the initial load (e.g. via late-injected scripts),
// components using them will update.
export const runtimeConfig = $state({
    PUBLIC_CLERK_PUBLISHABLE_KEY: getEnv('PUBLIC_CLERK_PUBLISHABLE_KEY'),
    PUBLIC_API_URL: getEnv('PUBLIC_API_URL'),
    IS_CAPACITOR: browser && (window as any).Capacitor !== undefined
});

// For backward compatibility and ease of use, export individual getters or simple values if they don't change
export const PUBLIC_CLERK_PUBLISHABLE_KEY = getEnv('PUBLIC_CLERK_PUBLISHABLE_KEY');
export const PUBLIC_API_URL = getEnv('PUBLIC_API_URL');
