import { env } from '$env/dynamic/public';
import { browser } from '$app/environment';

// Helper to get env from window.ENV (injected at runtime in static builds)
const getEnv = (key: string, defaultValue: string = ''): string => {
    if (browser && (window as any).ENV?.[key] && (window as any).ENV[key] !== `__${key}__` && (window as any).ENV[key] !== "") {
        return (window as any).ENV[key];
    }
    // Fallback for Capacitor/local dev if dynamic env isn't available
    if (key === 'PUBLIC_CLERK_PUBLISHABLE_KEY' && ((env as any)[key] === undefined || (env as any)[key] === "")) {
        return "pk_test_cmVsYXhlZC13aWxkY2F0LTk3LmNsZXJrLmFjY291bnRzLmRldiQ";
    }
    if (key === 'PUBLIC_API_URL' && ((env as any)[key] === undefined || (env as any)[key] === "")) {
        // For Capacitor iOS Simulator, use localhost
        if (browser && (window as any).Capacitor !== undefined) {
            return "http://localhost:8080";
        }
        return "/api";
    }
    if (key === 'PUBLIC_API_MODE' && ((env as any)[key] === undefined || (env as any)[key] === "")) {
        return "worker-partial";
    }
    return (env as any)[key] || defaultValue;
};

// Create a reactive state for environment variables
// This ensures that if the variables are set after the initial load (e.g. via late-injected scripts),
// components using them will update.
export const runtimeConfig = {
    get PUBLIC_CLERK_PUBLISHABLE_KEY() { return getEnv('PUBLIC_CLERK_PUBLISHABLE_KEY'); },
    get PUBLIC_API_URL() { return getEnv('PUBLIC_API_URL'); },
    get PUBLIC_API_MODE() { return getEnv('PUBLIC_API_MODE'); },
    get API_ENABLED() { return getEnv('PUBLIC_API_MODE') !== 'disabled'; },
    get PARTIAL_API() { return getEnv('PUBLIC_API_MODE') !== 'full'; },
    get IS_CAPACITOR() { return browser && (window as any).Capacitor !== undefined; }
};

// For backward compatibility and ease of use, export individual getters or simple values if they don't change
export const PUBLIC_CLERK_PUBLISHABLE_KEY = getEnv('PUBLIC_CLERK_PUBLISHABLE_KEY');
export const PUBLIC_API_URL = getEnv('PUBLIC_API_URL');
export const PUBLIC_API_MODE = getEnv('PUBLIC_API_MODE');
