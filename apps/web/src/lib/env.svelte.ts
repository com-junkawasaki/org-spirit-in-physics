import { env } from '$env/dynamic/public';
import { browser } from '$app/environment';

// Helper to get env from window.ENV (injected at runtime in static builds)
const getEnv = (key: string, defaultValue: string = ''): string => {
    if (browser && (window as any).ENV?.[key] && (window as any).ENV[key] !== `__${key}__` && (window as any).ENV[key] !== "") {
        return (window as any).ENV[key];
    }
    // Fallback for Capacitor/local dev if dynamic env isn't available
    if (key === 'PUBLIC_CLERK_PUBLISHABLE_KEY' && ((env as any)[key] === undefined || (env as any)[key] === "")) {
        // Use production Clerk key for Capacitor (hostname: spirit-in-physics.com)
        return "pk_live_Y2xlcmsuc3Bpcml0LWluLXBoeXNpY3MuY29tJA";
    }
    if (key === 'PUBLIC_API_URL' && ((env as any)[key] === undefined || (env as any)[key] === "")) {
        // For Capacitor iOS Simulator, use localhost
        if (browser && (window as any).Capacitor !== undefined) {
            return "http://localhost:8080";
        }
        return "https://spirit-in-physics.com/api";
    }
    return (env as any)[key] || defaultValue;
};

// Create a reactive state for environment variables
// This ensures that if the variables are set after the initial load (e.g. via late-injected scripts),
// components using them will update.
export const runtimeConfig = {
    get PUBLIC_CLERK_PUBLISHABLE_KEY() { return getEnv('PUBLIC_CLERK_PUBLISHABLE_KEY'); },
    get PUBLIC_API_URL() { return getEnv('PUBLIC_API_URL'); },
    get IS_CAPACITOR() { return browser && (window as any).Capacitor !== undefined; }
};

// For backward compatibility and ease of use, export individual getters or simple values if they don't change
export const PUBLIC_CLERK_PUBLISHABLE_KEY = getEnv('PUBLIC_CLERK_PUBLISHABLE_KEY');
export const PUBLIC_API_URL = getEnv('PUBLIC_API_URL');
