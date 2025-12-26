export const getEnv = (key: string): string => {
    if (typeof window !== 'undefined' && (window as any).ENV) {
        return (window as any).ENV[key] || '';
    }
    return '';
};

export const PUBLIC_CLERK_PUBLISHABLE_KEY = getEnv('PUBLIC_CLERK_PUBLISHABLE_KEY');
export const PUBLIC_API_URL = getEnv('PUBLIC_API_URL');
export const PUBLIC_SUPABASE_URL = getEnv('PUBLIC_SUPABASE_URL');
export const PUBLIC_SUPABASE_ANON_KEY = getEnv('PUBLIC_SUPABASE_ANON_KEY');
