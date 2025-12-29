import { env } from '$env/dynamic/public';
import { browser } from '$app/environment';

// Helper to get env from window.ENV (injected at runtime in static builds)
const getEnv = (key: string, defaultValue: string = ''): string => {
    if (browser && (window as any).ENV?.[key] && (window as any).ENV[key] !== `__${key}__`) {
        return (window as any).ENV[key];
    }
    return (env as any)[key] || defaultValue;
};

export const PUBLIC_CLERK_PUBLISHABLE_KEY = getEnv('PUBLIC_CLERK_PUBLISHABLE_KEY');
export const PUBLIC_API_URL = getEnv('PUBLIC_API_URL');
export const PUBLIC_SUPABASE_URL = getEnv('PUBLIC_SUPABASE_URL');
export const PUBLIC_SUPABASE_ANON_KEY = getEnv('PUBLIC_SUPABASE_ANON_KEY');
