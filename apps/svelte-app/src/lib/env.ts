import { env } from '$env/dynamic/public';

export const PUBLIC_CLERK_PUBLISHABLE_KEY = env.PUBLIC_CLERK_PUBLISHABLE_KEY || '';
export const PUBLIC_API_URL = env.PUBLIC_API_URL || '';
export const PUBLIC_SUPABASE_URL = env.PUBLIC_SUPABASE_URL || '';
export const PUBLIC_SUPABASE_ANON_KEY = env.PUBLIC_SUPABASE_ANON_KEY || '';
