/**
 * Merkle DAG: supabase.client
 * Supabase client configuration for authentication
 */

import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    // In build time, return a mock client to avoid errors
    // The actual client will be created at runtime
    if (typeof window === 'undefined') {
      // Server-side: return a mock client
      return {
        auth: {
          signInWithPassword: async () => ({ error: { message: 'Supabase not configured' } }),
          signUp: async () => ({ error: { message: 'Supabase not configured' } }),
        },
      } as any;
    }
    throw new Error(
      'Missing Supabase environment variables. ' +
      'Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY'
    );
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

