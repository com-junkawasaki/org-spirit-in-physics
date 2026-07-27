import { browser } from '$app/environment';

// Helper to get env from window.ENV (injected at runtime in static builds)
const getEnv = (key: string, defaultValue: string = ''): string => {
    const runtimeEnv = browser ? (window as any).ENV : undefined;
    if (runtimeEnv?.[key] && runtimeEnv[key] !== `__${key}__` && runtimeEnv[key] !== "") {
        return runtimeEnv[key];
    }
    if (key === 'PUBLIC_API_URL') {
        // For Capacitor iOS Simulator, use localhost
        if (browser && (window as any).Capacitor !== undefined) {
            return "http://localhost:8080";
        }
        return "/api";
    }
    if (key === 'PUBLIC_API_MODE') {
        return "worker-partial";
    }
    return defaultValue;
};

export const runtimeConfig = {
    get PUBLIC_API_URL() { return getEnv('PUBLIC_API_URL'); },
    get PUBLIC_API_MODE() { return getEnv('PUBLIC_API_MODE'); },
    get API_ENABLED() { return getEnv('PUBLIC_API_MODE') !== 'disabled'; },
    get PARTIAL_API() { return getEnv('PUBLIC_API_MODE') !== 'full'; },
    get IS_CAPACITOR() { return browser && (window as any).Capacitor !== undefined; }
};

export const PUBLIC_API_URL = getEnv('PUBLIC_API_URL');
export const PUBLIC_API_MODE = getEnv('PUBLIC_API_MODE');
