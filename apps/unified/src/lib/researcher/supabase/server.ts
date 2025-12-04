/**
 * Merkle DAG: supabase.server
 * Supabase server-side client configuration for Astro
 */

import { createServerClient } from '@supabase/ssr';
import type { AstroCookies } from 'astro';

export async function createClient(cookies?: AstroCookies) {
  const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || import.meta.env.SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY || import.meta.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing Supabase environment variables. ' +
      'Please set PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_ANON_KEY'
    );
  }

  return createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          // Convert Astro cookies to array format expected by Supabase
          if (!cookies) return [];
          const cookieArray: { name: string; value: string }[] = [];
          // AstroCookies is iterable, but TypeScript doesn't recognize it
          const cookieEntries = Array.from(cookies as any) as Array<[string, { value: string }]>;
          for (const cookie of cookieEntries) {
            cookieArray.push({ name: cookie[0], value: cookie[1]?.value ?? '' });
          }
          return cookieArray;
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              if (cookies) {
                cookies.set(name, value, options as any);
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

