/**
 * Merkle DAG: supabase.server
 * Supabase server-side client configuration for Astro
 */

import { createServerClient } from '@supabase/ssr';
import type { AstroCookies } from 'astro';

export async function createClient(cookies?: AstroCookies) {
  // For Astro API routes, cookies are passed from the context
  const cookieStore = cookies || {
    getAll: () => [],
    set: () => {},
  };

  return createServerClient(
    import.meta.env.PUBLIC_SUPABASE_URL || import.meta.env.SUPABASE_URL!,
    import.meta.env.PUBLIC_SUPABASE_ANON_KEY || import.meta.env.SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              if (cookies) {
                cookies.set(name, value, options);
              }
            });
          } catch {
            // Ignore errors in server context
          }
        },
      },
    }
  );
}

