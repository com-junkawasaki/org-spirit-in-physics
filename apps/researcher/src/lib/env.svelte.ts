import { env } from '$env/dynamic/public';
import { browser } from '$app/environment';

const getEnv = (key: string, defaultValue: string = ''): string => {
    if (browser && (window as any).ENV?.[key] && (window as any).ENV[key] !== `__${key}__` && (window as any).ENV[key] !== "") {
        return (window as any).ENV[key];
    }
    if (key === 'PUBLIC_API_URL' && ((env as any)[key] === undefined || (env as any)[key] === "")) {
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

export const runtimeConfig = {
    get PUBLIC_API_URL() { return getEnv('PUBLIC_API_URL'); },
    get PUBLIC_API_MODE() { return getEnv('PUBLIC_API_MODE'); },
    get API_ENABLED() { return getEnv('PUBLIC_API_MODE') !== 'disabled'; },
    get PARTIAL_API() { return getEnv('PUBLIC_API_MODE') !== 'full'; },
    get IS_CAPACITOR() { return browser && (window as any).Capacitor !== undefined; }
};

export const PUBLIC_API_URL = getEnv('PUBLIC_API_URL');
export const PUBLIC_API_MODE = getEnv('PUBLIC_API_MODE');
